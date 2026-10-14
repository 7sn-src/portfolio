// The parts of the page that wrap every section: <head>, navigation, footer.
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { esc, inline, plain, has, file, monthYear, ROOT, warn } from './lib.mjs';

// Fonts are optional. Put Newsreader and Hanken Grotesk .woff2 files in assets/fonts/
// and they are picked up here; without them the page uses system fonts.
export function fontFaces() {
  const dir = join(ROOT, 'assets', 'fonts');
  if (!existsSync(dir)) return { css: '', used: [] };
  const faces = [];
  const used = [];
  for (const name of readdirSync(dir).filter((n) => /\.woff2$/i.test(n))) {
    const family = /newsreader/i.test(name) ? 'Newsreader' : /hanken/i.test(name) ? 'Hanken Grotesk' : null;
    if (!family) continue;
    const italic = /italic/i.test(name);
    const weight = /variable|wght/i.test(name) ? '200 800' : (/(\d{3})/.exec(name) || [, '400'])[1];
    faces.push(
      `@font-face{font-family:'${family}';font-style:${italic ? 'italic' : 'normal'};font-weight:${weight};font-display:swap;src:url('assets/fonts/${encodeURIComponent(name)}') format('woff2')}`,
    );
    used.push(name);
  }
  return { css: faces.join('\n'), used };
}

const absolute = (base, path) => (base ? new URL(path, base).href : '');

export function metaTags(site, ogFile) {
  const name = plain(site.name);
  const title = `${name} | Portfolio`;
  const description = plain(has(site.description) ? site.description : site.intro || '').slice(0, 200);
  const base = has(site.url) ? site.url.trim().replace(/\/?$/, '/') : '';
  if (!base) warn('site.json: "url" is empty, so link previews (WhatsApp, LinkedIn, etc.) will have no image or address');
  const image = ogFile ? absolute(base, ogFile) : '';
  return `
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <meta name="author" content="${esc(name)}">
  ${base ? `<link rel="canonical" href="${esc(base)}">` : ''}
  <meta property="og:type" content="website">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  ${base ? `<meta property="og:url" content="${esc(base)}">` : ''}
  ${image ? `<meta property="og:image" content="${esc(image)}">` : ''}
  <meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  ${image ? `<meta name="twitter:image" content="${esc(image)}">` : ''}`;
}

export function favicon(name) {
  const letter = (plain(name).trim()[0] || '.').toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#000"/><text x="32" y="46" text-anchor="middle" font-family="Georgia,serif" font-size="42" fill="#fff">${esc(letter)}</text></svg>\n`;
}

function personJsonLd(site, links) {
  if (/\[\[/.test(site.name)) return '';
  const data = { '@context': 'https://schema.org', '@type': 'Person', name: site.name };
  if (has(site.url)) data.url = site.url;
  if (links.length) data.sameAs = links;
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export function renderPage({ site, hero, sections, fonts, ogFile, profileLinks }) {
  const nav = sections.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('');
  const year = new Date().getFullYear();
  const updated = has(site.lastUpdated) ? site.lastUpdated : monthYear(new Date());
  return `<!doctype html>
<html lang="${esc(site.lang || 'en')}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#ffffff">
  ${metaTags(site, ogFile)}
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <script>document.documentElement.className='js'</script>
  ${fonts.css ? `<style>${fonts.css}</style>` : ''}
  <link rel="stylesheet" href="styles.css">
  ${personJsonLd(site, profileLinks)}
</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="rail">
    <a class="brand" href="#top">${inline(site.name)}</a>
    <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav id="site-nav" aria-label="Sections"><ul>${nav}</ul></nav>
  </header>
  <main id="main">
${hero}
${sections.map((s) => `<section class="section${s.inverse ? ' inverse' : ''}" id="${s.id}" aria-labelledby="${s.id}-title">${s.html.replace('class="section-title"', `class="section-title" id="${s.id}-title"`)}</section>`).join('\n')}
  </main>
  <footer class="site-footer">
    <div class="wrap">
      <p>${inline(site.name)}, ${year}</p>
      <p>Last updated ${esc(updated)}</p>
      <p><a href="#top">Back to top</a></p>
    </div>
  </footer>
  <script src="script.js" defer></script>
</body>
</html>
`;
}
