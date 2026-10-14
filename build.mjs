// Turns data/*.json into a static site in dist/. No dependencies.
//   node build.mjs             build
//   node build.mjs --examples  build and also show entries marked "example": true
//   node build.mjs --strict    build, then fail if any placeholder or problem is left
import { rmSync, mkdirSync, cpSync, copyFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, state, readJson, file } from './src/lib.mjs';
import { fontFaces, renderPage, favicon } from './src/page.mjs';
import * as s from './src/sections.mjs';

const args = process.argv.slice(2);
state.showExamples = args.includes('--examples');
const strict = args.includes('--strict');

const site = readJson('site');
// The CV section and buttons appear only once the PDF exists.
const cvFile = site.cv && existsSync(join(ROOT, site.cv)) ? file(site.cv, 'CV') : null;

const achievements = s.achievements(readJson('achievements'));

// Order here is the order on the page and in the navigation.
const parts = [
  s.about(readJson('about')),
  achievements,
  s.certificates(readJson('certificates')),
  s.projects(readJson('projects')),
  s.experience(readJson('experience')),
  s.education(readJson('education')),
  s.skills(readJson('skills')),
  cvFile && s.cv(site, cvFile),
  s.contact(site),
].filter(Boolean);

// The hero is rendered separately because it isn't in the navigation.
const hero = s.hero(site, { achievements: Boolean(achievements), cvFile });

const fonts = fontFaces();
const ogFile = file(site.ogImage, 'Link preview image') || file(site.photo, 'Photo');
const c = site.contact || {};
const profileLinks = [c.linkedin, c.github, ...(c.other || []).map((o) => o.url)].filter((u) => /^https?:/i.test(u || ''));

const html = renderPage({ site, hero, sections: parts, fonts, ogFile, profileLinks });

const dist = join(ROOT, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'index.html'), html);
writeFileSync(join(dist, 'favicon.svg'), favicon(site.name));
writeFileSync(join(dist, '.nojekyll'), '');
copyFileSync(join(ROOT, 'src', 'styles.css'), join(dist, 'styles.css'));
copyFileSync(join(ROOT, 'src', 'script.js'), join(dist, 'script.js'));
cpSync(join(ROOT, 'assets'), join(dist, 'assets'), { recursive: true });
if (existsSync(join(ROOT, 'cv'))) cpSync(join(ROOT, 'cv'), join(dist, 'cv'), { recursive: true });

// ---------- report ----------
const out = [`Built ${parts.length} sections into dist/`];
out.push(fonts.used.length ? `Fonts: ${fonts.used.join(', ')}` : 'Fonts: none in assets/fonts/, using system fonts');
if (state.placeholders) out.push(`Placeholders still on the page: ${state.placeholders}. They show with a dashed underline. Replace them in data/*.json.`);
if (state.warnings.length) out.push('\nThings to fix:', ...state.warnings.map((w) => `  - ${w}`));
console.log(out.join('\n'));

if (strict && (state.placeholders || state.warnings.length)) {
  console.error('\nNot ready to publish: see above.');
  process.exit(1);
}
