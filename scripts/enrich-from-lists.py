#!/usr/bin/env python3
"""
Parse all 46th/47th parliament bills list pages to extract real metadata:
- introducedAt date
- status (Passed/Not Passed/Before Parliament)  
- outcomeDate (assent date)
- chamber
- title (cleaned)

Then bulk-update the DB.
"""
import re, time, urllib.request, psycopg2
from datetime import datetime, date

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
BASE = "https://www.aph.gov.au"
UA = "Mozilla/5.0 Crossbench/1.0"

# All blsIds for 46th and 47th parliament - house and senate
ALL_LISTS = [
    # 46th parliament House
    (46, "HOUSE", "legislation%2fbillslst%2fbillslst_307b91cd-7cf6-40ed-8c1d-85818d8106bd"),
    (46, "HOUSE", "legislation%2fbillslst%2fbillslst_24a385b0-0528-4610-a886-3814ee40b898"),
    (46, "HOUSE", "legislation%2fbillslst%2fbillslst_29a8e5c1-61b5-405e-8e65-b8d94cd6a5f2"),
    (46, "HOUSE", "legislation%2fbillslst%2fbillslst_9ca26c22-3920-43aa-a9ae-a065fd821ace"),
    # 46th parliament Senate
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_49c83de5-310b-4369-bd89-ccb6d8f5a0b2"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_fb90c423-1cb1-4230-80fd-92f796892c2c"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_4d82e73f-cbab-49a4-a5c2-22e9006aa6a0"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_4e626be0-6a67-4f9d-9d97-338cc51eadac"),
    # 47th parliament House
    (47, "HOUSE", "legislation%2fbillslst%2fbillslst_ae962b93-b256-47db-b8e6-6548ae73ded9"),
    (47, "HOUSE", "legislation%2fbillslst%2fbillslst_cf64c65b-41d5-4a6f-a9e1-0919d481f606"),
    (47, "HOUSE", "legislation%2fbillslst%2fbillslst_4b3ab651-a676-42ad-aee0-8e602cafe596"),
    (47, "HOUSE", "legislation%2fbillslst%2fbillslst_3b306f3f-3e3b-4810-9bba-0b16a2a5a12c"),
    (47, "HOUSE", "legislation%2fbillslst%2fbillslst_c203aa1c-1876-41a8-bc76-1de328bdb726"),  # main 47th list
    # 47th parliament Senate
    (47, "SENATE", "legislation%2fbillslst%2fbillslst_4f8efdae-7e88-4301-a746-1bc52f0debb8"),
    (47, "SENATE", "legislation%2fbillslst%2fbillslst_5816d458-839d-4718-9453-de110355e36b"),
    (47, "SENATE", "legislation%2fbillslst%2fbillslst_2dfd2d83-044b-4562-a72b-786d86712240"),
    (47, "SENATE", "legislation%2fbillslst%2fbillslst_b9e21b16-2e85-4056-beeb-29acff17d478"),
]

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt == 2:
                print(f"    Fetch failed after 3 attempts: {e}")
                return None
            time.sleep(3)

def parse_date(s):
    """Parse d/m/yy or dd/mm/yyyy date strings."""
    if not s:
        return None
    s = s.strip()
    for fmt in ["%d/%m/%Y", "%d/%m/%y"]:
        try:
            return datetime.strptime(s, fmt).date()
        except:
            pass
    return None

