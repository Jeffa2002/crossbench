#!/usr/bin/env python3
"""
Crossbench Bill Enrichment v2
- Fetches full bill PDF text via pdftotext (using --compressed curl trick)
- Generates proper AI summary from full text (not just title)
- Scrapes APH page for description, revision count, committees, PDF URL
- Tracks lastCheckedAt, nextReviewAt, fullTextFetchedAt
- Idempotent: skips bills where fullText already fetched recently
"""
import urllib.request
import urllib.parse
import subprocess
import re
import json
import time
import sys
import os
import tempfile
from datetime import datetime, timedelta

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
DB_ENV = {"PGPASSWORD": "cb_prod_2026", "PATH": "/usr/bin:/bin:/usr/local/bin"}
FORCE = "--force" in sys.argv  # re-enrich even if already done

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-AU,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-site",
    "Referer": "https://www.aph.gov.au/",
}


def run_sql(sql, fetch=False):
    args = ["psql", "-h", "localhost", "-U", "crossbench", "-d", "crossbench"]
    if fetch:
        args += ["-t", "-A", "-F", "\t"]
    args += ["-c", sql]
    r = subprocess.run(args, env=DB_ENV, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"SQL error: {r.stderr[:200]}", file=sys.stderr)
    return r.stdout


def fetch_html(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="ignore")


def scrape_aph_page(aph_url):
    """Scrape APH bill page: description, PDF url, revision count, committees."""
    try:
        content = fetch_html(aph_url)
    except Exception as e:
        print(f"  APH fetch error: {e}", file=sys.stderr)
        return {}

    content_clean = re.sub(r'<script[^>]*>.*?</script>', '', content, flags=re.S)
    content_clean = re.sub(r'<style[^>]*>.*?</style>', '', content_clean, flags=re.S)

    # Official description
    description = None
    text_blocks = re.findall(r'<p[^>]*>([^<]{60,800})</p>', content_clean)
    for block in text_blocks:
        clean = re.sub(r'<[^>]+>', '', block).strip()
        if re.match(r'^(Amends?|Establishes?|Provides?|Introduces?|Creates?|Repeals?|Modifies?|Makes?|Enables?|Requires?|Implements?)', clean, re.I):
            description = clean
            break
    if not description:
        text = re.sub(r'<[^>]+>', ' ', content_clean)
        for line in [l.strip() for l in text.split('\n') if len(l.strip()) > 60]:
            if re.match(r'^(Amends?|Establishes?|Provides?|Introduces?|Creates?|Repeals?|Modifies?|Makes?|Enables?|Requires?|Implements?)', line, re.I):
                description = line
                break

    # PDF url — look for parlinfo download links
    pdf_url = None
    # Extract bId from aphUrl
    bid_match = re.search(r'bId=([^&"]+)', aph_url)
    if bid_match:
        bid = bid_match.group(1)
        # Find toc_pdf links in page
        pdf_links = re.findall(r'href="(https://parlinfo[^"]+toc_pdf[^"]+\.pdf[^"]*)"', content_clean)
        if not pdf_links:
            # Try without full URL
            pdf_links = re.findall(r'(parlInfo/download/legislation/bills/[^"]+toc_pdf[^"]+\.pdf[^"]*)', content_clean)
            pdf_links = [f"https://parlinfo.aph.gov.au/{l}" for l in pdf_links]
        if pdf_links:
            pdf_url = pdf_links[0]
            # Clean up any HTML entities
            pdf_url = pdf_url.replace("&amp;", "&")

    # Revision count
    revisions = 0
    if 'First reading' in content: revisions = max(revisions, 1)
    if 'Second reading' in content: revisions = max(revisions, 2)
    if 'Third reading' in content: revisions = max(revisions, 3)
    has_amendments = 'Schedules of amendment' in content or ('proposed amendments' in content.lower() and 'No proposed amendments' not in content)

    # Committee referrals
    committees = re.findall(
        r'(?:Referred to Committee|Considered by scrutiny committee)\s*\([^)]+\)[;:]?\s*([^;.\n<]{10,150})', content
    )
    committee_text = '; '.join(c.strip() for c in committees[:3]) if committees else None

    # Introduced date
    intro_match = re.search(r'(?:Introduced|First reading)[:\s]*(\d{1,2}/\d{1,2}/\d{4})', content, re.I)
    introduced_at = None
    if intro_match:
        try:
            introduced_at = datetime.strptime(intro_match.group(1), "%d/%m/%Y").isoformat()
        except:
            pass

    return {
        "description": description,
        "pdf_url": pdf_url,
        "revisions": revisions,
        "has_amendments": has_amendments,
        "committees": committee_text,
        "introduced_at": introduced_at,
    }


