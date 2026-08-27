/**
 * deepseek.ts — DeepSeek API client (OpenAI-compatible).
 *
 * DeepSeek chat completions: POST https://api.deepseek.com/chat/completions
 * The founder pastes a paid API key in the admin AI page; it is stored in
 * SiteSetting (key "deepseek") and takes priority over the built-in
 * workspace SDK. Everything degrades gracefully without a key.
 */
import { db } from '@/lib/db';

export interface DeepSeekSettings {
  enabled: boolean;
  apiKey: string;
  model: string; // 'deepseek-chat' | 'deepseek-reasoner'
}

const SETTING_KEY = 'deepseek';
const API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_TIMEOUT_MS = 30000;

export async function getDeepSeekSettings(): Promise<DeepSeekSettings> {
  try {
    const row = await db.siteSetting.findUnique({ where: { key: SETTING_KEY } });
    if (row?.value) {
      const v = row.value as Record<string, unknown>;
      return {
        enabled: typeof v.enabled === 'boolean' ? v.enabled : !!v.apiKey,
        apiKey: String(v.apiKey || ''),
        model: String(v.model || 'deepseek-chat'),
      };
    }
  } catch {
    /* fall through */
  }
  return { enabled: false, apiKey: '', model: 'deepseek-chat' };
}

export async function saveDeepSeekSettings(
  partial: Partial<DeepSeekSettings>
): Promise<DeepSeekSettings> {
  const current = await getDeepSeekSettings();
  const next: DeepSeekSettings = {
    enabled: partial.enabled ?? current.enabled,
    apiKey: (partial.apiKey ?? current.apiKey).trim(),
    // presets kept, but custom model ids (e.g. future "deepseek-v4") allowed
    model: (partial.model ?? current.model).trim() || 'deepseek-chat',
  };
  if (!next.apiKey) next.enabled = false;
  await db.siteSetting.upsert({
    where: { key: SETTING_KEY },
    create: { key: SETTING_KEY, value: next as any },
    update: { value: next as any },
  });
  return next;
}

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResult {
  ok: boolean;
  content: string;
  error?: string;
}

/**
 * Call DeepSeek chat completion. Returns { ok, content }.
 * Throws never — errors are returned, not thrown.
 */
export async function deepSeekChat(
  messages: DeepSeekMessage[],
  opts: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    timeoutMs?: number;
    model?: string;
    /** DeepSeek V4 thinking control: 'low'|'medium'|'high' — 'low' keeps
     *  reasoning brief (seconds + few tokens) instead of burning the whole
     *  max_tokens budget on chain-of-thought before writing the answer. */
    reasoningEffort?: 'low' | 'medium' | 'high';
  } = {}
): Promise<DeepSeekResult> {
  const settings = await getDeepSeekSettings();
  if (!settings.enabled || !settings.apiKey) {
    return { ok: false, content: '', error: 'not-configured' };
  }
  // per-call model override (e.g. the Top-100 page forces the THINKING model)
  const model = opts.model || settings.model;
  const isThinking = /reasoner|thinking|v4/i.test(model);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        // reasoning models ignore temperature (API constraint) — omit it
        ...(isThinking ? {} : { temperature: opts.temperature ?? 0.7 }),
        max_tokens: opts.maxTokens ?? 2000,
        ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        // thinking budget control (DeepSeek V4) — default LOW so the model
        // answers in seconds instead of reasoning for a minute
        ...(isThinking ? { reasoning_effort: opts.reasoningEffort ?? 'low' } : {}),
      }),
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      return { ok: false, content: '', error: msg };
    }
    const content = data?.choices?.[0]?.message?.content || '';
    return { ok: !!content, content, error: content ? undefined : 'empty-response' };
  } catch (e: any) {
    const err = e?.name === 'AbortError' ? 'timeout' : e?.message || 'network';
    return { ok: false, content: '', error: err };
  } finally {
    clearTimeout(timer);
  }
}

/** Extract the first JSON object from an LLM response (handles ```json fences). */
export function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw;
  const objMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objMatch) return null;
  try {
    return JSON.parse(objMatch[0]) as T;
  } catch {
    return null;
  }
}
