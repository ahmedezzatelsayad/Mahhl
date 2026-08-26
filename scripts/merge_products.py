#!/usr/bin/env python3
"""Merge scraped product data with CSV export data to create final JSON."""

import csv
import json
import re

CSV_PATH = "/home/z/my-project/download/ecomerg_export.csv"
RAW_PATH = "/home/z/my-project/download/ecomerg_products_raw.json"
OUTPUT_PATH = "/home/z/my-project/download/ecomerg_products.json"


def parse_price(text):
    """Parse price string like '6 دينار كويتي' to extract numeric value and currency."""
    if not text:
        return None
    m = re.search(r"(\d+(?:\.\d+)?)", text)
    if not m:
        return None
    return {
        "value": float(m.group(1)),
        "currency": "KWD",
        "currency_ar": "دينار كويتي",
        "text": text.strip(),
    }


def main():
    # Load CSV data, indexed by product code
    csv_data = {}
    with open(CSV_PATH, encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            code = (row.get("كود المنتج") or "").strip()
            if not code:
                continue
            csv_data[code] = {
                "image_filename": (row.get("صورة المنتج") or "").strip(),
                "description": (row.get("وصف المنتج") or "").strip(),
                "main_category": (row.get("القسم الرئيسي") or "").strip(),
                "sub_category": (row.get("القسم الفرعي") or "").strip(),
                "supplier": (row.get("المورد") or "").strip(),
                "colors": (row.get("الألوان") or "").strip(),
                "sizes": (row.get("المقاسات") or "").strip(),
            }
    print(f"Loaded {len(csv_data)} products from CSV")

    # Load scraped data
    with open(RAW_PATH, encoding="utf-8") as f:
        scraped = json.load(f)
    print(f"Loaded {len(scraped)} products from scrape")

    # Build full product list, merging CSV data by product code
    final = []
    unmatched_codes = []
    for p in scraped:
        code = p.get("code", "")
        csv_info = csv_data.get(code, {})

        if not csv_info:
            unmatched_codes.append(code)

        # Determine final image URL — use the scraped one (which contains the
        # correct product ID directory) but fall back to constructing from CSV
        # filename + product ID if the scraped image URL is missing/odd.
        image_url = p.get("image_url")
        if not image_url and csv_info.get("image_filename"):
            image_url = f"https://ecomerg.com/uploads/products_images/{p['id']}/{csv_info['image_filename']}"

        product = {
            "id": p["id"],
            "code": p.get("code"),
            "name": p.get("name"),
            "description": csv_info.get("description", ""),
            "sale_price": parse_price(p.get("sale_price")),
            "commission": parse_price(p.get("commission")),
            "main_category": csv_info.get("main_category", ""),
            "sub_category": csv_info.get("sub_category", ""),
            "supplier": csv_info.get("supplier", ""),
            "colors": csv_info.get("colors", ""),
            "sizes": csv_info.get("sizes", ""),
            "image_url": image_url,
            "product_url": p.get("product_url"),
        }
        final.append(product)

    print(f"\nMerge results:")
    print(f"  Total products: {len(final)}")
    print(f"  Matched with CSV: {len(final) - len(unmatched_codes)}")
    print(f"  Unmatched (no CSV data): {len(unmatched_codes)}")
    if unmatched_codes:
        print(f"  Sample unmatched codes: {unmatched_codes[:10]}")

    # Sort by product ID descending (newest first, matches website)
    final.sort(key=lambda x: x["id"], reverse=True)

    # Save final JSON
    output = {
        "source": "https://ecomerg.com",
        "scraped_at": "2026-08-25",
        "total_products": len(final),
        "currency": "KWD (دينار كويتي)",
        "products": final,
    }
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nSaved final JSON to {OUTPUT_PATH}")
    print(f"File size: {round(len(json.dumps(output, ensure_ascii=False)) / 1024 / 1024, 2)} MB")

    # Show sample
    print("\nSample (first product):")
    print(json.dumps(final[0], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
