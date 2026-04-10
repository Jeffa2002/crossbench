#!/usr/bin/env python3
"""
Fast enrichment of historical bills from Bills List pages.
Uses simple string operations instead of heavy regex on entire HTML.
"""
import re, time, urllib.request, psycopg2
from datetime import datetime

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
BASE = "https://www.aph.gov.au"
UA = "Mozilla/5.0 Crossbench/1.0"

ALL_LISTS = [
    (46, "HOUSE",  "legislation%2fbillslst%2fbillslst_307b91cd-7cf6-40ed-8c1d-85818d8106bd"),
    (46, "HOUSE",  "legislation%2fbillslst%2fbillslst_24a385b0-0528-4610-a886-3814ee40b898"),
    (46, "HOUSE",  "legislation%2fbillslst%2fbillslst_29a8e5c1-61b5-405e-8e65-b8d94cd6a5f2"),
    (46, "HOUSE",  "legislation%2fbillslst%2fbillslst_9ca26c22-3920-43aa-a9ae-a065fd821ace"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_49c83de5-310b-4369-bd89-ccb6d8f5a0b2"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_fb90c423-1cb1-4230-80fd-92f796892c2c"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_4d82e73f-cbab-49a4-a5c2-22e9006aa6a0"),
    (46, "SENATE", "legislation%2fbillslst%2fbillslst_4e626be0-6a67-4f9d-9d97-338cc51eadac"),
    (47, "HOUSE",  "legislation%2fbillslst%2fbillslst_ae962b93-b256-47db-b8e6-6548ae73ded9"),
    (47, "HOUSE",  "legislation%2fbillslst%2fbillslst_cf64c65b-41d5-4a6f-a9e1-0919d481f606"),
    (47, "HOUSE",  "legislation%2fbillslst%2fbillslst_4b3ab651-a676-42ad-aee0-8e602cafe596"),
    (47, "HOUSE",  "legislation%2fbillslst%2fbillslst_3b306f3f-3e3b-4810-9bba-0b16a2a5a12c"),
    (47, "HOUSE",  "legislation%2fbillslst%2fbillslst_c203aa1c-1876-41a8-bc76-1de328bdb726"),
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
                print(f"  Fetch failed: {e}")
                return None
            time.sleep(3)

def parse_date(s):
    if not s:
        return None
    s = s.strip()
    for fmt in ["%d/%m/%Y", "%d/%m/%y"]:
        try:
            return datetime.strptime(s, fmt).date()
        except:
            pass
    return None

def strip_tags(s):
    return re.sub(r'<[^>]+>', '', s).strip()

def parse_list_page(html, default_chamber):
    """
    Fast parser: find all h2 tag positions, slice between them.
    Each slice is one bill's section. Extract key info from that slice.
    """
    bills = {}
    
    # Find all h2 start positions
    h2_positions = [m.start() for m in re.finditer(r'<h2\b', html)]
    
    if not h2_positions:
        return bills
    
    # Process each bill section (from one h2 to the next)
    for i, pos in enumerate(h2_positions):
        end = h2_positions[i + 1] if i + 1 < len(h2_positions) else pos + 8000
        # Limit section to a reasonable size (bills are never > 8KB in these pages)
        section = html[pos:min(end, pos + 8000)]
        
        # Find bill ID - either bId= or billhome/r#### or billhome/s####
        bid = None
        # Pattern 1: bId=r7365 style (House list pages)
        m = re.search(r'bId=([rs]\d+)', section)
        if m:
            bid = m.group(1)
        # Pattern 2: billhome%2Fr7365 style (Senate list pages)
        if not bid:
            m = re.search(r'billhome%2[Ff]([rs]\d+)%22', section, re.IGNORECASE)
            if m:
                bid = m.group(1)
        
        if not bid:
            continue
        
        if bid in bills:
            # Already have richer data for this bill - only update if we can add info
            existing = bills[bid]
            # Try to get assent date if we don't have it
            if not existing.get("outcome_date"):
                m = re.search(r'Assent.*?(\d{1,2}/\d{1,2}/\d{2,4}).*?Act\s+No', section, re.DOTALL)
                if m:
                    d = parse_date(m.group(1))
                    if d:
                        existing["outcome_date"] = d
                        existing["status"] = "Passed"
            continue
        
        # Extract title from bill span inside h2
        title = None
        # Look for the bill title span - usually <span class="...bill...">Title</span>
        m = re.search(r'class="[^"]*bill[^"]*"[^>]*>(.*?)</span>', section, re.DOTALL)
        if m:
            title = strip_tags(m.group(1))
        if not title or len(title) < 5:
            # Fall back to any span in h2
            m = re.search(r'<h2[^>]*>.*?<span[^>]*>(.*?)</span>', section, re.DOTALL)
            if m:
                title = strip_tags(m.group(1))
        
        if not title or len(title) < 5:
            continue
        
        # Chamber from bid prefix
        if bid.startswith("s"):
            chamber = "SENATE"
        elif bid.startswith("r"):
            chamber = "HOUSE"
        else:
            chamber = default_chamber
        
        # Introduction date
        m = re.search(r'Introduced\s+(\d{1,2}/\d{1,2}/\d{2,4})', section)
        introduced_at = parse_date(m.group(1)) if m else None
        
        # Assent date: "Assent:</strong> 19/9/23 (Act No. 70, 2023)"
        # or in HTML: "Assent:</p>\n<p...>19/9/23 (Act No..."
        m = re.search(
            r'Assent[^:]*:.*?(\d{1,2}/\d{1,2}/\d{2,4}).*?Act\s+No',
            section, re.DOTALL
        )
        outcome_date = parse_date(m.group(1)) if m else None
        
        # Status
        if outcome_date or re.search(r'\(Act\s+No\.?\s+\d+', section):
            status = "Passed"
        elif re.search(r'[Nn]egatived at (?:second|2nd|third|3rd) reading', section):
            status = "Not Passed"
        elif re.search(r'[Ll]apsed immediately before commencement', section):
            if not re.search(r'[Rr]estored to.*Notice Paper', section):
                status = "Not Passed"
            else:
                status = "Before Parliament"
        elif re.search(r'[Ww]ithdrawn from.*[Nn]otice [Pp]aper', section):
            status = "Not Passed"
        else:
            status = "Before Parliament"
        
        bills[bid] = {
            "bid": bid,
            "title": title,
            "chamber": chamber,
            "introduced_at": introduced_at,
            "status": status,
            "outcome_date": outcome_date,
        }
    
    return bills

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    all_bill_data = {}
    
    for parl_num, default_chamber, blsid in ALL_LISTS:
        url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId={blsid}"
        print(f"[{parl_num}] {default_chamber} ...", flush=True)
        
        html = fetch(url)
        if not html:
            print("  SKIP")
            continue
        
        print(f"  Fetched {len(html):,} chars", flush=True)
        bills = parse_list_page(html, default_chamber)
        print(f"  Parsed {len(bills)} bills", flush=True)
        
        for bid, b in bills.items():
            if bid not in all_bill_data:
                all_bill_data[bid] = {**b, "parliamentNumber": parl_num}
            else:
                existing = all_bill_data[bid]
                if not existing.get("introduced_at") and b.get("introduced_at"):
                    existing["introduced_at"] = b["introduced_at"]
                if not existing.get("outcome_date") and b.get("outcome_date"):
                    existing["outcome_date"] = b["outcome_date"]
                    existing["status"] = "Passed"
                if existing.get("status") == "Before Parliament" and b["status"] == "Passed":
                    existing["status"] = "Passed"
        
        del html  # free memory
        time.sleep(0.5)
    
    print(f"\nTotal unique bills: {len(all_bill_data)}")
    
    from collections import Counter
    sc = Counter(v["status"] for v in all_bill_data.values())
    print(f"Status: {dict(sc)}")
    
    # Count how many have intro date and outcome date
    n_intro = sum(1 for v in all_bill_data.values() if v.get("introduced_at"))
    n_outcome = sum(1 for v in all_bill_data.values() if v.get("outcome_date"))
    print(f"Have intro date: {n_intro}, have outcome date: {n_outcome}")
    
    print("\nUpdating DB...", flush=True)
    updated = 0
    not_found = 0
    errors = 0
    
    for bid, data in all_bill_data.items():
        bill_id = f"hist_{bid}"
        
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
            if updated % 200 == 0:
                conn.commit()
                print(f"  ... {updated} updated", flush=True)
        except Exception as e:
            print(f"  DB error for {bill_id}: {e}")
            conn.rollback()
            errors += 1
    
    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\n=== Done ===")
    print(f"Updated: {updated}")
    print(f"Not in DB: {not_found}")
    print(f"Errors: {errors}")

if __name__ == "__main__":
    main()
