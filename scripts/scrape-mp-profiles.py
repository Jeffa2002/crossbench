#!/usr/bin/env python3
"""
MP Profile Scraper for Crossbench
Scrapes APH bios + Wikipedia + DuckDuckGo news for each MP.

Usage:
  python3 scrape-mp-profiles.py --chamber hor --batch-start 0 --batch-size 50
  python3 scrape-mp-profiles.py --chamber senate --batch-start 0 --batch-size 40
  python3 scrape-mp-profiles.py --chamber hor --batch-start 50 --batch-size 50
  python3 scrape-mp-profiles.py --chamber hor --batch-start 100 --batch-size 50
"""
import sys, os, json, re, time, argparse, urllib.request, urllib.parse
import psycopg2
from datetime import datetime

DB_URL = "postgresql://crossbench:cb_prod_2026@localhost/crossbench"
UA = "Crossbench/1.0 civic-tech research contact@crossbench.io"
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# ─── helpers ───────────────────────────────────────────────────────────────

def fetch(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception as e:
        return ""

def fetch_json(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except:
        return None

def clean(text):
    if not text:
        return ""
    text = re.sub(r'\s+', ' ', text).strip()
    text = re.sub(r'<[^>]+>', '', text)
    return text

# ─── APH scraper ───────────────────────────────────────────────────────────

def scrape_aph(mp_id, mp_name):
    """Scrape APH parliamentarian page for bio, committees, electorate year."""
    if not mp_id:
        return {}
    url = f"https://www.aph.gov.au/Senators_and_Members/Parliamentarian?MPID={mp_id}"
    html = fetch(url)
    if not html:
        return {}

    result = {}

    # Born / birthdate
    born = re.search(r'[Bb]orn[:\s]+([^<\n]{5,60})', html)
    if born:
        result["birthDate"] = clean(born.group(1))

    # Electorate / First elected
    first_el = re.search(r'[Ff]irst [Ee]lected[:\s]+([^<\n]{4,30})', html)
    if first_el:
        result["firstElected"] = clean(first_el.group(1))

    # Extract full bio text from the content area
    bio_match = re.search(
        r'<div[^>]*class="[^"]*biography[^"]*"[^>]*>(.*?)</div>',
        html, re.DOTALL | re.IGNORECASE
    )
    if not bio_match:
        # Try broader content area
        bio_match = re.search(
            r'<div[^>]*id="[^"]*content[^"]*"[^>]*>(.*?)</div>\s*</div>',
            html, re.DOTALL | re.IGNORECASE
        )
    if bio_match:
        bio_text = clean(bio_match.group(1))[:3000]
        result["aphBio"] = bio_text

    # Committees
    committees = re.findall(r'<li[^>]*>\s*([^<]{20,120}(?:Committee|Inquiry)[^<]*)\s*</li>', html)
    if committees:
        result["committees"] = json.dumps(list(set([clean(c) for c in committees[:8]])))

    # Portfolios / roles
    portfolios = re.findall(r'(?:Minister|Shadow Minister|Parliamentary Secretary)[^<\n]{5,80}', html)
    if portfolios:
        result["portfolios"] = json.dumps(list(set([clean(p) for p in portfolios[:6]])))

    result["aphBioUrl"] = url
    return result

# ─── Wikipedia scraper ─────────────────────────────────────────────────────

def scrape_wikipedia(mp_name):
    """Fetch Wikipedia summary for an MP."""
    # Clean name: remove "Mr", "Ms", "Hon", "MP", "Dr" etc.
    clean_name = re.sub(r'\b(Mr|Ms|Mrs|Dr|Hon|The|MP|AM|OAM|OBE|AO|KC|RFD)\b\.?', '', mp_name).strip()
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()

    # Wikipedia API search
    search_url = (
        "https://en.wikipedia.org/api/rest_v1/page/summary/"
        + urllib.parse.quote(clean_name.replace(' ', '_'))
    )
    data = fetch_json(search_url)
    if data and data.get("type") != "disambiguation" and data.get("extract"):
        extract = data["extract"]
        if len(extract) > 100 and any(kw in extract.lower() for kw in ["politician", "parliament", "minister", "senator", "member", "born", "party", "elected"]):
            return {
                "wikiSummary": extract[:2000],
                "wikiUrl": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            }

    # Fallback: search
    search_api = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + urllib.parse.quote(clean_name + " Australian politician") + "&format=json&utf8=1"
    results = fetch_json(search_api)
    if results:
        hits = results.get("query", {}).get("search", [])
        if hits:
            title = hits[0]["title"]
            summary_url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title)
            data = fetch_json(summary_url)
            if data and data.get("extract"):
                return {
                    "wikiSummary": data["extract"][:2000],
                    "wikiUrl": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                }
    return {}

# ─── News scraper (DuckDuckGo) ─────────────────────────────────────────────

def scrape_news(mp_name, electorate_or_state=""):
    """Fetch recent news headlines about the MP via DuckDuckGo."""
    clean_name = re.sub(r'\b(Mr|Ms|Mrs|Dr|Hon|The|MP|Senator)\b\.?', '', mp_name).strip()
    clean_name = re.sub(r'\s+', ' ', clean_name).strip()

    query = urllib.parse.quote(f'"{clean_name}" parliament OR senator OR minister Australia')
    # Use DuckDuckGo news endpoint
    url = f"https://html.duckduckgo.com/html/?q={query}&iar=news"
    html = fetch(url, timeout=20)

    headlines = []
    if html:
        # Extract result snippets
        results = re.findall(
            r'<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)</a>.*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([^<]+)</a>',
            html, re.DOTALL
        )
        for href, title, snippet in results[:8]:
            title = clean(title)
            snippet = clean(snippet)
            if clean_name.split()[-1].lower() in title.lower() or clean_name.split()[-1].lower() in snippet.lower():
                # Extract domain as source
                domain = re.search(r'(?:https?://)?(?:www\.)?([^/]+)', href)
                source = domain.group(1) if domain else ""
                headlines.append({"title": title, "snippet": snippet, "url": href, "source": source})

    # Also try Google News RSS
    gnews_url = f"https://news.google.com/rss/search?q={urllib.parse.quote(clean_name + ' Australia parliament')}&hl=en-AU&gl=AU&ceid=AU:en"
    rss = fetch(gnews_url, timeout=15)
    if rss:
        items = re.findall(r'<item>(.*?)</item>', rss, re.DOTALL)
        for item in items[:6]:
            title_m = re.search(r'<title>(.*?)</title>', item)
            link_m  = re.search(r'<link>(.*?)</link>', item)
            pubdate_m = re.search(r'<pubDate>(.*?)</pubDate>', item)
            source_m = re.search(r'<source[^>]*>(.*?)</source>', item)
            if title_m and link_m:
                title = clean(title_m.group(1))
                if clean_name.split()[-1].lower() in title.lower():
                    headlines.append({
                        "title": title,
                        "url": clean(link_m.group(1)),
                        "source": clean(source_m.group(1)) if source_m else "Google News",
                        "date": clean(pubdate_m.group(1)) if pubdate_m else "",
                        "snippet": "",
                    })

    # Deduplicate by title
    seen = set()
    unique = []
    for h in headlines:
        key = h["title"].lower()[:40]
        if key not in seen:
            seen.add(key)
            unique.append(h)

    return unique[:10]

# ─── Claude AI bio synthesiser ─────────────────────────────────────────────

def synthesise_bio(mp_name, mp_party, chamber, electorate_state, aph_bio, wiki_summary, firstElected, portfolios):
    """Use Claude to write a clean, structured bio from scraped data."""
    if not ANTHROPIC_KEY:
        return {}

    context_parts = []
    if aph_bio:
        context_parts.append(f"APH official bio:\n{aph_bio[:1500]}")
    if wiki_summary:
        context_parts.append(f"Wikipedia:\n{wiki_summary[:1200]}")
    if firstElected:
        context_parts.append(f"First elected: {firstElected}")
    if portfolios:
        try:
            pl = json.loads(portfolios)
            context_parts.append(f"Portfolios/roles: {', '.join(pl)}")
        except:
            context_parts.append(f"Portfolios: {portfolios}")

    if not context_parts:
        return {}

    context = "\n\n".join(context_parts)
    chamber_str = "Member of the House of Representatives" if chamber == "House of Reps" else "Senator"
    loc = f"Electorate of {electorate_state}" if chamber == "House of Reps" else f"Senator for {electorate_state}"

    prompt = f"""You are writing a profile for an Australian civic information platform called Crossbench.

MP: {mp_name}
Party: {mp_party}
Role: {chamber_str} — {loc}

Source material:
{context}

Write a factual, neutral, engaging profile. Return a JSON object with these exact keys:
{{
  "shortBio": "2-3 sentence summary suitable for a card/preview (max 200 chars)",
  "longBio": "3-4 paragraph detailed biography covering their background, career, key roles, and notable work. Factual and neutral. Max 600 words.",
  "birthDate": "birth date or year if found (e.g. '12 March 1971' or '1971'), empty string if not found",
  "birthPlace": "city/town of birth if found, empty string if not",
  "education": "educational background if found, empty string if not",
  "profession": "pre-politics profession if found, empty string if not",
  "hobbies": "known interests/hobbies if mentioned, empty string if not"
}}

Return ONLY the JSON object, no other text."""

    payload = json.dumps({
        "model": "claude-haiku-4-5",
        "max_tokens": 900,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            text = resp["content"][0]["text"].strip()
            # Extract JSON from response
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
    except Exception as e:
        print(f"    Claude error: {e}")
    return {}

# ─── Social links scraper ──────────────────────────────────────────────────

def scrape_social(mp_name, mp_id):
    """Get social media links from APH page."""
    if not mp_id:
        return {}
    url = f"https://www.aph.gov.au/Senators_and_Members/Parliamentarian?MPID={mp_id}"
    html = fetch(url)
    links = {}
    if html:
        tw = re.search(r'href="(https?://(?:twitter|x)\.com/[^"]+)"', html)
        fb = re.search(r'href="(https?://(?:www\.)?facebook\.com/[^"]+)"', html)
        yt = re.search(r'href="(https?://(?:www\.)?youtube\.com/[^"]+)"', html)
        ws = re.search(r'href="(https?://(?:www\.)?(?!aph\.gov)[a-z][^"]{5,50}\.(?:com\.au|org\.au|net\.au|com|org)/[^"]*)"', html)
        if tw: links["twitter"] = tw.group(1)
        if fb: links["facebook"] = fb.group(1)
        if yt: links["youtube"] = yt.group(1)
        if ws: links["website"] = ws.group(1)
    return links

# ─── Main processing ───────────────────────────────────────────────────────

def process_mp(row, conn):
    elec_id, mp_name, mp_id, mp_party, mp_chamber, state_or_elec = row
    print(f"\n  → {mp_name} ({mp_chamber}, {state_or_elec})")

    # Check if already scraped recently
    cur = conn.cursor()
    cur.execute('SELECT "scrapedAt" FROM "MpProfile" WHERE "electorateId" = %s', (elec_id,))
    existing = cur.fetchone()
    if existing and existing[0]:
        age_hours = (datetime.now() - existing[0]).total_seconds() / 3600
        if age_hours < 168:  # skip if scraped within 7 days
            print(f"    Skipping (scraped {age_hours:.0f}h ago)")
            cur.close()
            return

    # 1. APH official bio
    print("    APH...", end=" ", flush=True)
    aph_data = scrape_aph(mp_id, mp_name)
    print(f"{'ok' if aph_data else 'empty'}", end=" ")
    time.sleep(0.5)

    # 2. Wikipedia
    print("Wiki...", end=" ", flush=True)
    wiki_data = scrape_wikipedia(mp_name)
    print(f"{'ok' if wiki_data else 'empty'}", end=" ")
    time.sleep(0.3)

    # 3. News
    print("News...", end=" ", flush=True)
    news = scrape_news(mp_name, state_or_elec)
    print(f"{len(news)} headlines", end=" ")
    time.sleep(0.5)

    # 4. Social links
    social = scrape_social(mp_name, mp_id)

    # 5. AI synthesis
    print("Claude...", end=" ", flush=True)
    ai_bio = synthesise_bio(
        mp_name, mp_party or "", mp_chamber or "",
        state_or_elec or "",
        aph_data.get("aphBio", ""),
        wiki_data.get("wikiSummary", ""),
        aph_data.get("firstElected", ""),
        aph_data.get("portfolios", ""),
    )
    print(f"{'ok' if ai_bio else 'empty'}")
    time.sleep(0.5)

    # Merge all data
    profile = {
        "birthDate":    ai_bio.get("birthDate") or aph_data.get("birthDate", ""),
        "birthPlace":   ai_bio.get("birthPlace", ""),
        "education":    ai_bio.get("education", ""),
        "profession":   ai_bio.get("profession", ""),
        "hobbies":      ai_bio.get("hobbies", ""),
        "firstElected": aph_data.get("firstElected", ""),
        "portfolios":   aph_data.get("portfolios", ""),
        "committees":   aph_data.get("committees", ""),
        "shortBio":     ai_bio.get("shortBio", ""),
        "longBio":      ai_bio.get("longBio", ""),
        "aphBioUrl":    aph_data.get("aphBioUrl", ""),
        "newsHeadlines": json.dumps(news) if news else "[]",
        "socialLinks":   json.dumps(social) if social else "{}",
        "website":       social.get("website", ""),
    }

    # Upsert into MpProfile
    cur.execute("""
        INSERT INTO "MpProfile" (
            id, "electorateId", "birthDate", "birthPlace", "education", "profession",
            "hobbies", "firstElected", "portfolios", "committees",
            "shortBio", "longBio", "aphBioUrl", "newsHeadlines",
            "socialLinks", "website", "scrapedAt", "updatedAt"
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, NOW(), NOW()
        )
        ON CONFLICT ("electorateId") DO UPDATE SET
            "birthDate" = EXCLUDED."birthDate",
            "birthPlace" = EXCLUDED."birthPlace",
            "education" = EXCLUDED."education",
            "profession" = EXCLUDED."profession",
            "hobbies" = EXCLUDED."hobbies",
            "firstElected" = EXCLUDED."firstElected",
            "portfolios" = EXCLUDED."portfolios",
            "committees" = EXCLUDED."committees",
            "shortBio" = EXCLUDED."shortBio",
            "longBio" = EXCLUDED."longBio",
            "aphBioUrl" = EXCLUDED."aphBioUrl",
            "newsHeadlines" = EXCLUDED."newsHeadlines",
            "socialLinks" = EXCLUDED."socialLinks",
            "website" = EXCLUDED."website",
            "scrapedAt" = NOW(),
            "updatedAt" = NOW()
    """, (
        elec_id, elec_id,
        profile["birthDate"], profile["birthPlace"], profile["education"], profile["profession"],
        profile["hobbies"], profile["firstElected"], profile["portfolios"], profile["committees"],
        profile["shortBio"], profile["longBio"], profile["aphBioUrl"], profile["newsHeadlines"],
        profile["socialLinks"], profile["website"],
    ))
    conn.commit()
    cur.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--chamber", choices=["hor", "senate", "all"], default="all")
    parser.add_argument("--batch-start", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=999)
    parser.add_argument("--force", action="store_true", help="Re-scrape even if recent")
    args = parser.parse_args()

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    chamber_filter = ""
    if args.chamber == "hor":
        chamber_filter = "AND \"mpChamber\" = 'House of Reps'"
    elif args.chamber == "senate":
        chamber_filter = "AND \"mpChamber\" = 'Senate'"

    cur.execute(f"""
        SELECT id, "mpName", "mpId", "mpParty", "mpChamber",
               CASE WHEN "mpChamber" = 'Senate' THEN state ELSE name END as loc
        FROM "Electorate"
        WHERE "mpName" IS NOT NULL AND "mpName" != ''
        {chamber_filter}
        ORDER BY "mpChamber", "mpName"
        OFFSET %s LIMIT %s
    """, (args.batch_start, args.batch_size))

    rows = cur.fetchall()
    cur.close()
    print(f"Processing {len(rows)} MPs (batch {args.batch_start}:{args.batch_start+args.batch_size}, chamber={args.chamber})")

    for i, row in enumerate(rows):
        print(f"\n[{i+1}/{len(rows)}]", end="")
        try:
            process_mp(row, conn)
        except Exception as e:
            print(f"\n  ERROR: {e}")
        time.sleep(0.8)

    conn.close()
    print("\n\n=== Done ===")

if __name__ == "__main__":
    main()