def fetch_pdf_text(pdf_url):
    """Fetch PDF via curl --compressed + pdftotext."""
    if not pdf_url:
        return None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            tmp_path = f.name

        curl_cmd = [
            "curl", "-s", "--compressed", "-L",
            "-A", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "-H", "Referer: https://www.aph.gov.au/",
            "-H", "Sec-Fetch-Dest: document",
            "-H", "Sec-Fetch-Mode: navigate",
            "-H", "Sec-Fetch-Site: same-site",
            "-o", tmp_path,
            pdf_url
        ]
        r = subprocess.run(curl_cmd, capture_output=True, timeout=30)
        if r.returncode != 0:
            return None

        # Check it's actually a PDF
        with open(tmp_path, "rb") as f:
            header = f.read(8)
        if b"%PDF" not in header:
            print(f"  Not a PDF (got: {header[:50]})", file=sys.stderr)
            os.unlink(tmp_path)
            return None

        # Extract text
        r2 = subprocess.run(["pdftotext", tmp_path, "-"], capture_output=True, text=True, timeout=30)
        os.unlink(tmp_path)
        text = r2.stdout.strip()
        return text if len(text) > 100 else None

    except Exception as e:
        print(f"  PDF fetch error: {e}", file=sys.stderr)
        return None


def build_pdf_url_from_bid(bid, content=""):
    """Try to construct a likely PDF URL from the bill ID."""
    # Pattern: https://parlinfo.aph.gov.au/parlInfo/download/legislation/bills/{bid}_first-reps/toc_pdf/{filename}.pdf
    # We need the filename. Let's try to find it in the APH page content.
    matches = re.findall(
        r'parlInfo/download/legislation/bills/([^"]+\.pdf)[^"]*', content
    )
    if matches:
        return f"https://parlinfo.aph.gov.au/parlInfo/download/legislation/bills/{matches[0]}"
    return None


def generate_ai_summary(title, full_text, description, sponsor, portfolio, chamber, status):
    """Generate AI summary using Claude Haiku. Uses full text if available."""
    if not ANTHROPIC_API_KEY:
        return None

    if full_text and len(full_text) > 200:
        # Use first ~4000 chars of full text (covers purpose + schedules outline)
        text_excerpt = full_text[:4000]
        prompt = f"""You are summarising an Australian parliamentary bill for everyday citizens on a civic tech platform called Crossbench.

Bill title: {title}
Chamber: {chamber}
Status: {status}
{f'Portfolio: {portfolio}' if portfolio else ''}
{f'Introduced by: {sponsor}' if sponsor else ''}

Full bill text (excerpt):
{text_excerpt}

Write a plain-English breakdown for regular Australians:
1. **What it does** — 2-3 sentences explaining the core change
2. **Why it matters** — 1-2 sentences on real-world impact
3. **Key details** — 2-3 specific provisions worth knowing (e.g. penalties, commencement dates, who's affected)

Be specific and factual. No jargon. No "This bill..." opener. Write like you're explaining it to a smart friend who doesn't follow parliament."""
    else:
        # Fallback to title + description only
        prompt = f"""You are summarising an Australian parliamentary bill for everyday citizens.

Title: {title}
{f'Official description: {description}' if description else ''}
{f'Portfolio: {portfolio}' if portfolio else ''}
Chamber: {chamber} | Status: {status}

Write a plain-English summary: what it does and why it matters. 3-4 sentences. No jargon. No "This bill..." opener."""

    payload = json.dumps({
        "model": "claude-haiku-4-5",
        "max_tokens": 400,
        "messages": [{"role": "user", "content": prompt}]
    }).encode()

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            resp = json.loads(r.read())
            return resp["content"][0]["text"].strip()
    except Exception as e:
        print(f"  AI error: {e}", file=sys.stderr)
        return None


def calc_next_review(status, has_amendments):
    """Calculate next review date based on bill status."""
    now = datetime.utcnow()
    active_statuses = ['Before Parliament', 'Before the Senate', 'Before the House', 'Second Reading']
    if any(s in status for s in active_statuses):
        return (now + timedelta(days=7)).isoformat()
    elif 'Committee' in status or has_amendments:
        return (now + timedelta(days=14)).isoformat()
    elif 'Passed' in status or 'Assented' in status:
        return (now + timedelta(days=90)).isoformat()
    else:
        return (now + timedelta(days=30)).isoformat()


def escape_sql(s):
    if not s:
        return ""
    return s.replace("'", "''").replace("\x00", "")


# ─── Main ────────────────────────────────────────────────────────────────────

print("Running bill enrichment v2...")
print(f"Force mode: {FORCE}")

