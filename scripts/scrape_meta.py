#!/usr/bin/env python3
"""Scrape best-selling products and category list from ecomerg.com (updated for current page structure)."""

import json
import re
import sys
from urllib.request import urlopen, Request

from bs4 import BeautifulSoup

BASE_URL = "https://ecomerg.com"
COOKIES = (
    "XSRF-TOKEN=eyJpdiI6ImVPcXYxdTVaeUdxRzhwdk5zL05CQ0E9PSIsInZhbHVlIjoiNDhjYzNMc3JLV0RKdlFUdGRSWUhEUlJJQkhwTlRhSkpJWEJxbEFXYnA5MGdoTXU4bVlxcnZISHFlS0kzcXNFVEYxUTVHcFA0dXliV3N4WmVXdGUrNjVRTTFoeFNhbjA3NFlNYitIekowSTArMXc4SlR4YU1QQVVPUEZqQUt2NXYiLCJtYWMiOiI3NzkyYjMwNDA0ZDFiN2VkYzQwYzc1N2I3NjQ5Y2Q3MGFjY2M5YWUyZTFhMWZhMDU1ZmNmNzhlNTJhMjNmYTY1IiwidGFnIjoiIn0%3D; "
    "ecomerg_session=eyJpdiI6IjJsUGp6YUttNG9QbFBZWEgvWU9uUnc9PSIsInZhbHVlIjoiRjVPTCs2UXNQaEUram5nL2ZYNzlieUFQdUk1cHhlbm42eDZwRTRUK292a0laZnp4eDMveGIvTlNnbW5mVyszcTd3YzhVcE42TnRsQ2NpUHc3QWtOcFEvTHVzbzVDa2JEbEc1L3VVTXR1a0tOVjNaakJsTEN0ZTdQT3lLTmg0TDAiLCJtYWMiOiIzMzY1NjJmMjg5NGM5ZDVlYWYxYjgwN2JiYmE1YWRjYjBmNDRlZjgzNzJmN2IxZThmMWUwYmYyYzI0MTU0ZDk2IiwidGFnIjoiIn0%3D"
)
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
PRODUCT_LINK_RE = re.compile(r"/product/(\d+)")


def fetch_page(url, retries=3, timeout=45):
    for attempt in range(retries):
        try:
            req = Request(url, headers={
                "User-Agent": USER_AGENT,
                "Cookie": COOKIES,
                "Referer": "https://ecomerg.com/affiliate/home",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "ar,en;q=0.9",
            })
            with urlopen(req, timeout=timeout) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:
            if attempt == retries - 1:
                print(f"Failed: {url} - {e}", file=sys.stderr)
                return None
    return None


def parse_best_seller_card(card):
    """Parse a best-seller card (different structure from regular product card)."""
    link = card.select_one("a[href*='/product/']")
    if not link:
        return None
    href = link.get("href", "")
    m = PRODUCT_LINK_RE.search(href)
    if not m:
        return None
    product_id = int(m.group(1))

    # Image - look in .position-relative or first img in card
    img = card.select_one(".position-relative img") or card.find("img")
    image_url = img.get("src") if img else None
    # Best seller page uses alt as the name source
    image_alt = img.get("alt", "").strip() if img else ""

    # Get name from h6 (no class on best-sellers page) or fallback to image alt
    name_tag = card.select_one("h6.product-name") or card.select_one(".card-info h6") or card.find("h6")
    name = name_tag.get_text(strip=True) if name_tag else image_alt

    # No code on best-sellers page - will be looked up from product list later
    code = None

    prices = card.select(".price")
    sale_price = prices[0].get_text(strip=True) if len(prices) >= 1 else None
    commission = prices[1].get_text(strip=True) if len(prices) >= 2 else None

    return {
        "id": product_id,
        "code": code,
        "name": name,
        "sale_price": sale_price,
        "commission": commission,
        "image_url": image_url,
        "product_url": f"https://ecomerg.com/product/{product_id}",
    }


def scrape_best_sellers():
    print("Scraping best-sellers page...", flush=True)
    url = f"{BASE_URL}/best-products?currency="
    html = fetch_page(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")
    cards = soup.select(".team-item")
    print(f"  Found {len(cards)} cards", flush=True)
    products = []
    for card in cards:
        p = parse_best_seller_card(card)
        if p:
            products.append(p)
    seen = set()
    deduped = []
    for p in products:
        if p["id"] not in seen:
            seen.add(p["id"])
            deduped.append(p)
    print(f"  Returning {len(deduped)} unique best sellers", flush=True)
    return deduped


def scrape_categories_from_dropdown():
    """Get full category list from the products page dropdown."""
    print("Scraping categories dropdown...", flush=True)
    url = f"{BASE_URL}/products?currency="
    html = fetch_page(url)
    if not html:
        return []
    soup = BeautifulSoup(html, "lxml")

    categories = []
    seen_keys = set()

    # Find the category select - first one with category_id options
    for select in soup.find_all("select"):
        for opt in select.find_all("option"):
            val = opt.get("value", "").strip()
            text = opt.get_text(strip=True)
            if not val or not text:
                continue
            # Only keep category links
            if "category_id=" not in val:
                continue
            # Parse category/sub
            cat_m = re.search(r"category_id=(\d+)", val)
            sub_m = re.search(r"sub=(\d+)", val)
            cat_id = cat_m.group(1) if cat_m else ""
            sub_id = sub_m.group(1) if sub_m else ""
            key = (cat_id, sub_id)
            if key in seen_keys:
                continue
            seen_keys.add(key)
            categories.append({
                "id": cat_id,
                "sub_id": sub_id,
                "name": text,
                "url": val if val.startswith("http") else BASE_URL + val,
                "is_subcategory": bool(sub_id),
            })
    print(f"  Found {len(categories)} categories (main + sub)", flush=True)
    return categories


def main():
    best_sellers = scrape_best_sellers()
    categories = scrape_categories_from_dropdown()

    # Enrich best sellers with code from previously scraped data
    try:
        with open("/home/z/my-project/download/ecomerg_products_raw.json", encoding="utf-8") as f:
            scraped = json.load(f)
        # Build id -> code, name, image, price map
        id_map = {p["id"]: p for p in scraped}
        for bs in best_sellers:
            if bs["id"] in id_map:
                ref = id_map[bs["id"]]
                if not bs["code"]:
                    bs["code"] = ref.get("code")
                if not bs["name"]:
                    bs["name"] = ref.get("name")
                if not bs["image_url"]:
                    bs["image_url"] = ref.get("image_url")
                if not bs["sale_price"]:
                    bs["sale_price"] = ref.get("sale_price")
                if not bs["commission"]:
                    bs["commission"] = ref.get("commission")
    except Exception as e:
        print(f"Warning: could not enrich best sellers: {e}", file=sys.stderr)

    output = {
        "best_sellers": best_sellers,
        "categories": categories,
    }
    with open("/home/z/my-project/download/ecomerg_meta.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"\nBest sellers ({len(best_sellers)}):", flush=True)
    for bs in best_sellers[:5]:
        print(f"  - ID {bs['id']} | {bs.get('code')} | {bs.get('name', '')[:60]}", flush=True)
    print(f"\nCategories ({len(categories)}):", flush=True)
    for c in categories[:5]:
        print(f"  - {c}", flush=True)


if __name__ == "__main__":
    main()
