#!/usr/bin/env python3
"""
Ingest 46th and 47th parliament bills from APH Bills List detail pages.
Uses known blsIds mapped to specific parliaments.
"""
import re, time, urllib.request, psycopg2
from datetime import datetime

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
BASE = "https://www.aph.gov.au"
UA = "Mozilla/5.0 Crossbench/1.0"

# Targeted blsIds per parliament (from index page analysis)
PARL_LISTS = {
    46: [
        # 46th parliament bills (May 2019 - May 2022)
        ("House", "2019", "legislation%2fbillslst%2fbillslst_307b91cd-7cf6-40ed-8c1d-85818d8106bd"),
        ("Senate", "2019", "legislation%2fbillslst%2fbillslst_49c83de5-310b-4369-bd89-ccb6d8f5a0b2"),
        ("House", "2020", "legislation%2fbillslst%2fbillslst_24a385b0-0528-4610-a886-3814ee40b898"),
        ("Senate", "2020", "legislation%2fbillslst%2fbillslst_fb90c423-1cb1-4230-80fd-92f796892c2c"),
        ("House", "2021", "legislation%2fbillslst%2fbillslst_29a8e5c1-61b5-405e-8e65-b8d94cd6a5f2"),
        ("Senate", "2021", "legislation%2fbillslst%2fbillslst_4d82e73f-cbab-49a4-a5c2-22e9006aa6a0"),
        ("House", "2022", "legislation%2fbillslst%2fbillslst_9ca26c22-3920-43aa-a9ae-a065fd821ace"),
        ("Senate", "2022", "legislation%2fbillslst%2fbillslst_4e626be0-6a67-4f9d-9d97-338cc51eadac"),
    ],
    47: [
        # 47th parliament bills (May 2022 - May 2025)
        ("House", "2022", "legislation%2fbillslst%2fbillslst_ae962b93-b256-47db-b8e6-6548ae73ded9"),
        ("Senate", "2022", "legislation%2fbillslst%2fbillslst_4f8efdae-7e88-4301-a746-1bc52f0debb8"),
        ("House", "2023", "legislation%2fbillslst%2fbillslst_cf64c65b-41d5-4a6f-a9e1-0919d481f606"),
        ("Senate", "2023", "legislation%2fbillslst%2fbillslst_5816d458-839d-4718-9453-de110355e36b"),
        ("House", "2024", "legislation%2fbillslst%2fbillslst_4b3ab651-a676-42ad-aee0-8e602cafe596"),
        ("Senate", "2024", "legislation%2fbillslst%2fbillslst_2dfd2d83-044b-4562-a72b-786d86712240"),
        ("House", "2025", "legislation%2fbillslst%2fbillslst_3b306f3f-3e3b-4810-9bba-0b26a2a5a12c"),
        ("Senate", "2025", "legislation%2fbillslst%2fbillslst_b9e21b16-2e85-4056-beeb-29acff17d478"),
        # Also the main House Bills List (c203aa1c) which had 145 bills
        ("House", "2022-2025", "legislation%2fbillslst%2fbillslst_c203aa1c-1876-41a8-bc76-1de328bdb726"),
    ],
}

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt == 2: raise
            time.sleep(2)

def get_bills_from_list(blsid):
    """Extract all bId links and their titles from a bills list detail page."""
    url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId={blsid}"
    html = fetch(url)
    
    # Find all anchors with bId
    pattern = r'<a[^>]+href="[^"]*bId=([a-zA-Z0-9]+)[^"]*"[^>]*>(.*?)</a>'
    matches = re.findall(pattern, html, re.DOTALL)
    
    bills = []
    seen_bids = set()
    for bid, raw_title in matches:
        title = re.sub(r'<[^>]+>', '', raw_title)
        title = re.sub(r'\s+', ' ', title).strip()
        if title and bid not in seen_bids and len(title) > 5:
            seen_bids.add(bid)
            bills.append({"bid": bid, "title": title})
    
    return bills

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    total_inserted = 0
    total_skipped = 0
    total_errors = 0
    
    all_seen_bids = set()
    
    for parl_num, lists in PARL_LISTS.items():
        print(f"\n=== Parliament {parl_num} ===")
        
        # Set representative introduced date
        if parl_num == 47:
            intro_date = datetime(2023, 1, 1)
        else:
            intro_date = datetime(2020, 7, 1)
        
        for chamber_hint, year, blsid in lists:
            print(f"\n  {chamber_hint} {year}...")
            try:
                bills = get_bills_from_list(blsid)
                print(f"  Found {len(bills)} bills")
                
                for bill in bills:
                    bid = bill["bid"]
                    title = bill["title"]
                    
                    if bid in all_seen_bids:
                        continue
                    all_seen_bids.add(bid)
                    
                    # Determine chamber from bid prefix
                    if bid.startswith("s"):
                        chamber = "SENATE"
                    elif bid.startswith("r"):
                        chamber = "HOUSE"
                    else:
                        chamber = "HOUSE"
                    
                    # Check if already in DB
                    cur.execute(
                        'SELECT id FROM "Bill" WHERE "aphUrl" LIKE %s OR title = %s',
                        (f"%bId={bid}%", title)
                    )
                    if cur.fetchone():
                        total_skipped += 1
                        continue
                    
                    aph_url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId={bid}"
                    bill_id = f"hist_{bid}"
                    
                    try:
                        cur.execute("""
                            INSERT INTO "Bill" (
                                id, title, chamber, status, "aphUrl", "introducedAt",
                                "parliamentNumber", "lastUpdatedAt", "createdAt", "updatedAt"
                            ) VALUES (%s, %s, %s, 'Passed', %s, %s, %s, NOW(), NOW(), NOW())
                            ON CONFLICT (id) DO NOTHING
                        """, (bill_id, title, chamber, aph_url, intro_date, parl_num))
                        
                        if cur.rowcount > 0:
                            total_inserted += 1
                            if total_inserted % 10 == 0:
                                print(f"  ... {total_inserted} inserted so far")
                        else:
                            total_skipped += 1
                    except Exception as e:
                        print(f"  DB error for {bid}: {e}")
                        conn.rollback()
                        total_errors += 1
                        continue
                
                conn.commit()
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  Error fetching {blsid}: {e}")
                total_errors += 1
    
    cur.close()
    conn.close()
    
    print(f"\n=== Done ===")
    print(f"Inserted: {total_inserted}")
    print(f"Skipped (existing): {total_skipped}")
    print(f"Errors: {total_errors}")
    print(f"Total unique bIds processed: {len(all_seen_bids)}")

if __name__ == "__main__":
    main()
