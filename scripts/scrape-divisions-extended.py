#!/usr/bin/env python3
"""
Extended TVFY division scraper for 47th parliament historical bills.
Covers May 2022 - present, matches against ALL bills in DB (including hist_).
"""
import re, time, json, urllib.request, psycopg2
from datetime import datetime, date

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
BASE = "https://theyvoteforyou.org.au/api/v1"

import subprocess
result = subprocess.run(
    ["grep", "TVFY_API_KEY", "/var/www/crossbench/.env"],
    capture_output=True, text=True
)
API_KEY = result.stdout.strip().split("=", 1)[-1].strip().strip('"').strip("'")
print(f"API key loaded: {API_KEY[:8]}...")

def fetch_divisions(start: str, end: str):
    url = f"{BASE}/divisions.json?key={API_KEY}&per_page=100&start_date={start}&end_date={end}"
    req = urllib.request.Request(url, headers={"User-Agent": "Crossbench/1.0 civic-tech contact@crossbench.io"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception as e:
            if attempt == 2:
                print(f"  TVFY fetch failed {start}-{end}: {e}")
                return []
            time.sleep(5)
    return []

def fetch_division_detail(div_id: int):
    url = f"{BASE}/divisions/{div_id}.json?key={API_KEY}"
    req = urllib.request.Request(url, headers={"User-Agent": "Crossbench/1.0 civic-tech contact@crossbench.io"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception as e:
            if attempt == 2:
                print(f"  Detail fetch failed div {div_id}: {e}")
                return None
            time.sleep(5)
    return None

def date_ranges():
    """Monthly ranges from July 2022 to today."""
    ranges = []
    y, m = 2022, 7  # 47th parliament started July 2022
    now = datetime.now()
    while (y, m) <= (now.year, now.month):
        start = f"{y}-{m:02d}-01"
        import calendar
        last_day = calendar.monthrange(y, m)[1]
        end = f"{y}-{m:02d}-{last_day:02d}"
        ranges.append((start, end))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return ranges

def short_title(title: str) -> str:
    """Strip 'Bill YYYY' suffix for matching."""
    t = re.sub(r'\s+Bill\s+\d{4}(-\d{4})?$', '', title, flags=re.IGNORECASE).strip()
    t = re.sub(r'\s+\d{4}(-\d{4})?$', '', t).strip()
    return t

def title_words(title: str) -> list:
    return [w.lower() for w in re.findall(r'\b\w{3,}\b', short_title(title))]

def is_passage_vote(name: str) -> bool:
    """Only third reading / second reading agreed votes = passage votes."""
    n = name.lower()
    third_read = bool(re.search(r'third reading', n))
    second_agreed = bool(re.search(r'second reading.*agreed', n) or re.search(r'second reading.*passed', n))
    return third_read or second_agreed

def titles_match(bill_title: str, division_name: str) -> bool:
    """Check if division name is about this bill."""
    bill_words = title_words(bill_title)
    if len(bill_words) < 3:
        return False
    div_lower = division_name.lower()
    # Check contiguous substring of meaningful length
    short = short_title(bill_title).lower()
    if len(short) >= 15 and short in div_lower:
        return True
    # Check word coverage (>= 60% of bill's key words appear in division name)
    matched = sum(1 for w in bill_words if w in div_lower)
    return matched / len(bill_words) >= 0.6

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Load all bills
    cur.execute("""
        SELECT id, title, status, "parliamentNumber"
        FROM "Bill"
        WHERE "parliamentNumber" IN (47, 48)
        ORDER BY "parliamentNumber" DESC
    """)
    bills = [{"id": r[0], "title": r[1], "status": r[2], "parlNum": r[3]} for r in cur.fetchall()]
    print(f"Loaded {len(bills)} bills from 47th+48th parliaments")

    # Already has divisions data?
    cur.execute('SELECT id FROM "Bill" WHERE "divisionsData" IS NOT NULL AND "divisionsData" != \'[]\'')
    has_divisions = {r[0] for r in cur.fetchall()}
    print(f"{len(has_divisions)} bills already have division data")

    # Fetch all divisions monthly
    ranges = date_ranges()
    print(f"Fetching {len(ranges)} monthly date ranges ({ranges[0][0]} to {ranges[-1][1]})...")

    all_divs = []
    seen_ids = set()
    for start, end in ranges:
        divs = fetch_divisions(start, end)
        new_divs = [d for d in divs if d.get("id") not in seen_ids]
        for d in new_divs:
            seen_ids.add(d["id"])
        all_divs.extend(new_divs)
        print(f"  {start}: +{len(new_divs)} ({len(all_divs)} total)")
        time.sleep(0.35)

    print(f"\nTotal unique divisions: {len(all_divs)}")

    # Filter to passage votes only
    passage_divs = [d for d in all_divs if is_passage_vote(d.get("name", ""))]
    print(f"Passage votes (3rd reading / 2nd reading agreed): {len(passage_divs)}")

    # Match to bills
    bill_divisions = {}  # bill_id -> list of division ids
    for div in passage_divs:
        name = div.get("name", "")
        for bill in bills:
            if titles_match(bill["title"], name):
                bill_divisions.setdefault(bill["id"], []).append(div["id"])

    matched_bills = len(bill_divisions)
    print(f"Bills matched to at least one passage division: {matched_bills}")

    # Fetch details and build divisionsData
    updated = 0
    for bill_id, div_ids in bill_divisions.items():
        bill = next(b for b in bills if b["id"] == bill_id)
        print(f"\n  [{bill['parlNum']}] {bill['title'][:60]}... → {len(div_ids)} division(s)")

        all_votes = []
        for div_id in div_ids:
            detail = fetch_division_detail(div_id)
            if not detail:
                continue
            time.sleep(0.35)

            # TVFY API: votes is a flat list, totals are aye_votes/no_votes
            vote_list = detail.get("votes", [])
            if isinstance(vote_list, dict):
                # Fallback for older API shape
                aye_list = vote_list.get("ayes", {}).get("votes", [])
                no_list = vote_list.get("noes", {}).get("votes", [])
                vote_list = [dict(v, vote="aye") for v in aye_list] + [dict(v, vote="no") for v in no_list]

            members = []
            for v in vote_list:
                m = v.get("member", {})
                members.append({
                    "name": f"{m.get('first_name', '')} {m.get('last_name', '')}".strip(),
                    "party": m.get("party", ""),
                    "electorate": m.get("electorate", ""),
                    "vote": v.get("vote", "aye"),
                })

            # Party breakdown
            party_tally: dict = {}
            for mem in members:
                p = mem["party"] or "Unknown"
                if p not in party_tally:
                    party_tally[p] = {"aye": 0, "no": 0}
                party_tally[p][mem["vote"]] += 1

            house = detail.get("house", "representatives")
            chamber = "senate" if "senate" in house.lower() else "representatives"

            all_votes.append({
                "id": detail.get("id"),
                "date": detail.get("date"),
                "name": detail.get("name", ""),
                "chamber": chamber,
                "ayes": detail.get("aye_votes", 0),
                "noes": detail.get("no_votes", 0),
                "members": members,
                "partyBreakdown": [
                    {"party": p, "aye": v["aye"], "no": v["no"]}
                    for p, v in party_tally.items()
                ],
            })

        if not all_votes:
            continue

        divisions_json = json.dumps(all_votes)
        try:
            cur.execute("""
                UPDATE "Bill" SET
                    "divisionsData" = %s,
                    "updatedAt" = NOW()
                WHERE id = %s
            """, (divisions_json, bill_id))
            conn.commit()
            updated += 1
            print(f"    Saved {len(all_votes)} division(s)")
        except Exception as e:
            print(f"    DB error: {e}")
            conn.rollback()

    cur.close()
    conn.close()
    print(f"\n=== Done: {updated} bills updated with division data ===")

if __name__ == "__main__":
    main()