# Add columns if needed
run_sql('ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "fullText" TEXT;')
run_sql('ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "fullTextFetchedAt" TIMESTAMP;')
run_sql('ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;')
run_sql('ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP;')
run_sql('ALTER TABLE "Bill" ADD COLUMN IF NOT EXISTS "nextReviewAt" TIMESTAMP;')

# Get bills due for review (or all if --force)
if FORCE:
    where = "TRUE"
else:
    where = '"nextReviewAt" IS NULL OR "nextReviewAt" <= NOW()'

result = subprocess.run(
    ["psql", "-h", "localhost", "-U", "crossbench", "-d", "crossbench",
     "-t", "-A", "-F", "\t", "-c",
     f'SELECT id, title, "aphUrl", "sponsorName", portfolio, chamber, status FROM "Bill" WHERE {where} ORDER BY "lastUpdatedAt" DESC;'],
    env=DB_ENV, capture_output=True, text=True
)

bills = []
for line in result.stdout.strip().split('\n'):
    if not line.strip():
        continue
    parts = line.split('\t')
    if len(parts) >= 7:
        bills.append({
            "id": parts[0], "title": parts[1], "aphUrl": parts[2],
            "sponsor": parts[3], "portfolio": parts[4], "chamber": parts[5], "status": parts[6]
        })

print(f"Bills to process: {len(bills)}")

for i, bill in enumerate(bills):
    print(f"\n[{i+1}/{len(bills)}] {bill['title'][:72]}...")

    # 1. Scrape APH page
    aph_data = scrape_aph_page(bill["aphUrl"])
    pdf_url = aph_data.get("pdf_url")
    print(f"  PDF URL: {pdf_url[:80] if pdf_url else 'not found'}")

    # 2. Fetch full bill text
    full_text = None
    if pdf_url:
        print("  Fetching PDF...")
        full_text = fetch_pdf_text(pdf_url)
        if full_text:
            print(f"  PDF text: {len(full_text)} chars extracted")
        else:
            print("  PDF extraction failed, will use description only")

    # 3. Generate AI summary
    ai_summary = generate_ai_summary(
        bill["title"], full_text,
        aph_data.get("description"), bill["sponsor"],
        bill["portfolio"], bill["chamber"], bill["status"]
    )
    if ai_summary:
        print(f"  AI summary: {len(ai_summary)} chars")

    # 4. Calculate next review
    next_review = calc_next_review(bill["status"], aph_data.get("has_amendments", False))
    now_iso = datetime.utcnow().isoformat()

    # 5. Build update fields
    desc_safe = escape_sql(aph_data.get("description") or "")
    ai_safe = escape_sql(ai_summary or "")
    text_safe = escape_sql((full_text or "")[:50000])  # cap at 50k chars
    pdf_safe = escape_sql(pdf_url or "")
    committees_safe = escape_sql(aph_data.get("committees") or "")
    revisions = aph_data.get("revisions", 0)
    has_amendments = "TRUE" if aph_data.get("has_amendments") else "FALSE"
    intro = aph_data.get("introduced_at")

    sql = f"""UPDATE "Bill" SET
        "aphDescription" = CASE WHEN '{desc_safe}' = '' THEN "aphDescription" ELSE '{desc_safe}' END,
        "aiSummary"      = CASE WHEN '{ai_safe}' = '' THEN "aiSummary" ELSE '{ai_safe}' END,
        "fullText"       = CASE WHEN '{text_safe[:20]}' = '' THEN "fullText" ELSE '{text_safe}' END,
        "fullTextFetchedAt" = {'NULL' if not full_text else f"'{now_iso}'"},
        "pdfUrl"         = CASE WHEN '{pdf_safe}' = '' THEN "pdfUrl" ELSE '{pdf_safe}' END,
        "revisionsCount" = {revisions},
        "hasAmendments"  = {has_amendments},
        "committees"     = CASE WHEN '{committees_safe}' = '' THEN "committees" ELSE '{committees_safe}' END,
        "lastCheckedAt"  = '{now_iso}',
        "nextReviewAt"   = '{next_review}'
        {f', "introducedAt" = \'{intro}\'' if intro else ''}
        WHERE id = '{bill["id"]}';"""

    run_sql(sql)
    time.sleep(0.8)

# Final stats
stats = run_sql("""
SELECT
  COUNT(*) as total,
  COUNT("aiSummary") as with_ai,
  COUNT("fullText") as with_full_text,
  COUNT("pdfUrl") as with_pdf_url,
  COUNT("nextReviewAt") as with_review_date
FROM "Bill";
""")
print(f"\n{'='*60}")
print("Enrichment complete!")
print(stats)
