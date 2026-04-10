#!/usr/bin/env python3
"""
Extract Senate bill IDs from APH Bills List detail pages (parlInfo-style links).
These pages use parlinfo.aph.gov.au URLs with billhome/r#### or billhome/s#### identifiers.
"""
import re, time, urllib.request, psycopg2
from datetime import datetime

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
BASE = "https://www.aph.gov.au"
UA = "Mozilla/5.0 Crossbench/1.0"

# Senate blsIds (and mixed lists) for 46th and 47th parliament
# These pages use parlInfo links: legislation/billhome/r#### or s####
SENATE_LISTS = [
    # 46th parliament (May 2019 - May 2022)
    (46, "2019", "legislation%2fbillslst%2fbillslst_49c83de5-310b-4369-bd89-ccb6d8f5a0b2"),
    (46, "2020", "legislation%2fbillslst%2fbillslst_fb90c423-1cb1-4230-80fd-92f796892c2c"),
    (46, "2021", "legislation%2fbillslst%2fbillslst_4d82e73f-cbab-49a4-a5c2-22e9006aa6a0"),
    (46, "2022", "legislation%2fbillslst%2fbillslst_4e626be0-6a67-4f9d-9d97-338cc51eadac"),
    # 47th parliament (May 2022 - May 2025)
    (47, "2022", "legislation%2fbillslst%2fbillslst_4f8efdae-7e88-4301-a746-1bc52f0debb8"),
    (47, "2023", "legislation%2fbillslst%2fbillslst_5816d458-839d-4718-9453-de110355e36b"),
    (47, "2024", "legislation%2fbillslst%2fbillslst_2dfd2d83-044b-4562-a72b-786d86712240"),
    (47, "2025", "legislation%2fbillslst%2fbillslst_b9e21b16-2e85-4056-beeb-29acff17d478"),
]

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt == 2: raise
            time.sleep(3)

def extract_bills_from_senate_list(html):
    """
    Extract bill IDs and titles from Senate-style bills list pages.
    These use parlInfo links like:
      href="...query=Id%3A%22legislation%2Fbillhome%2Fr7095%22"
    And titles in <h2> tags.
    """
    bills = []
    seen = set()
    
    # Pattern 1: parlinfo links with billhome IDs
    # Matches: href="...legislation%2Fbillhome%2Fr7095..."
    parlinfo_pattern = r'<h2[^>]*>\s*<a[^>]+query=Id%3A%22legislation%2[Fb]billhome%2[Fb]([a-zA-Z0-9]+)%22[^>]*>\s*<span[^>]*>(.*?)</span>\s*</a>\s*</h2>'
    matches = re.findall(parlinfo_pattern, html, re.DOTALL | re.IGNORECASE)
    
    for bid, raw_title in matches:
        title = re.sub(r'<[^>]+>', '', raw_title)
        title = re.sub(r'\s+', ' ', title).strip()
        # Remove trailing [No. X] or similar
        title = re.sub(r'\s*\[?No\.\s*\d+\]?\s*$', '', title).strip()
        if bid and title and bid not in seen and len(title) > 5:
            seen.add(bid)
            bills.append({"bid": bid, "title": title})
    
    # Pattern 2: direct parlinfo.aph.gov.au links
    if not bills:
        parlinfo_pattern2 = r'href="https?://parlinfo\.aph\.gov\.au/[^"]*legislation%2[Fb]billhome%2[Fb]([a-zA-Z0-9]+)%22[^"]*"[^>]*>\s*<span[^>]*>(.*?)</span>'
        matches2 = re.findall(parlinfo_pattern2, html, re.DOTALL | re.IGNORECASE)
        for bid, raw_title in matches2:
            title = re.sub(r'<[^>]+>', '', raw_title)
            title = re.sub(r'\s+', ' ', title).strip()
            if bid and title and bid not in seen and len(title) > 5:
                seen.add(bid)
                bills.append({"bid": bid, "title": title})
    
    print(f"    Pattern matched {len(bills)} unique bills")
    return bills

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    total_inserted = 0
    total_skipped = 0
    total_errors = 0
    all_seen_bids = set()
    
    for parl_num, year, blsid in SENATE_LISTS:
        url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId={blsid}"
        print(f"\n[Parliament {parl_num}] {year}: {blsid[:40]}...")
        
        try:
            html = fetch(url)
            print(f"  Page size: {len(html):,} chars")
            
            # Try bId= links first (House-style)
            bids_direct = re.findall(r'bId=([a-zA-Z0-9]+)', html)
            print(f"  Direct bId= links: {len(set(bids_direct))}")
            
            bills = extract_bills_from_senate_list(html)
            
            if not bills:
                print(f"  WARNING: No bills found in this list!")
                # Debug: show first parlinfo link found
                sample = re.findall(r'billhome[^"]{0,50}', html)[:3]
                print(f"  Sample billhome refs: {sample}")
                time.sleep(0.5)
                continue
            
            for bill in bills:
                bid = bill["bid"]
                title = bill["title"]
                
                if bid in all_seen_bids:
                    continue
                all_seen_bids.add(bid)
                
                # Chamber from prefix
                if bid.startswith("s"):
                    chamber = "SENATE"
                elif bid.startswith("r"):
                    chamber = "HOUSE"
                else:
                    chamber = "SENATE"  # default for senate lists
                
                # Introduced date - use midpoint of parliament
                if parl_num == 47:
                    intro_date = datetime(2023, 6, 1)
                else:
                    intro_date = datetime(2020, 6, 1)
                
                # Check if already exists
                cur.execute(
                    'SELECT id FROM "Bill" WHERE "aphUrl" LIKE %s OR (title = %s AND "parliamentNumber" = %s)',
                    (f"%bId={bid}%", title, parl_num)
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
                    else:
                        total_skipped += 1
                except Exception as e:
                    print(f"  DB error for {bid}: {e}")
                    conn.rollback()
                    total_errors += 1
                    continue
            
            conn.commit()
            print(f"  Inserted {total_inserted} so far (this list done)")
            time.sleep(0.5)
            
        except Exception as e:
            print(f"  Error: {e}")
            total_errors += 1
    
    cur.close()
    conn.close()
    
    print(f"\n=== Done ===")
    print(f"Inserted: {total_inserted}")
    print(f"Skipped (existing): {total_skipped}")
    print(f"Errors: {total_errors}")
    print(f"Unique bIds processed: {len(all_seen_bids)}")

if __name__ == "__main__":
    main()
