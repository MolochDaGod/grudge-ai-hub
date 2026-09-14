/**
 * ICON-* PNG review — uses ObjectStore icon-search-index + R2 CDN.
 * D1 stores review rows only (index). Binaries stay on assets.grudge-studio.com.
 * PK = ICON-XXXX-XXXX-XXXX (deterministic sha1 of r2Key — never mint a second id).
 */
import { DEFAULT_GEMINI_MODEL, runWorkersAi } from './aiRunner.js';

export const ICON_INFO = 'https://info.grudge-studio.com';
export const ICON_CDN = 'https://assets.grudge-studio.com';
export const ICON_UUID_RE = /^ICON-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const MAX_PNG_BYTES = 512 * 1024;
const MAX_STREAM = 8;
const SEARCH_TTL_MS = 60 * 60 * 1000;

let searchMemo = { at: 0, data: null };

const REVIEW_SYSTEM = `You review Grudge Studio game PNG icons. Return ONLY compact JSON:
{"look":"what the picture shows","name_match":"match|mismatch|unclear","quality":"ok|low|broken","issues":["..."]}
name_match=match when the image clearly is the catalog name/category (sword looks like a sword).
mismatch when filename says fireball but the art is a potion, blank, emoji, photo, or watermark.
quality=broken if empty/corrupt; low if muddy or unreadable at 32px. Never invent a new UUID.`;

function bytesToB64(bytes) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function isPng(bytes) {
  if (!bytes || bytes.length < 8) return false;
  return PNG_MAGIC.every((b, i) => bytes[i] === b);
}

function looksHtml(bytes) {
  if (!bytes?.length) return true;
  const head = String.fromCharCode(...bytes.subarray(0, Math.min(64, bytes.length))).trimStart();
  return head.startsWith('<') || head.startsWith('{') || /<!doctype html/i.test(head);
}

async function loadSearchIndex(env) {
  if (searchMemo.data && Date.now() - searchMemo.at < SEARCH_TTL_MS) return searchMemo.data;
  try {
    const kv = env.KV ? await env.KV.get('icon-search-index', 'json') : null;
    if (kv?.icons?.length) {
      searchMemo = { at: Date.now(), data: kv };
      return kv;
    }
  } catch {
    /* miss */
  }
  const res = await fetch(`${ICON_INFO}/api/v1/icon-search-index.json`, {
    cf: { cacheTtl: 3600, cacheEverything: true },
  });
  if (!res.ok) throw new Error(`icon-search-index ${res.status}`);
  const data = await res.json();
  searchMemo = { at: Date.now(), data };
  try {
    await env.KV?.put('icon-search-index', JSON.stringify(data), { expirationTtl: 3600 });
  } catch {
    /* optional */
  }
  return data;
}

function rowToIcon(row) {
  const [u, n, p, cat, sub, c] = row;
  return {
    grudgeUuid: u,
    name: n,
    iconPath: p,
    category: cat,
    subcategory: sub || null,
    cdnUrl: c,
  };
}

export async function findIcon(env, uuid) {
  const id = String(uuid || '').toUpperCase();
  if (!ICON_UUID_RE.test(id)) return null;
  const idx = await loadSearchIndex(env);
  const hit = (idx.icons || []).find((r) => String(r[0]).toUpperCase() === id);
  return hit ? rowToIcon(hit) : null;
}

export async function listIconsForReview(env, { category, cursor, limit } = {}) {
  const idx = await loadSearchIndex(env);
  const cap = Math.min(Math.max(Number(limit) || 5, 1), MAX_STREAM);
  const cat = category ? String(category).toLowerCase() : '';
  const after = cursor ? String(cursor).toUpperCase() : '';
  const out = [];
  for (const row of idx.icons || []) {
    const ic = rowToIcon(row);
    if (cat && ic.category !== cat) continue;
    if (after && ic.grudgeUuid.toUpperCase() <= after) continue;
    out.push(ic);
    if (out.length >= cap) break;
  }
  return out;
}

