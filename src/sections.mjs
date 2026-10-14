// One function per section. Each takes the data from data/*.json and returns
// HTML, or null when there is nothing to show, so empty sections never appear.
import {
  esc, inline, plain, paras, has, ul, commas, when, byDateDesc,
  isPdf, url, link, file, fileKb, src, live, exampleFlag, warn, isPh, ROOT,
} from './lib.mjs';
import { imageSize } from './imagesize.mjs';
import { join } from 'node:path';

const ISO = /^\d{4}(-\d{2}){0,2}$/;

// A date as <time> when it's a real date, or as plain text when it's a range or placeholder.
function time(s) {
  if (!has(s)) return '';
  const t = String(s).trim();
  return ISO.test(t) ? `<time datetime="${esc(t)}">${when(t)}</time>` : `<span>${when(t)}</span>`;
}

// True when a YYYY, YYYY-MM or YYYY-MM-DD date has already passed.
function isPast(s) {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(String(s || '').trim());
  if (!m) return false;
  const [, y, mo, d] = m;
  const end = d ? new Date(+y, +mo - 1, +d, 23, 59) : new Date(+y, mo ? +mo : 12, 0, 23, 59);
  return end < new Date();
}

const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

// A link to a file in the project (a scan, a PDF) that opens in a new tab.
function docLink(f, text) {
  const size = isPdf(f) ? ` (PDF, ${fileKb(f)} KB)` : '';
  return `<a class="link" href="${esc(encodePath(f))}" target="_blank" rel="noopener noreferrer">${text}${size}<span class="sr"> (opens in a new tab)</span></a>`;
}

// An <img> for a picture in the project, or '' if the file isn't there.
function picture(path, alt, label) {
  const f = file(path, label);
  if (!f || isPdf(f)) return '';
  if (!has(alt) || isPh(alt)) warn(`${label}: add a short description of the picture (alt text) for ${f}`);
  const kb = fileKb(f);
  if (kb > 600) warn(`${label}: ${f} is ${kb} KB. Resize it to under about 500 KB so the page loads quickly`);
  const text = isPh(alt) ? '' : alt || '';
  const size = imageSize(join(ROOT, f));
  const dims = size ? ` width="${size.w}" height="${size.h}"` : '';
  return `<img src="${esc(encodePath(f))}" alt="${esc(text)}"${dims} loading="lazy" decoding="async">`;
}

// ---------- hero ----------

export function hero(site, { achievements, cvFile }) {
  const tags = (site.tagline || []).filter(has);
  const photoFile = file(site.photo, 'Photo');
  const photo = photoFile
    ? `<figure class="portrait">${picture(photoFile, site.photoAlt, 'Photo')}</figure>`
    : '';
  const cvHref = cvFile ? encodePath(cvFile) : '#cv';
  const cvAttrs = cvFile ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `
<section class="hero" id="top" aria-labelledby="name">
  <div class="wrap">
    <h1 class="name" id="name"><span class="name-in">${inline(site.name)}</span></h1>
    <div class="hero-row">
      <div class="hero-meta">
        ${tags.length ? `<p class="tagline">${tags.map((t) => `<span>${inline(t)}</span>`).join('')}</p>` : ''}
        ${has(site.location) ? `<p class="where">${inline(site.location)}</p>` : ''}
      </div>
      ${has(site.intro) ? `<div class="hero-intro"><p>${inline(site.intro)}</p></div>` : ''}
      <p class="actions">
        <a class="button" href="${achievements ? '#achievements' : '#about'}">Explore my achievements</a>
        ${cvFile ? `<a class="button plain" href="${cvHref}"${cvAttrs}>View my CV<span class="sr"> (opens in a new tab)</span></a>` : ''}
      </p>
      ${photo}
    </div>
    <a class="scroll-cue" href="#about"><span>Scroll</span></a>
  </div>
</section>`;
}

// ---------- about ----------

export function about(data) {
  const fields = (data.fields || []).filter((f) => has(f.label) && has(f.text));
  if (!has(data.lead) && !fields.length) return null;
  return {
    id: 'about',
    title: 'About',
    html: `
<div class="wrap">
  <h2 class="section-title">About</h2>
  ${has(data.lead) ? `<div class="lead">${paras(data.lead)}</div>` : ''}
  ${fields.length ? `<dl class="fields">${fields.map((f) => `
    <div class="field"><dt>${inline(f.label)}</dt><dd>${paras(f.text)}</dd></div>`).join('')}
  </dl>` : ''}
</div>`,
  };
}

// ---------- achievements ----------

