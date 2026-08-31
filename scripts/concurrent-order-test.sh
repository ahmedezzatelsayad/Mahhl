#!/bin/bash
# Concurrent order burst test — fires N parallel order POSTs and prints results.
PID="${1:-cmt9fi0jh042jmnm2rcv7usvy}"
N="${2:-7}"
BASE="http://localhost:3000"
OUTDIR=$(mktemp -d)

for i in $(seq 1 "$N"); do
  phone="5510040$i"
  curl -s -X POST "$BASE/api/orders" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"customerName\":\"سباق اختبار $i\",\"address\":\"الكويت - شارع اختبار $i\",\"governorate\":\"محافظة العاصمة\",\"paymentMethod\":\"cod\",\"items\":[{\"productId\":\"$PID\",\"quantity\":1}]}" \
    > "$OUTDIR/r$i.json" &
done
wait

ok=0; fail=0
for i in $(seq 1 "$N"); do
  status=$(python3 -c "
import json
d = json.load(open('$OUTDIR/r$i.json'))
if d.get('ok') or d.get('success'):
    o = d.get('order') or {}
    print('OK', o.get('orderNumber',''))
else:
    print('FAIL', str(d.get('error',''))[:70])
")
  echo "order $i: $status"
  case "$status" in OK*) ok=$((ok+1));; *) fail=$((fail+1));; esac
done
echo "=== success: $ok / fail: $fail (of $N) ==="
rm -rf "$OUTDIR"
