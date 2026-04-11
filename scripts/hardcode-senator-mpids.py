#!/usr/bin/env python3
"""
Hardcoded senator MPID table from APH (48th parliament).
Built from APH Parliamentarian search + public data.
"""
import psycopg2, re

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"

# MPID -> last_name (from the A-Z scrape that DID work earlier + APH public pages)
# Format: "LastName FirstName": "MPID"
SENATOR_MPIDS = {
    # A
    "Allman-Payne Penny": "298839",
    "Ananda-Rajah Michelle": "290544",
    "Antic Alex": "269375",
    "Askew Wendy": "281558",
    "Ayres Tim": "16913",
    # B
    "Babet Ralph": "300706",
    "Bell Sean": "319142",
    "Blyth Leah": "315170",
    "Bragg Andrew": "256063",
    "Brockman Slade": "30484",
    "Brown Carol": "F49",
    # C
    "Cadell Ross": "300134",
    "Canavan Matthew": "245212",
    "Cash Michaelia": "I0M",
    "Chandler Claire": "264449",
    "Chisholm Anthony": "39801",
    "Ciccone Raff": "281503",
    "Collins Jessica": "297964",
    "Colbeck Richard": "00AOL",
    "Cox Dorinda": "296215",
    # D
    "Darmanin Lisa": "301128",
    "Dolega Josh": "316935",
    "Dowling Richard": "55842",
    "Duniam Jonathon": "263418",
    # F
    "Farrell Don": "I0N",
    "Faruqi Mehreen": "250362",
    # G
    "Gallagher Katy": "ING",
    "Ghosh Varun": "257613",
    "Green Nita": "259819",
    "Grogan Karen": "296331",
    # H
    "Hanson Pauline": "BK6",
    "Hanson-Young Sarah": "I0U",
    "Henderson Sarah": "ZN4",
    "Hodgins-May Steph": "310860",
    "Hume Jane": "266499",
    # L
    "Lambie Jacqui": "248869",
    "Liddle Kerrynne": "307290",
    "Lines Sue": "DZX",
    # M
    "McCarthy Malarndirri": "263426",
    "McDonald Susan": "285809",
    "McGrath James": "248154",
    "McAllister Jenny": "264448",
    "McKenzie Bridget": "237512",
    "McKim Nick": "244373",
    "McLachlan Andrew": "304880",
    "Mulholland Corinne": "316913",
    # O
    "O'Neill Deborah": "236456",
    "O'Sullivan Matt": "289175",
    # P
    "Paterson James": "264450",
    "Payman Fatima": "316095",
    "Pocock David": "311509",
    "Pocock Barbara": "307288",
    "Polley Helen": "14566",
    "Price Jacinta Nampijinpa": "307587",
    # R
    "Roberts Malcolm": "248157",
    "Ruston Anne": "222949",
    # S
    "Scarr Paul": "275756",
    "Sharma Dave": "307591",
    "Sheldon Tony": "296205",
    "Shoebridge David": "307289",
    "Smith Dean": "229225",
    "Smith Marielle": "307292",
    "Steele-John Jordon": "268466",
    "Sterle Glenn": "13051",
    "Stewart Jana": "296203",
    # T
    "Thorpe Lidia": "264451",
    "Tyrrell Tammy": "307590",
    # W
    "Walker Charlotte": "319139",
    "Walsh Jess": "302618",
    "Waters Larissa": "229222",
    "Watt Murray": "265980",
    "Whish-Wilson Peter": "229221",
    "Whiteaker Ellie": "319137",
    "Whitten Tyron": "319141",
    "Wong Penny": "DXA",
    # Other
    "Kovacic Maria": "316553",
    "McAllister Jenny": "264448",
}

def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    cur.execute("""
        SELECT id, "mpName", state
        FROM "Electorate" WHERE "mpChamber" = 'Senate'
        ORDER BY state, "mpName"
    """)
    db_senators = cur.fetchall()
    
    updated = 0
    not_matched = []
    
    for db_id, db_mpname, db_state in db_senators:
        clean = re.sub(r'^Senator\s+', '', db_mpname or '').strip()
        parts = clean.split()
        last = parts[-1] if parts else ""
        first = parts[0] if parts else ""
        
        # Try "Last First" lookup
        key = f"{last} {first}"
        mpid = SENATOR_MPIDS.get(key)
        
        if not mpid:
            # Try just last name
            for k, v in SENATOR_MPIDS.items():
                if k.split()[0].lower() == last.lower():
                    mpid = v
                    break
        
        if mpid:
            photo_url = f"https://www.aph.gov.au/api/parliamentarian/{mpid}/image"
            cur.execute("""
                UPDATE "Electorate"
                SET "mpPhotoUrl" = %s, "mpId" = %s, "updatedAt" = NOW()
                WHERE id = %s
            """, (photo_url, mpid, db_id))
            updated += 1
            print(f"  ✓ {clean} -> {mpid}")
        else:
            not_matched.append(clean)
            print(f"  ✗ {clean}")
    
    conn.commit()
    cur.close()
    conn.close()
    print(f"\nUpdated: {updated}, Not matched: {len(not_matched)}")
    if not_matched:
        print("Not matched:", not_matched)

if __name__ == "__main__":
    main()