function achievementBody(i, catLabel, label, showDate) {
  const href = url(i.link, label + ' link');
  const f = file(i.image, label + ' image');
  const media = f
    ? isPdf(f)
      ? `<p class="doc">${docLink(f, 'View the certificate')}</p>`
      : `<figure class="scan">${picture(f, i.imageAlt, label + ' image')}</figure>`
    : '';
  const text = `
    <p class="meta"><span>${esc(catLabel)}</span>${showDate ? time(i.date) : ''}</p>
    <h3>${inline(i.title)}</h3>
    ${has(i.organization) ? `<p class="org">${inline(i.organization)}</p>` : ''}
    ${has(i.description) ? `<div class="desc">${paras(i.description)}</div>` : ''}
    ${has(i.skills) ? `<p class="used"><span>Shows</span> ${commas(i.skills)}</p>` : ''}
    ${href ? `<p class="more">${link(href, esc(plain(i.linkLabel) || 'Read more'))}</p>` : ''}
    ${exampleFlag(i)}`;
  return { text, media };
}

export function achievements(data) {
  const cats = { ...(data.categories || {}) };
  const items = byDateDesc(live(data.items), 'date')
    .filter((i) => {
      if (!has(i.title)) { warn('An achievement has no title, so it was left out'); return false; }
      return true;
    })
    .map((i) => {
      let c = i.category;
      if (!cats[c]) {
        warn(`Achievement "${plain(i.title)}": category "${c}" isn't one of ${Object.keys(cats).join(', ')}. It is shown under Other`);
        c = 'other';
        cats.other ||= 'Other';
      }
      return { ...i, category: c };
    });
  if (!items.length) return null;

  const present = Object.keys(cats).filter((k) => items.some((i) => i.category === k));
  const featured = items.filter((i) => i.featured);
  const rest = items.filter((i) => !i.featured);

  const plate = (i) => {
    const { text, media } = achievementBody(i, cats[i.category], `Achievement "${plain(i.title)}"`, true);
    return `
    <article class="plate${media ? ' has-media' : ''}" data-category="${esc(i.category)}">
      <div class="plate-text">${text}</div>
      ${media}
    </article>`;
  };
  const row = (i) => {
    const { text, media } = achievementBody(i, cats[i.category], `Achievement "${plain(i.title)}"`, false);
    return `
    <article class="row" data-category="${esc(i.category)}">
      <div class="row-when">${time(i.date)}</div>
      <div class="row-main">${text}</div>
      ${media ? `<div class="row-aside">${media}</div>` : ''}
    </article>`;
  };

  const filters = present.length > 1
    ? `<div class="filters" data-filters hidden role="group" aria-label="Show achievements by type">
      <button type="button" data-filter="all" aria-pressed="true">All <span class="count">${items.length}</span></button>
      ${present.map((k) => `<button type="button" data-filter="${esc(k)}" aria-pressed="false">${esc(cats[k])} <span class="count">${items.filter((i) => i.category === k).length}</span></button>`).join('\n      ')}
    </div>
    <p class="sr" role="status" data-status></p>`
    : '';

  return {
    id: 'achievements',
    title: 'Achievements',
    inverse: true,
    html: `
<div class="wrap">
  <h2 class="section-title">Achievements</h2>
  ${filters}
  <div class="plates">${featured.map(plate).join('')}</div>
  ${rest.length ? `<div class="rows">${rest.map(row).join('')}</div>` : ''}
</div>`,
  };
}

// ---------- certificates ----------

