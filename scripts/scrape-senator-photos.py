#!/usr/bin/env python3
"""
Build senator MPID lookup by searching APH one senator at a time by family name.
The single-name search reliably returns results.
"""
import re, time, urllib.request, psycopg2

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
UA = "Crossbench/1.0 civic-tech contact@crossbench.io"

def search_mpid(last_name: str) -> list:
    """Search APH for a senator by last name. Returns list of (mpid, full_name) tuples."""
    url = (
        "https://www.aph.gov.au/Senators_and_Members/Parliamentarian_Search_Results"
        f"?mem=1&par=-1&gen=0&ps=20&st=1&family_name={urllib.parse.quote(last_name)}"
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            html = r.read().decode("utf-8", errors="replace")
        matches = re.findall(r'Parliamentarian\?MPID=([A-Z0-9]+)[^>]*>([^<]+)</a>', html)
        results = []
        seen = set()
        for mpid, name in matches:
            name = name.strip()
            if mpid not in seen and "Senator" in name:
                seen.add(mpid)
                results.append((mpid, name))
        return results
    except Exception as e:
        print(f"    Fetch error for {last_name}: {e}")
        return []

import urllib.parse

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, "mpName", state, "mpPhotoUrl"
        FROM "Electorate" WHERE "mpChamber" = 'Senate'
        ORDER BY state, "mpName"
    """)
    db_senators = cur.fetchall()
    print(f"{len(db_senators)} senator rows in DB")
    
    updated = 0
    not_matched = []
    
    for db_id, db_mpname, db_state, existing_photo in db_senators:
        clean_name = re.sub(r'^Senator\s+', '', db_mpname or '').strip()
        parts = clean_name.split()
        last_name = parts[-1] if parts else ""
        first_name = parts[0] if parts else ""
        
        # Skip if already has photo
        if existing_photo:
            updated += 1
            continue
        
        print(f"  Searching: {clean_name} ({db_state})...", end=" ", flush=True)
        results = search_mpid(last_name)
        
        if not results:
            print("not found")
            not_matched.append(clean_name)
            time.sleep(0.4)
            continue
        
        mpid = None
        if len(results) == 1:
            mpid = results[0][0]
            print(f"-> {results[0][1]} ({mpid})")
        else:
            # Multiple results - pick by first name match
            for rid, rname in results:
                if first_name.lower() in rname.lower():
                    mpid = rid
                    print(f"-> {rname} ({rid}) [multi-match]")
                    break
            if not mpid:
                mpid = results[0][0]
                print(f"-> {results[0][1]} ({mpid}) [fallback]")
        
        photo_url = f"https://www.aph.gov.au/api/parliamentarian/{mpid}/image"
        cur.execute("""
            UPDATE "Electorate"
            SET "mpPhotoUrl" = %s, "mpId" = %s, "updatedAt" = NOW()
            WHERE id = %s
        """, (photo_url, mpid, db_id))
        conn.commit()
        updated += 1
        time.sleep(0.4)
    
    cur.close()
    conn.close()
    print(f"\nDone. Updated/confirmed: {updated}, Not matched: {len(not_matched)}")
    if not_matched:
        print("Not matched:", not_matched)

if __name__ == "__main__":
    main()
