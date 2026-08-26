#!/bin/bash
# Sequential image search — captures stdout, 20s cooldown between calls
OUT=/tmp/catimg
mkdir -p $OUT

declare -A QUERIES=(
  ["cat-14"]="kitchen utensils cookware cooking tools"
  ["cat-6"]="home electrical appliances blender mixer kettle"
  ["cat-2"]="fitness waist support belt posture brace"
  ["cat-7"]="colorful kids toys collection"
  ["cat-13"]="hand tool set drill toolbox hardware"
  ["cat-5"]="electronics gadgets headphones smartwatch"
  ["cat-1"]="car interior accessories cleaning products"
  ["cat-8"]="home organization cleaning supplies household"
  ["cat-10"]="personal care grooming products"
  ["cat-11"]="first aid kit medical supplies"
)

for slug in cat-14 cat-6 cat-2 cat-7 cat-13 cat-5 cat-1 cat-8 cat-10 cat-11; do
  if [ -s "$OUT/$slug.url" ]; then echo "SKIP $slug"; continue; fi
  echo "--- $slug"
  z-ai image-search -q "${QUERIES[$slug]}" -c 3 --gl us --no-rank 2>/dev/null | \
    grep -o '"original_url": *"[^"]*"' | head -1 | sed 's/.*"original_url": *"//; s/"$//' > "$OUT/$slug.url"
  echo "  got: $(cat $OUT/$slug.url)"
  sleep 22
done
echo "=== SUMMARY ==="
for f in $OUT/*.url; do echo "$f → $(cat $f)"; done