def parse_list_page(html, default_chamber):
    """
    Parse a bills list detail page and return list of bill dicts.
    Each dict has: bid, title, chamber, introduced_at, status, outcome_date
    """
    bills = []
    seen_bids = set()
    
    # Split into per-bill sections by h2
    sections = re.split(r'(?=<h2[^>]*>)', html)
    
    for section in sections:
        # Extract bill ID from parlinfo link (both formats)
        bid_match = (
            re.search(r'billhome%2[Ff]([a-zA-Z0-9]+)%22', section) or
            re.search(r'bId=([a-zA-Z0-9]+)', section)
        )
        if not bid_match:
            continue
        
        bid = bid_match.group(1)
        if bid in seen_bids:
            continue
        seen_bids.add(bid)
        
        # Extract title from span inside the h2 anchor
        title_match = re.search(
            r'<h2[^>]*>.*?<span[^>]*>(.*?)</span>.*?</h2>',
            section, re.DOTALL
        )
        if not title_match:
            continue
        title = re.sub(r'<[^>]+>', '', title_match.group(1))
        title = re.sub(r'\s+', ' ', title).strip()
        if not title or len(title) < 5:
            continue
        
        # Chamber from bid prefix or section context
        if bid.startswith("s"):
            chamber = "SENATE"
        elif bid.startswith("r"):
            chamber = "HOUSE"
        else:
            chamber = default_chamber
        
        # Introduction date - "Introduced d/m/yyyy"
        intro_match = re.search(r'Introduced\s+(\d{1,2}/\d{1,2}/\d{2,4})', section)
        introduced_at = parse_date(intro_match.group(1)) if intro_match else None
        
        # Assent date - "Assent: d/m/yyyy" or "Assented d/m/yyyy"  
        # The format is: Assent:</strong> 19/9/23 (Act No. 70, 2023)
        assent_match = re.search(
            r'Assent[^:]*:</?\w*>?\s*(\d{1,2}/\d{1,2}/\d{2,4})',
            section, re.IGNORECASE
        )
        if not assent_match:
            # Try alternative: "Assent:</p>..." followed by date
            assent_match = re.search(
                r'Assent.*?(\d{1,2}/\d{1,2}/\d{2,4})\s*\(Act\s+No',
                section, re.IGNORECASE | re.DOTALL
            )
        
        outcome_date = parse_date(assent_match.group(1)) if assent_match else None
        
        # Status determination
        if outcome_date or re.search(r'\(Act\s+No\.?\s+\d+', section):
            status = "Passed"
        elif re.search(r'[Nn]egatived at (?:second|2nd|third|3rd) reading', section):
            status = "Not Passed"
        elif re.search(r'[Ll]apsed immediately before commencement', section):
            # Check if restored
            if re.search(r'[Rr]estored to.*Notice Paper', section):
                status = "Before Parliament"  # Was restored - still active
            else:
                status = "Not Passed"
        elif re.search(r'[Ww]ithdrawn', section) and not re.search(r'Assent', section):
            status = "Not Passed"
        else:
            status = "Before Parliament"
        
        bills.append({
            "bid": bid,
            "title": title,
            "chamber": chamber,
            "introduced_at": introduced_at,
            "status": status,
            "outcome_date": outcome_date,
        })
    
    return bills

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Build a mapping of bid -> real data from all list pages
    all_bill_data = {}  # bid -> dict
    
    for parl_num, default_chamber, blsid in ALL_LISTS:
        url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId={blsid}"
        print(f"\n[{parl_num}] {default_chamber} {blsid[:40]}...")
        
        html = fetch(url)
        if not html:
            print("  SKIP: fetch failed")
            continue
        
        bills = parse_list_page(html, default_chamber)
        print(f"  Parsed {len(bills)} bills")
        
        for b in bills:
            bid = b["bid"]
            if bid not in all_bill_data:
                all_bill_data[bid] = {**b, "parliamentNumber": parl_num}
            else:
                # Merge: prefer richer data
                existing = all_bill_data[bid]
                if not existing.get("introduced_at") and b["introduced_at"]:
                    existing["introduced_at"] = b["introduced_at"]
                if not existing.get("outcome_date") and b["outcome_date"]:
                    existing["outcome_date"] = b["outcome_date"]
                if existing.get("status") == "Before Parliament" and b["status"] != "Before Parliament":
                    existing["status"] = b["status"]
        
        time.sleep(0.4)
    
    print(f"\n\nTotal unique bills with parsed data: {len(all_bill_data)}")
    
    # Status breakdown
    from collections import Counter
    status_counts = Counter(v["status"] for v in all_bill_data.values())
    print(f"Status breakdown: {dict(status_counts)}")
    
    # Now update the DB
    updated = 0
    not_found = 0
    errors = 0
    
    print("\nUpdating DB...")
    
    for bid, data in all_bill_data.items():
        bill_id = f"hist_{bid}"
        
        # Check if exists
        cur.execute('SELECT id FROM "Bill" WHERE id = %s', (bill_id,))
        if not cur.fetchone():
            not_found += 1
            continue
        
        try:
            cur.execute("""
                UPDATE "Bill" SET
                    status = %s,
                    chamber = %s,
                    "introducedAt" = COALESCE(%s, "introducedAt"),
                    "outcomeDate" = COALESCE(%s, "outcomeDate"),
                    "updatedAt" = NOW()
                WHERE id = %s
            """, (
                data["status"],
                data["chamber"],
                data.get("introduced_at"),
                data.get("outcome_date"),
                bill_id
            ))
            updated += 1
            
            if updated % 100 == 0:
                conn.commit()
                print(f"  ... {updated} updated")
        except Exception as e:
            print(f"  DB error for {bill_id}: {e}")
            conn.rollback()
            errors += 1
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\n=== Done ===")
    print(f"Updated: {updated}")
    print(f"Not found in DB: {not_found}")
    print(f"Errors: {errors}")

if __name__ == "__main__":
    main()
