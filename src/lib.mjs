// Small helpers shared by the page builder. No dependencies.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Things the build wants to tell you about after it finishes.
export const state = { warnings: [], placeholders: 0, showExamples: false };
export const warn = (msg) => state.warnings.push(msg);

export function readJson(name) {
  const path = join(ROOT, 'data', `${name}.json`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`\nCould not read data/${name}.json\n  ${err.message}`);
    console.error('  This is almost always a missing comma, a missing quote, or a trailing comma.\n');
    process.exit(1);
  }
}

// ---------- text ----------

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const PLACEHOLDER = /\[\[\s*([\s\S]*?)\s*\]\]/g;

// Anything written as [[ like this ]] is a placeholder. It is shown on the page
// with a dashed underline so it can't be mistaken for finished content.
export const isPh = (s) => typeof s === 'string' && /\[\[[\s\S]*?\]\]/.test(s);

export function inline(s = '') {
  return esc(s).replace(PLACEHOLDER, (_, text) => {
    state.placeholders++;
    return `<span class="ph" title="Placeholder: replace this in the data files">[ ${text} ]</span>`;
  });
}

export const plain = (s = '') => String(s).replace(PLACEHOLDER, '$1');

export const paras = (s = '') =>
  String(s)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p)}</p>`)
    .join('');

export const has = (v) =>
  Array.isArray(v) ? v.length > 0 : typeof v === 'string' ? v.trim() !== '' : Boolean(v);

export const ul = (arr, cls = 'dash') =>
  has(arr) ? `<ul class="${cls}">${arr.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>` : '';

export const commas = (arr) => (arr || []).map(inline).join(', ');

// ---------- dates ----------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ISO = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/;

// "2026-03" -> "Mar 2026". Anything else (a range, a placeholder) is shown as written.
export function when(s) {
  if (!has(s)) return '';
  const m = ISO.exec(String(s).trim());
  if (!m) return inline(s);
  const [, y, mo, d] = m;
  if (!mo) return y;
  const mon = MONTHS[+mo - 1];
  if (!mon) {
    warn(`The date "${s}" has a month that doesn't exist`);
    return esc(s);
  }
  return d ? `${+d} ${mon} ${y}` : `${mon} ${y}`;
}

export const monthYear = (d) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const sortKey = (s) => (ISO.test(String(s || '').trim()) ? String(s).trim().padEnd(10, '-00') : '');

// Newest first. Entries without a proper date keep their place at the end.
export function byDateDesc(items, field) {
  return [...items].sort((a, b) => {
    const ka = sortKey(a[field]);
    const kb = sortKey(b[field]);
    if (ka && kb) return kb.localeCompare(ka);
    if (ka) return -1;
    if (kb) return 1;
    return 0;
  });
}

// ---------- links and files ----------

export const isPdf = (p) => /\.pdf$/i.test(p);
export const ext = (u) => (/^https?:/i.test(u) || isPdf(u) ? ' target="_blank" rel="noopener noreferrer"' : '');
const newTab = (u) => (ext(u) ? '<span class="sr"> (opens in a new tab)</span>' : '');

// Returns a usable URL or null. Placeholders and empty strings quietly give null.
export function url(u, label) {
  if (!has(u) || isPh(u)) return null;
  const v = u.trim();
  if (!/^(https?:\/\/|mailto:)/i.test(v)) {
    warn(`${label}: "${u}" isn't a full link. It should start with https://`);
    return null;
  }
  return v;
}

export function link(href, text, cls = 'link') {
  const arrow = /^https?:/i.test(href) ? '<span aria-hidden="true"> ↗</span>' : '';
  return `<a class="${cls}" href="${esc(href)}"${ext(href)}>${text}${arrow}${newTab(href)}</a>`;
}

// Checks that a file named in the data really exists in the project.
export function file(p, label) {
  if (!has(p) || isPh(p)) return null;
  const clean = p.trim().replace(/^\.?\//, '');
  if (clean.includes('..') || !existsSync(join(ROOT, clean))) {
    warn(`${label}: the file "${clean}" wasn't found, so it was left out`);
    return null;
  }
  return clean;
}

export const fileKb = (p) => Math.max(1, Math.round(statSync(join(ROOT, p)).size / 1024));
export const src = (p) => esc(p.split('/').map(encodeURIComponent).join('/'));

// Example entries are hidden unless the build is run with --examples.
export const live = (items) => (items || []).filter((i) => !i.example || state.showExamples);
export const exampleFlag = (i) =>
  i.example ? '<p class="example-flag mono">Example entry. Not a real item.</p>' : '';
