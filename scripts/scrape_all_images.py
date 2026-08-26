#!/usr/bin/env python3
"""Scrape all product images - resilient version with incremental save."""

import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

from bs4 import BeautifulSoup

BASE_URL = "https://ecomerg.com"
COOKIES = (
    "XSRF-TOKEN=eyJpdiI6IkhCZXZvRCtFRDFmc1lWMWt2M1kwdGc9PSIsInZhbHVlIjoiMFVudlVVRno5Tkc3dFpLTnJzUzR1dTk2bG9hMEkwSnhNNmR5SWJlWlVHc2V5VmMwRVVVZlAvQkVnTDhtd0pxRldDMTRleHROeXdjUmhpV0I5TlVDZ3BxbVZQRHZxNis5V2J6UHN1QnVnZHlnbXVzSlo2N05ETHNJRWRURVovL0wiLCJtYWMiOiIzZDFlNTQyOTczNDkzYWRiZjAzNzlhMmMzNTRiYzBlMWE5YWZjYmE0ZGMwZTY5ZjQxMmVhMWMxZWFhYTNkMzk1IiwidGFnIjoiIn0%3D; "
    "ecomerg_session=eyJpdiI6IlVPendsNmVOSDd4UDRTTGw5emx1REE9PSIsInZhbHVlIjoiNzJYbVpTQzE0bzN0WTE2Wm5UYTNDOFRrYUxzQkxUeWd0YTNwN0dSenFVNzl5dkpUb3h2L1BQZERoRktqS2hWWmYwbW1lRzRvQ0p5a1Ryc3BJbXhydEVNZWJXK3lmT2haL3Z6TmRvd2JxTUtSd3pvNG1CT2Uwa2d1ZXFGNkM4WTIiLCJtYWMiOiJmMmNjZDIyMDkwOTc0OWJkYzE3YzZmNTdiNmZmMTI2MTM4NTFhNTAxZjFjNmQwMTk1NTVhZmMwZjc3YTdlMjdkIiwidGFnIjoiIn0%3D"
)
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

OUTPUT_FILE = "/home/z/my-project/download/ecomerg_product_images.json"
PROGRESS_FILE = "/home/z/my-project/download/ecomerg_product_images_progress.json"


def fetch_page(url, retries=2, timeout=20):
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
        except (HTTPError, URLError, TimeoutError, Exception) as e:
            if attempt == retries - 1:
                return None
            time.sleep(0.5)
    return None


def scrape_product_images(product_id):
    """Fetch a single product page and extract main product images only."""
    url = f"{BASE_URL}/product/{product_id}?color=8&currency="
    html = fetch_page(url)
    if not html:
        return product_id, []
    soup = BeautifulSoup(html, "lxml")

    images = []
    seen = set()

    # Main product images live inside .thumbnail and .slide containers
    for container_class in ["thumbnail", "slide"]:
        for container in soup.select(f".{container_class}"):
            for img in container.find_all("img"):
                src = (img.get("src") or "").strip()
                if not src or "uploads/products_images" not in src:
                    continue
                if src in seen:
                    continue
                seen.add(src)
                images.append(src)

    # Fallback: exclude images inside .team-item (related products)
    if not images:
        for img in soup.find_all("img"):
            src = (img.get("src") or "").strip()
            if not src or "uploads/products_images" not in src:
                continue
            in_team_item = False
            for parent in img.parents:
                cls = parent.get("class") or []
                if "team-item" in cls:
                    in_team_item = True
                    break
            if in_team_item:
                continue
            if src not in seen:
                seen.add(src)
                images.append(src)

    return product_id, images


def load_existing():
    """Load previously saved image map for resume."""
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return {int(k): v for k, v in data.items()}
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, encoding="utf-8") as f:
            data = json.load(f)
        return {int(k): v for k, v in data.items()}
    return {}


def save_progress(image_map):
    """Save current progress to file."""
    tmp = OUTPUT_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({str(k): v for k, v in image_map.items()}, f, ensure_ascii=False)
    os.replace(tmp, PROGRESS_FILE)


def main():
    with open("/home/z/my-project/download/ecomerg_products_raw.json", encoding="utf-8") as f:
        products = json.load(f)
    product_ids = [p["id"] for p in products]

    # Load existing progress
    image_map = load_existing()
    already_done = set(image_map.keys())
    to_scrape = [pid for pid in product_ids if pid not in already_done]

    print(f"Total products: {len(product_ids)}", flush=True)
    print(f"Already scraped: {len(already_done)}", flush=True)
    print(f"To scrape: {len(to_scrape)}", flush=True)

    if not to_scrape:
        print("All done already.", flush=True)
    else:
        completed = 0
        total_images = sum(len(v) for v in image_map.values())
        save_every = 100  # save progress every 100 products

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(scrape_product_images, pid): pid for pid in to_scrape}
            for fut in as_completed(futures):
                pid = futures[fut]
                try:
                    product_id, images = fut.result()
                    image_map[product_id] = images
                    total_images += len(images)
                except Exception as e:
                    print(f"Error for product {pid}: {e}", file=sys.stderr)
                    image_map[pid] = []
                completed += 1
                if completed % 50 == 0:
                    print(f"  Progress: {completed}/{len(to_scrape)} | total: {len(image_map)}/{len(product_ids)} | images: {total_images} | avg: {total_images/len(image_map):.1f}/product", flush=True)
                if completed % save_every == 0:
                    save_progress(image_map)

    # Final save
    save_progress(image_map)
    # Rename to final filename
    if os.path.exists(PROGRESS_FILE):
        os.replace(PROGRESS_FILE, OUTPUT_FILE)

    # Print stats
    img_counts = [len(v) for v in image_map.values()]
    print(f"\nFinal stats:", flush=True)
    print(f"  Total products: {len(image_map)}", flush=True)
    print(f"  Total images: {sum(img_counts)}", flush=True)
    print(f"  Avg images per product: {sum(img_counts)/len(image_map):.1f}", flush=True)
    print(f"  Products with 0 images: {img_counts.count(0)}", flush=True)
    print(f"  Products with 1 image:   {img_counts.count(1)}", flush=True)
    print(f"  Products with 2-3 images: {sum(1 for c in img_counts if 2 <= c <= 3)}", flush=True)
    print(f"  Products with 4-5 images: {sum(1 for c in img_counts if 4 <= c <= 5)}", flush=True)
    print(f"  Products with 6+ images: {sum(1 for c in img_counts if c >= 6)}", flush=True)
    print(f"\nSaved to {OUTPUT_FILE}", flush=True)


if __name__ == "__main__":
    main()
