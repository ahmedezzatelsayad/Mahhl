#!/usr/bin/env python3
"""Scrape all product listing pages from ecomerg.com using BeautifulSoup for accurate parsing."""

import json
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen, Request

from bs4 import BeautifulSoup

BASE_URL = "https://ecomerg.com"
COOKIES = (
    "XSRF-TOKEN=eyJpdiI6ImJkbEd0VWxQdkVSTUlCOG56a0JyMVE9PSIsInZhbHVlIjoia21pWmh5dFdVQXB0RnlCNkRRNStmZnBPeHVwMHNqUGtZQWo3azNzL3hONzdrRmhGYVYyR0t0c1Y1Vkp4TXRtVi9YQkpnczNaNDRZVE5aSHVLeGVjakc2NVBNYUY1MUtoK0ljdHBXdDF3bklNL2NRVWlYaHQ2NFhpMk1ETHNmYXIiLCJtYWMiOiIyMmQ2MzQxNjVhYjFmNjZmNDRmMDYwN2IzNjRlNTFhMjMxMzJiNjg1MmE0NWNkMGQ4NzM3MzY5ZTNiOWU0ZmQ1IiwidGFnIjoiIn0%3D; "
    "ecomerg_session=eyJpdiI6Ijg2WnYwZCs5ZU9KUEkvcHo1bE5mYlE9PSIsInZhbHVlIjoiRDRmZ01xazRSNmtZK3JiY3hzY2pxMndRcGMxeERGa3A2ckYydkFtNkdRWlBMNUN5SGlFcUFOV3lVZEFDQ3Mzd3RZWUtLZzFIMzBHMlVrTW8wRVlsd3VXMUJ0SEVzN01DcGxqSVpEcDI1amNXc2x0RWdFYzIrRVlBcm13MDY3R3ciLCJtYWMiOiI5NDMyNTUwODQzZTFjOTIwNjZhMWQ1ZGRjYmU2YjJlMGE4YjlkMjNlYzNjOGU3NWMxMTU0NjY2ZjJiNTY0OGYwIiwidGFnIjoiIn0%3D"
)
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

PRODUCT_LINK_RE = re.compile(r"/product/(\d+)")


def fetch_page(url, retries=3, timeout=45):
    for attempt in range(retries):
        try:
            req = Request(url, headers={
                "User-Agent": USER_AGENT,
                "Cookie": COOKIES,
                "Referer": "https://ecomerg.com/products",
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


def parse_products_from_html(html, page_num):
    """Parse product cards from a listing page using BeautifulSoup."""
    soup = BeautifulSoup(html, "lxml")
    products = []

    # Each product is in a .team-item div
    cards = soup.select(".team-item")
    for card in cards:
        # Get product link and ID
        link = card.select_one("a[href*='/product/']")
        if not link:
            continue
        href = link.get("href", "")
        m = PRODUCT_LINK_RE.search(href)
        if not m:
            continue
        product_id = m.group(1)

        # Get image - first img inside .position-relative
        img = card.select_one(".position-relative img")
        image_url = img.get("src") if img else None

        # Get name and code
        name_tag = card.select_one("h6.product-name")
        code_tag = card.select_one("h6.product-code")
        name = name_tag.get_text(strip=True) if name_tag else None
        code_text = code_tag.get_text(strip=True) if code_tag else ""
        # Extract code from "الكود: toy0075" format
        code = None
        cm = re.search(r"الكود[:\s]*([a-zA-Z0-9\-]+)", code_text)
        if cm:
            code = cm.group(1).strip()

        # Get prices
        prices = card.select(".price")
        sale_price = prices[0].get_text(strip=True) if len(prices) >= 1 else None
        commission = prices[1].get_text(strip=True) if len(prices) >= 2 else None

        products.append({
            "id": int(product_id),
            "name": name,
            "code": code,
            "sale_price": sale_price,
            "commission": commission,
            "image_url": image_url,
            "product_url": f"https://ecomerg.com/product/{product_id}",
            "source_page": page_num,
        })

    return products


def scrape_page(page_num):
    url = f"{BASE_URL}/products?page={page_num}&currency="
    html = fetch_page(url)
    if not html:
        return page_num, []
    products = parse_products_from_html(html, page_num)
    return page_num, products


def main():
    TOTAL_PAGES = 53
    all_products = []
    print(f"Scraping {TOTAL_PAGES} pages of products...", flush=True)

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {executor.submit(scrape_page, p): p for p in range(1, TOTAL_PAGES + 1)}
        for fut in as_completed(futures):
            page_num, products = fut.result()
            all_products.extend(products)
            print(f"  Page {page_num}: {len(products)} products (total: {len(all_products)})", flush=True)

    # Deduplicate by ID
    seen = set()
    deduped = []
    for p in all_products:
        if p["id"] not in seen:
            seen.add(p["id"])
            deduped.append(p)
    all_products = deduped

    # Stats
    print(f"\nTotal unique products: {len(all_products)}", flush=True)
    with_name = sum(1 for p in all_products if p["name"])
    with_code = sum(1 for p in all_products if p["code"])
    with_img = sum(1 for p in all_products if p["image_url"])
    with_price = sum(1 for p in all_products if p["sale_price"])
    print(f"  with name: {with_name}", flush=True)
    print(f"  with code: {with_code}", flush=True)
    print(f"  with image: {with_img}", flush=True)
    print(f"  with price: {with_price}", flush=True)

    if all_products:
        print("\nSample product (first):")
        print(json.dumps(all_products[0], indent=2, ensure_ascii=False))
        print("\nSample product (last):")
        print(json.dumps(all_products[-1], indent=2, ensure_ascii=False))

    # Save raw scraped data
    with open("/home/z/my-project/download/ecomerg_products_raw.json", "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)
    print(f"\nSaved to /home/z/my-project/download/ecomerg_products_raw.json", flush=True)


if __name__ == "__main__":
    main()
