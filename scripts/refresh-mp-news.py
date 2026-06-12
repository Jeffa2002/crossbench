#!/usr/bin/env python3
"""
Refresh recent news headlines for Crossbench MP/Senator profiles without
rewriting bios or touching APH/member identity fields.

Usage:
  DATABASE_URL=... python3 scripts/refresh-mp-news.py --limit 20
  DATABASE_URL=... python3 scripts/refresh-mp-news.py --apply --delay 1.5
"""

import argparse
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

import psycopg2

DB_URL = os.environ.get("DATABASE_URL")
UA = "Crossbench/1.0 civic-tech research contact@crossbench.io"


def clean(text):
    if not text:
        return ""
    text = re.sub(r"\s+", " ", text).strip()
    return re.sub(r"<[^>]+>", "", text)


def fetch(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", errors="replace")


def plain_name(mp_name):
    name = re.sub(r"\b(Senator|Hon|The|Mr|Ms|Mrs|Dr|MP|OAM|AM|AO|KC|CSC)\b\.?,?", "", mp_name or "")
    return re.sub(r"\s+", " ", name).strip()


def headline_key(title):
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()[:80]


def has_identity_match(title, mp_name, electorate_name):
    clean_name = plain_name(mp_name)
    if not clean_name:
        return False

    haystack = title.lower()
    name_lower = clean_name.lower()
    parts = name_lower.split()
    first = parts[0] if parts else ""
    last = parts[-1] if parts else ""
    electorate = (electorate_name or "").lower()

    if name_lower in haystack:
        return True
    if first and last and first in haystack and last in haystack:
        return True

    context_words = [
        " mp",
        "senator",
        "minister",
        "parliament",
        "election",
        "electorate",
        "australia",
        "australian",
    ]
    has_context = any(word in haystack for word in context_words)
    if electorate and not electorate.startswith("senator ") and electorate in haystack:
        has_context = True

    return bool(last and last in haystack and has_context)


def google_news(mp_name, electorate_name, state):
    clean_name = plain_name(mp_name)
    if not clean_name:
        return []

    query = f'"{clean_name}" Australia parliament'
    if electorate_name and not electorate_name.lower().startswith("senator "):
        query += f' "{electorate_name}"'

    url = (
        "https://news.google.com/rss/search?q="
        + urllib.parse.quote(query)
        + "&hl=en-AU&gl=AU&ceid=AU:en"
    )

    try:
        xml = fetch(url)
    except Exception:
        return []

    try:
        root = ET.fromstring(xml)
    except ET.ParseError:
        return []

    headlines = []
    for item in root.findall(".//item")[:12]:
        title = clean(item.findtext("title"))
        link = clean(item.findtext("link"))
        pub_date = clean(item.findtext("pubDate"))
        source_node = item.find("source")
        source = clean(source_node.text if source_node is not None else "Google News")
        if not title or not link:
            continue

        if not has_identity_match(title, mp_name, electorate_name):
            continue

        headlines.append({
            "title": title,
            "url": link,
            "source": source,
            "date": pub_date,
            "snippet": "",
        })

    seen = set()
    unique = []
    for headline in headlines:
        key = headline_key(headline["title"])
        if key in seen:
            continue
        seen.add(key)
        unique.append(headline)
    return unique[:8]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Maximum profiles to refresh; 0 means all")
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between news requests")
    parser.add_argument("--apply", action="store_true", help="Write updates to MpProfile; default is dry-run")
    args = parser.parse_args()

    if not DB_URL:
        raise RuntimeError("DATABASE_URL is required")

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("""
        SELECT e.id, e.name, e.state, e."mpName"
        FROM "Electorate" e
        WHERE e."mpName" IS NOT NULL AND e."mpName" <> ''
        ORDER BY e."mpChamber", e.state, e.name
    """)
    rows = cur.fetchall()
    if args.limit:
        rows = rows[:args.limit]

    updated = 0
    skipped = 0
    for index, (electorate_id, electorate_name, state, mp_name) in enumerate(rows, start=1):
        headlines = google_news(mp_name, electorate_name, state)
        if headlines:
            if args.apply:
                cur.execute("""
                    UPDATE "MpProfile"
                    SET "newsHeadlines" = %s,
                        "updatedAt" = NOW()
                    WHERE "electorateId" = %s
                """, (json.dumps(headlines), electorate_id))
                if cur.rowcount:
                    updated += 1
                    conn.commit()
                    print(f"[{index}/{len(rows)}] updated {electorate_id}: {len(headlines)}")
                else:
                    skipped += 1
                    print(f"[{index}/{len(rows)}] no profile row {electorate_id}")
            else:
                updated += 1
                print(f"[{index}/{len(rows)}] dry-run {electorate_id}: {len(headlines)}")
        else:
            skipped += 1
            print(f"[{index}/{len(rows)}] no news {electorate_id}")
        time.sleep(args.delay)

    cur.close()
    conn.close()
    print(f"Done. Updated {updated}, skipped {skipped}.")


if __name__ == "__main__":
    main()
