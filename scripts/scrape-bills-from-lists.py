#!/usr/bin/env python3
"""
Scrape all 47th and 46th parliament bills from APH Bills Lists detail pages.
The Bills Lists pages contain static HTML with bId= links.
Strategy:
1. Get all unique blsIds from the Bills Lists index
2. For each blsId detail page, check title/dates to infer parliament
3. Extract all bId= links and bill titles
4. Insert into DB (via psycopg2 directly)
"""
import re
import time
import psycopg2
import urllib.request
import urllib.parse
from datetime import datetime, date
from html.parser import HTMLParser

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
BASE = "https://www.aph.gov.au"
UA = "Mozilla/5.0 Crossbench/1.0"

# Parliament date ranges
PARL_47_START = date(2022, 5, 22)
PARL_47_END   = date(2025, 7, 1)
PARL_46_START = date(2019, 5, 18)
PARL_46_END   = date(2022, 5, 21)

def fetch(url, retries=3):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return r.read().decode("utf-8", errors="replace")
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(2)

def get_unique_blsids():
    """Collect all unique blsIds from the Bills Lists index pages."""
    blsids = set()
    for st in [1, 2]:  # 1=House, 2=Senate
        for sr in range(0, 15):
            url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Lists?ps=100&st={st}&sr={sr}"
            try:
                html = fetch(url)
                found = re.findall(r'blsId=(legislation%2fbillslst%2fbillslst_[a-f0-9\-]+)', html)
                if not found:
                    break
                prev_count = len(blsids)
                blsids.update(found)
                print(f"  st={st} sr={sr}: +{len(found)} blsIds (total unique: {len(blsids)})")
                if len(blsids) == prev_count:
                    # No new ones - stop pagination
                    break
                time.sleep(0.3)
            except Exception as e:
                print(f"  Error st={st} sr={sr}: {e}")
                break
    return list(blsids)

def infer_parliament_from_title(title):
    """Try to infer parliament number from the list title."""
    # "House Bills List No. X of YYYY" or "Senate Bills List No. X of YYYY-YYYY"
    year_match = re.search(r'20(22|23|24|25)', title)
    if year_match:
        year = int("20" + year_match.group(1))
        if 2022 <= year <= 2025:
            return 47
        elif 2019 <= year <= 2022:
            return 46
    if re.search(r'No\.\s*\d+\s+of\s+2022', title):
        return 47  # Could be either - check month context
    return None

def infer_parliament_from_date(d):
    """Return parliament number from a date."""
    if not d:
        return None
    if PARL_47_START <= d < PARL_47_END:
        return 47
    if PARL_46_START <= d < PARL_46_END:
        return 46
    return None

def parse_date_from_title(title):
    """Extract a representative date from bills list title for parliament detection."""
    # Pattern: "of 2022-23", "of 2023", "of 2024-25"
    m = re.search(r'of\s+(20\d\d)(?:-\d+)?', title)
    if m:
        year = int(m.group(1))
        return date(year, 7, 1)  # Middle of year
    return None

class BillExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.bills = []
        self.list_title = ""
        self.in_title = False
        self.title_text = []
        self._current_href = None
        self._in_bid_link = False

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "a":
            href = attrs_dict.get("href", "")
            bid_m = re.search(r'bId=([a-zA-Z0-9]+)', href)
            if bid_m:
                self._current_href = href
                self._in_bid_link = True
                self._current_bid = bid_m.group(1)
                self._current_text = []

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
            self.list_title = "".join(self.title_text).strip()
        if tag == "a" and self._in_bid_link:
            title = " ".join(self._current_text).strip()
            if title and self._current_bid:
                self.bills.append({
                    "bid": self._current_bid,
                    "title": title,
                    "aphUrl": f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId={self._current_bid}"
                })
            self._in_bid_link = False

    def handle_data(self, data):
        if self.in_title:
            self.title_text.append(data)
        if self._in_bid_link:
            self._current_text.append(data.strip())

def scrape_detail_page(blsid):
    """Fetch a Bills List detail page and extract all bIds + the list title."""
    url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Lists/Details_page?blsId={blsid}"
    html = fetch(url)
    
    # Extract bId links and their text
    pattern = r'<a[^>]+href="[^"]*bId=([a-zA-Z0-9]+)[^"]*"[^>]*>(.*?)</a>'
    matches = re.findall(pattern, html, re.DOTALL)
    bills = []
    for bid, text in matches:
        clean_text = re.sub(r'<[^>]+>', '', text).strip()
        clean_text = re.sub(r'\s+', ' ', clean_text)
        if clean_text and len(clean_text) > 5:
            bills.append({"bid": bid, "title": clean_text})
    
    # Get the page title for parliament detection
    title_m = re.search(r'<(?:h1|h2|h3)[^>]*>(.*?)</(?:h1|h2|h3)>', html, re.DOTALL | re.I)
    page_title = ""
    if title_m:
        page_title = re.sub(r'<[^>]+>', '', title_m.group(1)).strip()
    
    # Also check meta og:title
    og_m = re.search(r'og:title[^>]*content="([^"]+)"', html)
    if og_m and not page_title:
        page_title = og_m.group(1)
    
    # Look for the actual list title in the content
    list_title_m = re.search(r'(?:House Bills List|Senate Bills List)[^<]*(?:No\.\s*[\d/]+\s*of\s*20\d\d[^\s<]*)?', html)
    if list_title_m:
        page_title = list_title_m.group(0).strip()
    
    return bills, page_title

