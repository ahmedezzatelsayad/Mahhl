#!/usr/bin/env python3
"""
Migrate admin API routes from adminOnly() (login-only) to
requirePermission() (role x module x level enforcement).

Rules:
- GET  -> level 'view'
- POST/PUT/PATCH/DELETE -> level 'manage'
- module comes from the per-file map below
- import line: adminOnly -> requirePermission (verifyAdmin kept only if still used)
"""
import re
from pathlib import Path

ROOT = Path('/home/z/my-project/src/app/api')

FILE_MODULE = {
    'admin/identity/route.ts': 'settings',
    'admin/reviews/route.ts': 'reviews',
    'admin/ga4/route.ts': 'facebook',
    'admin/shipping/route.ts': 'settings',
    'admin/top100/route.ts': 'top100',
    'admin/seo/route.ts': 'seo',
    'admin/products/route.ts': 'products',
    'admin/products/export/route.ts': 'products',
    'admin/products/[id]/route.ts': 'products',
    'admin/ai-settings/route.ts': 'settings',
    'admin/landing/route.ts': 'landing',
    'admin/landing/generate/route.ts': 'landing',
    'admin/orders/[id]/route.ts': 'orders',
    'admin/slider/route.ts': 'slider',
    'admin/slider/generate/route.ts': 'slider',
    'admin/slider/auto/route.ts': 'slider',
    'admin/facebook/route.ts': 'facebook',
    'admin/reports/route.ts': 'reports',
    'orders/route.ts': 'orders',
}

METHOD_RE = re.compile(r'export async function (GET|POST|PUT|PATCH|DELETE)\s*\(')

for rel, module in FILE_MODULE.items():
    f = ROOT / rel
    if not f.exists():
        print(f'SKIP (missing): {rel}')
        continue
    src = f.read_text(encoding='utf-8')
    if 'adminOnly(' not in src:
        print(f'SKIP (no adminOnly): {rel}')
        continue

    # locate method declarations with positions
    methods = [(m.start(), m.group(1)) for m in METHOD_RE.finditer(src)]

    # replace each adminOnly( occurrence with the right level
    out = []
    pos = 0
    for m in re.finditer(r'adminOnly\(', src):
        # enclosing method = last method decl before this call
        enclosing = None
        for (mp, name) in methods:
            if mp < m.start():
                enclosing = name
        level = 'view' if enclosing == 'GET' else 'manage'
        out.append(src[pos:m.start()])
        out.append(f"requirePermission(req, '{module}', '{level}',")
        pos = m.end()
    out.append(src[pos:])
    new_src = ''.join(out)

    # import fix
    if re.search(r'import\s*\{[^}]*adminOnly[^}]*\}\s*from\s*[\'"]@/lib/auth[\'"]', new_src):
        new_src = re.sub(r'adminOnly(\s*,\s*)', r'requirePermission\1', new_src, count=1)
        new_src = re.sub(r'(\{[^}]*?)\badminOnly\b', r'\1requirePermission', new_src, count=1)
        # dedupe if both were listed
        new_src = re.sub(r'requirePermission\s*,\s*requirePermission', 'requirePermission', new_src)
    else:
        # import line missing or different shape — insert one
        new_src = new_src.replace(
            "import type { NextRequest }",
            "import type { NextRequest }", 1)
        # add after first import line
        lines = new_src.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('import '):
                lines.insert(i + 1, "import { requirePermission } from '@/lib/auth';")
                break
        new_src = '\n'.join(lines)

    f.write_text(new_src, encoding='utf-8')
    n = len(re.findall(r'requirePermission\(req', new_src))
    print(f'OK: {rel}  module={module}  calls={n}')
