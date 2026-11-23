#!/usr/bin/env node
/**
 * Canon eval for Legion's world-facing roles (evals/canon-qa.json).
 *
 *   node scripts/eval-canon.mjs --offline [path-or-url to lore-canon.json]
 *       Checks the eval set against the canon pack: every "fact" item's canonRef exists,
 *       and no expected answer names a held or unratified entry. No model calls.
 *   LEGION_EVAL_TOKEN=<name only, set in CI secrets> node scripts/eval-canon.mjs --live [--url https://ai.grudge-studio.com]
 *       Asks each question on /v1/agents/<role>/chat and scores the answers. Exit 1 below threshold.
 *
 * The token is read from the environment and never printed.
 */
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const evals = JSON.parse(readFileSync(new URL('../evals/canon-qa.json', import.meta.url), 'utf8'));

export function score(item, answer) {
  const a = String(answer || '').toLowerCase();
  const missing = item.mustInclude.filter((group) => !group.some((t) => a.includes(t.toLowerCase())));
  const banned = item.mustNotInclude.filter((t) => a.includes(t.toLowerCase()));
  return { pass: missing.length === 0 && banned.length === 0, missing, banned };
}

async function loadPack(src) {
  if (/^https?:/.test(src)) { const r = await fetch(src); if (!r.ok) throw new Error(`canon ${r.status}`); return r.json(); }
  return JSON.parse(readFileSync(src, 'utf8'));
}

async function offline() {
  const pack = await loadPack(arg('--offline', 'https://objectstore.grudge-studio.com/api/v1/lore-canon.json'));
  const all = [pack.world, ...(pack.gods || []), ...(pack.factions || []), ...(pack.races || []), ...(pack.classes || []), ...(pack.heroes || [])];
  const byUuid = new Map(all.filter(Boolean).map((e) => [e.uuid, e]));
  const hidden = [...(pack.unratified || []), ...(pack.heroes || []).filter((h) => h.status === 'held')]
    .map((e) => e.name.split(/[ ,]/)[0].toLowerCase());
  const problems = [];
  for (const it of evals.items) {
    if (it.canonRef && !byUuid.has(it.canonRef)) problems.push(`${it.id}: canonRef ${it.canonRef} not in pack`);
    for (const g of it.mustInclude) for (const t of g) if (hidden.includes(t.toLowerCase())) problems.push(`${it.id}: expects hidden entry "${t}"`);
  }
  console.log(`offline: ${evals.items.length} items, ${problems.length} problems`);
  problems.forEach((p) => console.log('  ' + p));
  process.exit(problems.length ? 1 : 0);
}

async function live() {
  const base = arg('--url', 'https://ai.grudge-studio.com').replace(/\/$/, '');
  const token = process.env.LEGION_EVAL_TOKEN;
  if (!token) { console.error('LEGION_EVAL_TOKEN is not set'); process.exit(2); }
  let passed = 0;
  for (const it of evals.items) {
    let answer = '';
    try {
      const r = await fetch(`${base}/v1/agents/${it.role}/chat`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: it.question, temperature: 0.2 }),
      });
      const j = await r.json().catch(() => ({}));
      answer = j.response || j.content || j.text || '';
      if (!r.ok) answer = '';
    } catch { answer = ''; }
    const s = score(it, answer);
    if (s.pass) passed++;
    console.log(`${s.pass ? 'PASS' : 'FAIL'} ${it.id}${s.missing.length ? ' missing=' + JSON.stringify(s.missing) : ''}${s.banned.length ? ' banned=' + JSON.stringify(s.banned) : ''}`);
  }
  const rate = passed / evals.items.length;
  console.log(`pass ${passed}/${evals.items.length} (${(rate * 100).toFixed(0)}%), threshold ${(evals.threshold * 100).toFixed(0)}%`);
  process.exit(rate >= evals.threshold ? 0 : 1);
}

if (args.includes('--live')) await live();
else if (args.includes('--offline')) await offline();
else { console.log('usage: --offline [lore-canon.json] | --live [--url URL]'); process.exit(2); }
