#!/usr/bin/env python3
"""
Sync MP and Senator email addresses from official APH contact PDFs.

Default is dry-run. Use --apply to write updates.
"""
import argparse
import os
import re
import subprocess
import tempfile
import urllib.request

import psycopg2

DB_URL = os.environ.get("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL is required")

HOUSE_PDF = "https://www.aph.gov.au/-/media/03_Senators_and_Members/32_Members/Lists/Members_List.pdf"
SENATE_PDF = "https://www.aph.gov.au/-/media/03_Senators_and_Members/31_Senators/contacts/los.pdf"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "application/pdf,*/*",
    "Accept-Language": "en-AU,en;q=0.9",
    "Referer": "https://www.aph.gov.au/",
}

HONORIFICS = {
    "senator", "the", "hon", "mr", "ms", "mrs", "miss", "dr", "professor", "prof",
    "mp", "oam", "am", "ao", "kc", "sc", "qc", "rfd", "dsc", "csc",
}


def fetch_pdf_text(url: str) -> str:
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as response:
        pdf = response.read()

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as handle:
        handle.write(pdf)
        pdf_path = handle.name

    try:
        result = subprocess.run(
            ["pdftotext", pdf_path, "-"],
            capture_output=True,
            text=True,
            timeout=30,
            check=True,
        )
        return result.stdout
    finally:
        try:
            os.unlink(pdf_path)
        except OSError:
            pass


def normalise_email_key(email: str) -> str:
    return re.sub(r"[^a-z0-9]", "", email.lower())


def email_maps(text: str):
    house_emails = sorted(set(re.findall(r"\b[A-Za-z][A-Za-z0-9._%+'-]+\.MP@aph\.gov\.au\b", text, re.I)))
    senate_emails = sorted(set(re.findall(r"\bsenator\.[A-Za-z0-9._%+'-]+@aph\.gov\.au\b", text, re.I)))
    return (
        {normalise_email_key(email): email for email in house_emails},
        {normalise_email_key(email): email for email in senate_emails},
    )


def name_tokens(name: str | None):
    text = name or ""
    text = re.sub(r"\([^)]*\)", " ", text)
    text = text.replace(",", " ")
    raw = re.findall(r"[A-Za-z]+(?:[-'][A-Za-z]+)?", text)
    tokens = [token for token in raw if token.lower().replace(".", "") not in HONORIFICS]
    return tokens


def key_for(parts: list[str], suffix: str = "") -> str:
    return normalise_email_key(".".join(parts) + suffix)


def match_house_email(mp_name: str | None, house_map: dict[str, str]):
    tokens = name_tokens(mp_name)
    if len(tokens) < 2:
        return None

    first = tokens[0]
    last = tokens[-1]
    candidates = [
        key_for([first, last], ".MP@aph.gov.au"),
    ]

    # Some public names include a compound surname; try the last two tokens as well.
    if len(tokens) >= 3:
        candidates.append(key_for([first, f"{tokens[-2]}-{tokens[-1]}"], ".MP@aph.gov.au"))
        candidates.append(key_for([first, tokens[-2] + tokens[-1]], ".MP@aph.gov.au"))

    for candidate in candidates:
        if candidate in house_map:
            return house_map[candidate]

    # Fallback only when exactly one official email has the same surname and first initial.
    first_initial = first[0].lower()
    last_key = normalise_email_key(last)
    possibles = [
        email for key, email in house_map.items()
        if key.endswith(last_key + "mpaphgovau") and key.startswith(first_initial)
    ]
    if len(possibles) == 1:
        return possibles[0]

    return None


def match_senate_email(mp_name: str | None, senate_map: dict[str, str]):
    tokens = name_tokens(mp_name)
    if len(tokens) < 2:
        return None

    first = tokens[0]
    last = tokens[-1]
    candidates = [
        key_for(["senator", first, last], "@aph.gov.au"),
        key_for(["senator", last], "@aph.gov.au"),
    ]
    if len(tokens) >= 3:
        candidates.insert(0, key_for(["senator", tokens[-2], tokens[-1]], "@aph.gov.au"))
        candidates.insert(0, key_for(["senator", first, tokens[-2], tokens[-1]], "@aph.gov.au"))

    for candidate in candidates:
        if candidate in senate_map:
            return senate_map[candidate]

    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write email updates to the database")
    args = parser.parse_args()

    house_text = fetch_pdf_text(HOUSE_PDF)
    senate_text = fetch_pdf_text(SENATE_PDF)
    house_map, _ = email_maps(house_text)
    _, senate_map = email_maps(senate_text)

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, state, "mpName", "mpChamber", "mpEmail"
        FROM "Electorate"
        WHERE "mpChamber" IN ('House of Reps', 'Senate')
        ORDER BY "mpChamber", state, name
    """)
    rows = cur.fetchall()

    updates = []
    unresolved = []
    for elec_id, name, state, mp_name, chamber, current_email in rows:
        matched = match_house_email(mp_name, house_map) if chamber == "House of Reps" else match_senate_email(mp_name, senate_map)
        current = current_email or None
        if matched:
            if current != matched:
                updates.append((elec_id, name, mp_name, chamber, current, matched))
        else:
            unresolved.append((elec_id, name, mp_name, chamber, current))
            if current:
                updates.append((elec_id, name, mp_name, chamber, current, None))

    print(f"Official House emails: {len(house_map)}")
    print(f"Official Senate emails: {len(senate_map)}")
    print(f"Rows checked: {len(rows)}")
    print(f"Updates needed: {len(updates)}")
    print(f"Unresolved rows: {len(unresolved)}")

    if updates:
        print("\nUpdates:")
        for elec_id, name, mp_name, chamber, old, new in updates[:240]:
            print(f"  {chamber:13} {name:28} {mp_name or '-':42} {old or '-'} -> {new or '-'}")

    if unresolved:
        print("\nUnresolved:")
        for elec_id, name, mp_name, chamber, current in unresolved[:80]:
            print(f"  {chamber:13} {name:28} {mp_name or '-':42} current={current or '-'}")

    if args.apply:
        for elec_id, _name, _mp_name, _chamber, _old, new in updates:
            cur.execute(
                'UPDATE "Electorate" SET "mpEmail" = %s, "updatedAt" = NOW() WHERE id = %s',
                (new, elec_id),
            )
        conn.commit()
        print(f"\nApplied {len(updates)} updates.")
    else:
        print("\nDry run only. Use --apply to write updates.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