async function fetchPng(cdnUrl) {
  const res = await fetch(cdnUrl, {
    headers: { Accept: 'image/png,image/webp,image/*' },
    cf: { cacheTtl: 86400 },
  });
  const ctype = (res.headers.get('content-type') || '').toLowerCase();
  const buf = new Uint8Array(await res.arrayBuffer());
  if (!res.ok) {
    return { ok: false, quality: 'broken', issues: [`HTTP ${res.status}`], bytes: buf };
  }
  if (ctype.includes('html') || looksHtml(buf) || !isPng(buf)) {
    return {
      ok: false,
      quality: 'html_fake',
      issues: ['CDN body is not a PNG (HTML fallback or wrong MIME)'],
      bytes: buf,
      contentType: ctype,
    };
  }
  if (buf.length > MAX_PNG_BYTES) {
    return { ok: false, quality: 'low', issues: [`PNG larger than ${MAX_PNG_BYTES} bytes`], bytes: buf };
  }
  return { ok: true, bytes: buf, contentType: ctype || 'image/png' };
}

function parseModelJson(text) {
  if (!text) return null;
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

async function visionReview(env, icon, pngB64, mimeType) {
  const question = `Catalog name: ${icon.name}
Category: ${icon.category}${icon.subcategory ? '/' + icon.subcategory : ''}
Path: ${icon.iconPath}
UUID: ${icon.grudgeUuid}
Does this PNG match the name and category?`;

  try {
    const aiRun = await runWorkersAi(env, env.DEFAULT_AI_MODEL || DEFAULT_GEMINI_MODEL, {
      contents: [
        {
          role: 'user',
          parts: [
            { text: question },
            { inlineData: { mimeType: mimeType || 'image/png', data: pngB64 } },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: REVIEW_SYSTEM }] },
      generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
    });
    const parsed = parseModelJson(aiRun.text) || {
      look: String(aiRun.text || '').slice(0, 400),
      name_match: 'unclear',
      quality: 'ok',
      issues: ['model did not return JSON'],
    };
    return { ...parsed, model: aiRun.model, provider: aiRun.provider };
  } catch (err) {
    return {
      look: '',
      name_match: 'unclear',
      quality: 'broken',
      issues: [err.message],
      model: 'none',
      provider: 'none',
    };
  }
}

async function upsertReview(env, row) {
  if (!env.DB) return;
  await env.DB.prepare(
    `INSERT INTO icon_reviews (
      grudge_uuid, r2_key, icon_path, name, category, cdn_url,
      look, name_match, quality, issues, model, reviewed_at, version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 1)
    ON CONFLICT(grudge_uuid) DO UPDATE SET
      r2_key=excluded.r2_key,
      icon_path=excluded.icon_path,
      name=excluded.name,
      category=excluded.category,
      cdn_url=excluded.cdn_url,
      look=excluded.look,
      name_match=excluded.name_match,
      quality=excluded.quality,
      issues=excluded.issues,
      model=excluded.model,
      reviewed_at=datetime('now'),
      version=icon_reviews.version + 1`,
  )
    .bind(
      row.grudgeUuid,
      row.r2Key || '',
      row.iconPath || '',
      row.name || '',
      row.category || '',
      row.cdnUrl || '',
      row.look || '',
      row.name_match || 'unclear',
      row.quality || 'ok',
      JSON.stringify(row.issues || []),
      row.model || '',
    )
    .run();
}

export async function reviewOneIcon(env, icon) {
  const png = await fetchPng(icon.cdnUrl);
  const r2Key = String(icon.cdnUrl || '').replace(/^https?:\/\/assets\.grudge-studio\.com\//, '');
  if (!png.ok) {
    const row = {
      ...icon,
      r2Key,
      look: '',
      name_match: 'unclear',
      quality: png.quality,
      issues: png.issues,
      model: 'magic-bytes',
    };
    await upsertReview(env, row);
    return row;
  }
  const vis = await visionReview(env, icon, bytesToB64(png.bytes), png.contentType);
  const row = {
    ...icon,
    r2Key,
    look: vis.look || '',
    name_match: vis.name_match || 'unclear',
    quality: vis.quality || 'ok',
    issues: vis.issues || [],
    model: vis.model,
    provider: vis.provider,
  };
  await upsertReview(env, row);
  return row;
}

export async function handleIconLookup(url, env) {
  const parts = url.pathname.split('/').filter(Boolean);
  const uuid = parts[2];
  if (!uuid || uuid === 'reviews') return null;
  const icon = await findIcon(env, uuid);
  if (!icon) return jsonErr('Unknown ICON UUID — use icon-search-index / resolveIconUrl', 404);
  let review = null;
  try {
    review = await env.DB.prepare('SELECT * FROM icon_reviews WHERE grudge_uuid = ?')
      .bind(icon.grudgeUuid)
      .first();
  } catch {
    review = null;
  }
  return jsonOk({
    ok: true,
    icon,
    review,
    law: 'ICON-* is sha1(grudge-asset:{r2Key}). Do not mint a second id. D1 = review index only.',
  });
}

export async function handleIconReviewsList(url, env) {
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 100);
  const cursor = url.searchParams.get('cursor') || '';
  const category = url.searchParams.get('category') || '';
  const match = url.searchParams.get('name_match') || '';
  let sql = 'SELECT * FROM icon_reviews WHERE 1=1';
  const binds = [];
  if (category) {
    sql += ' AND category = ?';
    binds.push(category);
  }
  if (match) {
    sql += ' AND name_match = ?';
    binds.push(match);
  }
  if (cursor) {
    sql += ' AND grudge_uuid > ?';
    binds.push(cursor.toUpperCase());
  }
  sql += ' ORDER BY grudge_uuid LIMIT ?';
  binds.push(limit);
  try {
    const { results } = await env.DB.prepare(sql)
      .bind(...binds)
      .all();
    const rows = results || [];
    return jsonOk({
      ok: true,
      count: rows.length,
      nextCursor: rows.length === limit ? rows[rows.length - 1].grudge_uuid : null,
      reviews: rows,
    });
  } catch (err) {
    return jsonErr(`icon_reviews missing or D1 error: ${err.message}`, 503);
  }
}

export async function handleIconReviewPost(request, env, auth, requestId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonErr('Invalid JSON', 400);
  }
  const uuid = body.grudgeUuid || body.uuid || body.iconUuid;
  if (!uuid) return jsonErr('Provide grudgeUuid (ICON-XXXX-XXXX-XXXX)', 400);
  const icon = await findIcon(env, uuid);
  if (!icon) return jsonErr('ICON UUID not in icon-search-index', 404);
  const row = await reviewOneIcon(env, icon);
  return jsonOk({ ok: true, request_id: requestId, reviewer: auth?.name || null, review: row });
}

export function handleIconReviewStream(request, env, auth, requestId) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      try {
        let body = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const uuids = Array.isArray(body.uuids) ? body.uuids.slice(0, MAX_STREAM) : null;
        let batch = [];
        if (uuids?.length) {
          for (const id of uuids) {
            const ic = await findIcon(env, id);
            if (ic) batch.push(ic);
            else write({ ok: false, uuid: id, error: 'not in index' });
          }
        } else {
          batch = await listIconsForReview(env, {
            category: body.category,
            cursor: body.cursor,
            limit: body.limit,
          });
        }
        let last = body.cursor || null;
        for (const ic of batch) {
          const row = await reviewOneIcon(env, ic);
          last = row.grudgeUuid;
          write({ ok: true, request_id: requestId, review: row });
        }
        write({
          done: true,
          count: batch.length,
          nextCursor: last,
          law: 'Resume with cursor=nextCursor. Max 8 per stream. D1 PK = ICON UUID.',
        });
      } catch (err) {
        write({ ok: false, error: err.message, request_id: requestId });
      }
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Request-Id': requestId,
    },
  });
}

function jsonOk(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function jsonErr(error, status) {
  return jsonOk({ ok: false, error }, status);
}
