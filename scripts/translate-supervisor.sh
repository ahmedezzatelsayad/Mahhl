#!/bin/bash
# Supervisor: keep translating until all products have nameEn.
cd /home/z/my-project
for i in $(seq 1 40); do
  REMAINING=$(node -e "
require('dotenv').config();
process.env.DATABASE_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.product.count({ where: { nameEn: null } }).then(async (c) => { console.log(c); await p.\$disconnect(); });
" 2>/dev/null)
  echo "[supervisor] round $i — remaining: $REMAINING"
  if [ "$REMAINING" = "0" ] || [ -z "$REMAINING" ]; then
    echo "[supervisor] COMPLETE"
    break
  fi
  node scripts/translate-products.js 2>&1 | tail -5
  sleep 3
done
