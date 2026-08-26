import { NextRequest, NextResponse } from 'next/server';
import { adminOnly } from '@/lib/auth';
import {
  getDeepSeekSettings,
  saveDeepSeekSettings,
  deepSeekChat,
} from '@/lib/deepseek';

/**
 * GET /api/admin/ai-settings — DeepSeek settings (admin-guarded)
 */
export async function GET(req: NextRequest) {
  return adminOnly(req, async () => {
    const s = await getDeepSeekSettings();
    return NextResponse.json(s);
  });
}

/**
 * PUT /api/admin/ai-settings — save DeepSeek settings
 * Body: { enabled?, apiKey?, model? }
 */
export async function PUT(req: NextRequest) {
  return adminOnly(req, async () => {
    const body = await req.json().catch(() => ({}));
    const next = await saveDeepSeekSettings({
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      apiKey: typeof body.apiKey === 'string' ? body.apiKey : undefined,
      model: typeof body.model === 'string' ? body.model : undefined,
    });
    return NextResponse.json({ ok: true, settings: next });
  });
}

/**
 * POST /api/admin/ai-settings — test the key with a tiny completion
 */
export async function POST(req: NextRequest) {
  return adminOnly(req, async () => {
    const res = await deepSeekChat(
      [{ role: 'user', content: 'قل: تم' }],
      { maxTokens: 8, temperature: 0 }
    );
    return NextResponse.json({
      ok: res.ok,
      error: res.error,
      reply: res.content.slice(0, 100),
    });
  });
}

export const dynamic = 'force-dynamic';
