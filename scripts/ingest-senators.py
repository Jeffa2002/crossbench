#!/usr/bin/env python3
"""
Ingest current senators — unique name per senator (not per state).
"""
import json, re, time, urllib.request, psycopg2

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
TVFY_KEY = "MblbGrZ//yamS8FUUeDG"

STATE_MAP = {
    "New South Wales": "NSW", "Victoria": "VIC", "Queensland": "QLD",
    "South Australia": "SA", "Western Australia": "WA", "Tasmania": "TAS",
    "Australian Capital Territory": "ACT", "Northern Territory": "NT",
    "NSW": "NSW", "VIC": "VIC", "QLD": "QLD", "SA": "SA",
    "WA": "WA", "TAS": "TAS", "ACT": "ACT", "NT": "NT",
}

def slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def fetch_senators():
    url = f"https://theyvoteforyou.org.au/api/v1/people.json?key={TVFY_KEY}"
    req = urllib.request.Request(url, headers={"User-Agent": "Crossbench/1.0 civic-tech contact@crossbench.io"})
    with urllib.request.urlopen(req, timeout=20) as r:
        people = json.loads(r.read())

    senators = []
    for p in people:
        m = p.get("latest_member", {})
        if m.get("house") != "senate":
            continue
        name = m.get("name", {})
        first = name.get("first", "")
        last = name.get("last", "")
        electorate = m.get("electorate", "")
        party = m.get("party", "")
        state_abbrev = STATE_MAP.get(electorate, electorate)
        senators.append({
            "tvfy_id": p["id"],
            "first": first, "last": last,
            "full_name": f"{first} {last}".strip(),
            "party": party,
            "state_name": electorate,
            "state": state_abbrev,
        })
    return senators

def main():
    senators = fetch_senators()
    print(f"Fetched {len(senators)} senators")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Remove all existing senator rows cleanly
    cur.execute('DELETE FROM "Electorate" WHERE "mpChamber" = \'Senate\'')
    print(f"Cleared {cur.rowcount} old senator rows")
    conn.commit()

    inserted = 0
    for s in senators:
        # Unique ID per senator
        senator_id = f"{slug(s['state'])}-sen-{slug(s['last'])}-{slug(s['first'])}"
        # Unique display name per senator: "Senator Jane Smith (NSW)"
        display_name = f"Senator {s['full_name']} ({s['state']})"
        mp_name = f"Senator {s['full_name']}"

        try:
            cur.execute("""
                INSERT INTO "Electorate" (
                    id, name, state,
                    "mpName", "mpParty", "mpChamber",
                    "createdAt", "updatedAt"
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    "mpName" = EXCLUDED."mpName",
                    "mpParty" = EXCLUDED."mpParty",
                    state = EXCLUDED.state,
                    "updatedAt" = NOW()
            """, (senator_id, display_name, s["state"], mp_name, s["party"], "Senate"))
            inserted += 1
        except Exception as e:
            print(f"  Error {mp_name}: {e}")
            conn.rollback()
            continue

    conn.commit()

    cur.execute("""
        SELECT state, COUNT(*) FROM "Electorate"
        WHERE "mpChamber" = 'Senate' GROUP BY state ORDER BY state
    """)
    print(f"\nInserted {inserted} senators:")
    for state, count in cur.fetchall():
        print(f"  {state}: {count}")

    cur.close()
    conn.close()
    print("Done.")

if __name__ == "__main__":
    main()
