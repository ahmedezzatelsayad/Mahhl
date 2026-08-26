import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo';

/**
 * robots.txt — open to search engines AND generative-AI crawlers.
 * Being explicit about AI user-agents increases the chance LLM-based
 * search assistants (ChatGPT Search, Perplexity, Claude…) cite the store.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      {
        // OpenAI — ChatGPT Search / GPTBot / o1 browsing
        userAgent: ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User'],
        allow: '/',
      },
      {
        // Anthropic — Claude
        userAgent: ['ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai'],
        allow: '/',
      },
      {
        // Perplexity
        userAgent: ['PerplexityBot', 'Perplexity-User'],
        allow: '/',
      },
      {
        // Google AI / Gemini & others
        userAgent: ['Google-Extended', 'Googlebot', 'Bingbot', 'Applebot-Extended', 'Amazonbot'],
        allow: '/',
      },
      {
        // Meta AI, Cohere, DuckAssist, Common Crawl, ByteDance
        userAgent: [
          'meta-externalagent',
          'FacebookBot',
          'cohere-ai',
          'DuckAssistBot',
          'CCBot',
          'Bytespider',
        ],
        allow: '/',
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