export function certificates(data) {
  const items = live(data.items).filter((c) => {
    if (!has(c.title)) { warn('A certificate has no title, so it was left out'); return false; }
    return true;
  });
  if (!items.length && data.showWhenEmpty === false) return null;

  const earned = [];
  const pending = [];
  for (const c of items) {
    if (c.status === 'earned') earned.push(c);
    else {
      if (c.status !== 'in-progress') {
        warn(`Certificate "${plain(c.title)}": status must be "earned" or "in-progress". It is shown as in progress to be safe`);
      }
      pending.push(c);
    }
  }

  const row = (c, isEarned) => {
    const label = `Certificate "${plain(c.title)}"`;
    const href = url(c.url, label + ' link');
    const f = file(c.image, label + ' file');
    const expired = isEarned && has(c.expires) && isPast(c.expires);
    const facts = [
      has(c.credentialId) ? `<li>Credential ID ${inline(c.credentialId)}</li>` : '',
      has(c.expires) ? `<li>${expired ? 'Expired' : 'Expires'} ${when(c.expires)}</li>` : '',
    ].join('');
    const links = [
      href ? link(href, 'Verify') : '',
      f ? docLink(f, isPdf(f) ? 'View certificate' : 'View scan') : '',
    ].filter(Boolean);
    const thumb = f && !isPdf(f) ? `<figure class="scan">${picture(f, `Scan of ${plain(c.title)}`, label + ' image')}</figure>` : '';
    return `
    <article class="row cert${isEarned ? '' : ' pending'}">
      <div class="row-when">${
        isEarned
          ? time(c.issued)
          : `<span class="status">In progress</span>${has(c.expected) ? `<span>Expected ${when(c.expected)}</span>` : ''}`
      }</div>
      <div class="row-main">
        <h4>${inline(c.title)}</h4>
        ${has(c.organization) ? `<p class="org">${inline(c.organization)}</p>` : ''}
        ${has(c.summary) ? `<div class="desc">${paras(c.summary)}</div>` : ''}
        ${facts ? `<ul class="facts">${facts}</ul>` : ''}
        ${links.length ? `<p class="more">${links.join('')}</p>` : ''}
        ${exampleFlag(c)}
      </div>
      ${thumb ? `<div class="row-aside">${thumb}</div>` : ''}
    </article>`;
  };

  const group = (title, note, list, isEarned) => list.length
    ? `<div class="cert-group">
      <h3 class="group-title">${title}${note ? `<span class="note">${note}</span>` : ''}</h3>
      <div class="rows">${list.map((c) => row(c, isEarned)).join('')}</div>
    </div>`
    : '';

  const body = items.length
    ? group('Earned', '', byDateDesc(earned, 'issued'), true) +
      group('In progress', 'Not yet completed', pending, false)
    : `<p class="empty">Nothing here yet. Certificates I earn will be listed with a way to check them.</p>`;

  return {
    id: 'certificates',
    title: 'Certificates',
    html: `
<div class="wrap">
  <h2 class="section-title">Certificates</h2>
  ${body}
</div>`,
  };
}

// ---------- projects ----------

function projectImages(list, label) {
  const pics = (list || []).slice(0, 3).map((im) => {
    const [path, alt] = typeof im === 'string' ? [im, ''] : [im.src, im.alt];
    return picture(path, alt, label + ' image');
  }).filter(Boolean);
  return pics.length ? `<div class="project-media n${pics.length}">${pics.map((p) => `<figure>${p}</figure>`).join('')}</div>` : '';
}

export function projects(data) {
  const items = live(data.items).filter((p) => {
    if (!has(p.name)) { warn('A project has no name, so it was left out'); return false; }
    return true;
  });
  if (!items.length) return null;

  const card = (p) => {
    const label = `Project "${plain(p.name)}"`;
    const links = (p.links || [])
      .map((l) => {
        const href = url(l.url, `${label} link`);
        if (!href) return '';
        if (!has(l.label)) warn(`${label}: a link has no label`);
        return `<li>${link(href, esc(plain(l.label) || 'Link'))}</li>`;
      })
      .filter(Boolean);
    return `
    <article class="project${p.featured ? ' featured' : ''}">
      ${projectImages(p.images, label)}
      <div class="project-body">
        ${has(p.type) || has(p.date) ? `<p class="meta">${has(p.type) ? `<span>${inline(p.type)}</span>` : ''}${time(p.date)}</p>` : ''}
        <h3>${inline(p.name)}</h3>
        ${has(p.summary) ? `<div class="desc">${paras(p.summary)}</div>` : ''}
        ${has(p.role) ? `<p class="role"><strong>My part.</strong> ${inline(p.role)}</p>` : ''}
        ${ul(p.contributions)}
        ${has(p.tools) ? `<p class="used"><span>Used</span> ${commas(p.tools)}</p>` : ''}
        ${links.length ? `<ul class="links">${links.join('')}</ul>` : ''}
        ${exampleFlag(p)}
      </div>
    </article>`;
  };

  const top = items.filter((p) => p.featured);
  const others = items.filter((p) => !p.featured);
  return {
    id: 'projects',
    title: 'Projects',
    html: `
<div class="wrap">
  <h2 class="section-title">Projects</h2>
  ${top.map(card).join('')}
  ${others.length ? `<div class="project-cols">${others.map(card).join('')}</div>` : ''}
</div>`,
  };
}

// ---------- experience and education ----------

