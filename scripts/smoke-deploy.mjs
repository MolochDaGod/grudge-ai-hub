#!/usr/bin/env node
/**
 * Post-deploy smoke for Legion + fleet AI-related hosts.
 * Usage: node scripts/smoke-deploy.mjs
 *        npm run smoke
 */
const URLS = [
  { url: 'https://ai.grudge-studio.com/health', expect: (j) => j?.ok || j?.status === 'ok' },
  {
    url: 'https://ai.grudge-studio.com/v1/context',
    expect: (j) =>
      j?.ok &&
      j?.one_truth?.puter_space &&
      j?.one_truth?.asset_serve?.host &&
      j?.ai_deployable,
  },
  { url: 'https://ai.grudge-studio.com/puter-space', expect: null, html: true },
  {
    url: 'https://ai.grudge-studio.com/v1/skills',
    expect: (j) => j?.ok && (j?.count ?? 0) >= 20,
  },
  {
    url: 'https://ai.grudge-studio.com/v1/ssot',
    expect: (j) => j?.ok && j?.context,
  },
  {
    url: 'https://forge.grudge-studio.com/api/free-ai/status',
    expect: (j) => j?.ok,
  },
  {
    url: 'https://puter.grudge-studio.com/api/health',
    expect: (j) => j?.ok,
  },
  { url: 'https://info.grudge-studio.com/docs', expect: null, html: true },
  { url: 'https://coder.grudge-studio.com/', expect: null, html: true },
  {
    url: 'https://objectstore.grudge-studio.com/api/v1/fleet-canonical.json',
    expect: (j) => j?.oneTruth || j?.version,
  },
];

let failed = 0;

for (const item of URLS) {
  try {
    const res = await fetch(item.url, {
      headers: { Accept: item.html ? 'text/html,*/*' : 'application/json' },
      redirect: 'follow',
    });
    const text = await res.text();
    let ok = res.ok;
    let detail = `HTTP ${res.status}`;
    if (ok && item.expect && !item.html) {
      try {
        const j = JSON.parse(text);
        ok = !!item.expect(j);
        detail = ok
          ? `ok version=${j.version ?? j.context_version ?? '?'}`
          : 'body check failed';
      } catch {
        ok = false;
        detail = 'invalid JSON';
      }
    } else if (ok && item.html) {
      detail = `html len=${text.length}`;
    }
    console.log(`${ok ? 'OK ' : 'FAIL'} ${item.url} — ${detail}`);
    if (!ok) failed++;
  } catch (e) {
    console.log(`FAIL ${item.url} — ${e.message}`);
    failed++;
  }
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll smoke checks passed');
process.exit(failed ? 1 : 0);