def connect_db():
    conn = psycopg2.connect(DB_URL)
    return conn

def bill_exists(cursor, bid, title):
    cursor.execute(
        'SELECT id FROM "Bill" WHERE id = %s OR "aphUrl" LIKE %s',
        (f"hist_{bid}", f"%bId={bid}%")
    )
    if cursor.fetchone():
        return True
    # Check by title similarity
    cursor.execute('SELECT id FROM "Bill" WHERE title = %s', (title,))
    return bool(cursor.fetchone())

def insert_bill(cursor, bid, title, parliament_num):
    chamber = "Senate" if bid.startswith("s") else "House of Representatives"
    aph_url = f"{BASE}/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId={bid}"
    
    # Determine a rough introducedAt from parliament
    if parliament_num == 47:
        introduced = datetime(2022, 7, 1)
    elif parliament_num == 46:
        introduced = datetime(2019, 7, 1)
    else:
        introduced = datetime(2022, 1, 1)
    
    bill_id = f"hist_{bid}"
    
    try:
        cursor.execute("""
            INSERT INTO "Bill" (
                id, title, chamber, status, "aphUrl", "introducedAt", 
                "parliamentNumber", "lastUpdatedAt", "createdAt", "updatedAt"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET
                "parliamentNumber" = EXCLUDED."parliamentNumber"
        """, (
            bill_id, title, chamber, "Passed", aph_url, introduced,
            parliament_num
        ))
        return True
    except Exception as e:
        print(f"\n  DB error for {bid}: {e}")
        return False

def main():
    print("=== APH Bills List Scraper ===")
    print("Collecting all blsIds...")
    blsids = get_unique_blsids()
    print(f"\nTotal unique blsIds: {len(blsids)}")
    
    conn = connect_db()
    cursor = conn.cursor()
    
    total_inserted = 0
    total_skipped = 0
    total_errors = 0
    parl_counts = {46: 0, 47: 0, None: 0}
    
    for i, blsid in enumerate(blsids):
        print(f"\n[{i+1}/{len(blsids)}] Processing {blsid[:40]}...")
        try:
            bills, page_title = scrape_detail_page(blsid)
            print(f"  Title: {page_title[:80]}")
            print(f"  Bills: {len(bills)}")
            
            # Infer parliament from title
            parl = infer_parliament_from_title(page_title)
            
            # If unclear, try to determine from bId ranges
            # 47th parliament: r7200-r7900, s1350-s1500
            # 46th parliament: r6600-r7200, s1150-s1350
            if not parl and bills:
                sample_bid = bills[0]["bid"]
                if sample_bid.startswith("r"):
                    try:
                        num = int(sample_bid[1:])
                        if 7200 <= num <= 7900:
                            parl = 47
                        elif 6600 <= num <= 7200:
                            parl = 46
                    except:
                        pass
                elif sample_bid.startswith("s"):
                    try:
                        num = int(sample_bid[1:])
                        if 1350 <= num <= 1500:
                            parl = 47
                        elif 1150 <= num <= 1350:
                            parl = 46
                    except:
                        pass
            
            print(f"  Parliament: {parl}")
            
            # Only process 47th and 46th parliament lists
            if parl not in [46, 47]:
                print(f"  Skipping (not 47th/46th parliament)")
                parl_counts[None] += len(bills)
                continue
            
            parl_counts[parl] += len(bills)
            
            for bill in bills:
                bid = bill["bid"]
                title = bill["title"]
                
                if bill_exists(cursor, bid, title):
                    total_skipped += 1
                    continue
                
                if insert_bill(cursor, bid, title, parl):
                    total_inserted += 1
                    print(f"  + {bid}: {title[:60]}")
                else:
                    total_errors += 1
            
            conn.commit()
            time.sleep(0.5)
            
        except Exception as e:
            print(f"  ERROR: {e}")
            total_errors += 1
            conn.rollback()
    
    cursor.close()
    conn.close()
    
    print(f"\n=== Complete ===")
    print(f"Inserted: {total_inserted}")
    print(f"Skipped (existing): {total_skipped}")
    print(f"Errors: {total_errors}")
    print(f"Parliament breakdown: 47th={parl_counts[47]}, 46th={parl_counts[46]}, Other={parl_counts[None]}")

if __name__ == "__main__":
    main()