export function experience(data) {
  const items = live(data.items).filter((e) => has(e.role) || has(e.organization));
  if (!items.length) return null;
  return {
    id: 'experience',
    title: 'Experience',
    html: `
<div class="wrap">
  <h2 class="section-title">Experience</h2>
  <div class="rows">${items.map((e) => `
    <article class="row">
      <div class="row-when">${time(e.dates)}</div>
      <div class="row-main">
        <h3>${inline(e.role || e.organization)}</h3>
        ${has(e.role) && has(e.organization) ? `<p class="org">${inline(e.organization)}</p>` : ''}
        ${has(e.summary) ? `<div class="desc">${paras(e.summary)}</div>` : ''}
        ${ul(e.contributions)}
      </div>
    </article>`).join('')}
  </div>
</div>`,
  };
}

export function education(data) {
  const items = live(data.items).filter((e) => has(e.institution));
  if (!items.length) return null;
  return {
    id: 'education',
    title: 'Education',
    html: `
<div class="wrap">
  <h2 class="section-title">Education</h2>
  <div class="rows">${items.map((e) => `
    <article class="row">
      <div class="row-when">${time(e.dates)}</div>
      <div class="row-main">
        <h3>${inline(e.institution)}</h3>
        ${has(e.level) ? `<p class="org">${inline(e.level)}</p>` : ''}
        ${has(e.subjects) ? `<p class="used"><span>Subjects</span> ${commas(e.subjects)}</p>` : ''}
        ${has(e.distinctions) ? `<div class="sub"><p class="sub-label">Distinctions</p>${ul(e.distinctions)}</div>` : ''}
        ${has(e.activities) ? `<div class="sub"><p class="sub-label">Activities</p>${ul(e.activities)}</div>` : ''}
      </div>
    </article>`).join('')}
  </div>
</div>`,
  };
}

// ---------- skills ----------

export function skills(data) {
  const groups = (data.groups || []).filter((g) => has(g.name) && has(g.items));
  if (!groups.length) return null;
  const item = (x) =>
    typeof x === 'string'
      ? `<li>${inline(x)}</li>`
      : `<li>${inline(x.name)}${has(x.note) ? ` <span class="note">${inline(x.note)}</span>` : ''}</li>`;
  return {
    id: 'skills',
    title: 'Skills',
    html: `
<div class="wrap">
  <h2 class="section-title">Skills</h2>
  <div class="skill-groups">${groups.map((g) => `
    <div class="skill-group">
      <h3>${inline(g.name)}</h3>
      <ul>${g.items.map(item).join('')}</ul>
    </div>`).join('')}
  </div>
</div>`,
  };
}

// ---------- CV ----------

export function cv(site, cvFile) {
  const href = cvFile ? encodePath(cvFile) : '';
  const updated = has(site.cvUpdated) ? `, updated ${when(site.cvUpdated)}` : '';
  return {
    id: 'cv',
    title: 'CV',
    html: `
<div class="wrap">
  <h2 class="section-title">CV</h2>
  ${cvFile ? `
  <div class="cv-row">
    <p class="cv-note">${has(site.cvNote) ? inline(site.cvNote) : 'My full CV as a PDF.'}</p>
    <p class="actions">
      <a class="button" href="${esc(href)}" target="_blank" rel="noopener noreferrer">View CV<span class="sr"> (opens in a new tab)</span></a>
      <a class="button plain" href="${esc(href)}" download>Download</a>
    </p>
    <p class="cv-file">PDF, ${fileKb(cvFile)} KB${updated}</p>
  </div>` : `
  <p class="empty">My CV isn't uploaded yet. It will be available here as a PDF.</p>`}
</div>`,
  };
}

// ---------- contact ----------

export function contact(site) {
  const c = site.contact || {};
  const email = has(c.email) && !isPh(c.email) ? c.email.trim() : '';
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) warn(`Contact email "${email}" doesn't look like an email address`);
  const links = [];
  const li = url(c.linkedin, 'LinkedIn link');
  const gh = url(c.github, 'GitHub link');
  if (li) links.push({ label: 'LinkedIn', href: li });
  if (gh) links.push({ label: 'GitHub', href: gh });
  for (const o of c.other || []) {
    const href = url(o.url, `Contact link "${plain(o.label || '')}"`);
    if (href) links.push({ label: plain(o.label) || 'Profile', href });
  }
  if (!email && !links.length) return null;
  return {
    id: 'contact',
    title: 'Contact',
    html: `
<div class="wrap">
  <h2 class="section-title">Contact</h2>
  ${has(site.contactIntro) ? `<p class="contact-intro">${inline(site.contactIntro)}</p>` : ''}
  ${email ? `<p class="email"><a href="mailto:${esc(email)}">${esc(email)}</a></p>` : ''}
  ${links.length ? `<ul class="contact-links">${links.map((l) => `<li>${link(l.href, esc(l.label))}</li>`).join('')}</ul>` : ''}
</div>`,
  };
}
