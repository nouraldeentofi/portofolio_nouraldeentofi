/**
 * llms.txt and llms-full.txt.
 *
 * llms.txt is a short, linked index — the map a model follows.
 * llms-full.txt is the entire profile as one linear markdown document, so a
 * model can ingest everything in a single fetch without crawling.
 */

import { PAGES, pagePath } from './sitemap.mjs';
import { period } from './blocks.mjs';
import { byCompany } from './experience.mjs';

const base = (db) => db.profile.site.replace(/\/$/, '');

/**
 * What he is looking for and where, as plain lines. These are the words a
 * recruiter types into a search box or asks an assistant, stated openly.
 */
function lookingFor(profile, c, lang) {
  const a = profile.availability;
  if (!a.openToWork || !a.roles) return [];
  return [
    `**${c.contact.rolesTitle}:** ${a.roles[lang].join(', ')}`,
    `**${c.contact.areasTitle}:** ${a.areas[lang].join(', ')}`,
    ...(a.immediate ? [`**${c.contact.availabilityTitle}:** ${c.contact.availableNow}`] : []),
  ];
}

/** `year` may be a shared string or `{en, ar}` when the wording differs. */
const yearOf = (y, lang) => (y && typeof y === 'object' ? y[lang] : y);

export function buildLlmsTxt(db, lang = 'en') {
  const { profile, copy } = db;
  const c = copy[lang];
  const b = base(db);
  const L = [];

  L.push(`# ${profile.name[lang]}`);
  L.push('');
  L.push(`> ${profile.headline[lang]}, based in ${profile.location.city[lang]}, ${profile.location.country[lang]}. ${profile.tagline[lang]}`);
  L.push('');
  // Every spelling people actually type, so a model that meets any of them
  // resolves it to this same person.
  if (profile.nameVariants?.length) {
    L.push(`Also known as: ${profile.nameVariants.join(' · ')}`);
    L.push('');
  }
  L.push(c.home.intro);
  L.push('');
  const wanted = lookingFor(profile, c, lang);
  if (wanted.length) {
    L.push(...wanted.map((line) => `- ${line}`));
    L.push('');
  }

  L.push('## Start here');
  L.push('');
  for (const page of PAGES) {
    const name = page === '' ? c.nav.home : c.nav[page];
    L.push(`- [${name}](${b}${pagePath(page, 'en')})`);
  }
  L.push(`- [النسخة العربية](${b}/): the same site, Arabic-first, served at the root`);
  L.push('');

  L.push('## Projects');
  L.push('');
  for (const p of db.projects) {
    const link = p.url ? `[${p.name}](${p.url})` : p.name;
    L.push(`- ${link} (${yearOf(p.year, lang)}): ${p.tagline[lang]}`);
  }
  L.push('');

  L.push('## Automation systems');
  L.push('');
  for (const w of db.workflows) {
    L.push(`- ${w.name[lang]} (${yearOf(w.year, lang)}, ${c.ui.status[w.status]}): ${w.summary[lang]}`);
  }
  L.push('');

  L.push('## Websites built for clients');
  L.push('');
  for (const x of db.showcase.sites) {
    const link = x.url ? `[${x.name[lang]}](${x.url})` : x.name[lang];
    L.push(`- ${link}: ${x.role[lang]}. ${x.concept[lang]}`);
  }
  L.push(`- [${db.showcase.lab.name[lang]}](${db.showcase.lab.url}): ${db.showcase.lab.count} ${db.showcase.lab.countLabel[lang]}. ${db.showcase.lab.tagline[lang]}`);
  L.push('');

  L.push('## Experience');
  L.push('');
  for (const g of byCompany(db.experience)) {
    const roles = g.roles.map((e) => `${e.role[lang]} (${period(e.start, e.end, c)})`);
    L.push(
      g.roles.length === 1
        ? `- ${g.roles[0].role[lang]}, ${g.company} (${period(g.start, g.end, c)})`
        : `- ${g.company} (${period(g.start, g.end, c)}): ${roles.join('; ')}`,
    );
  }
  L.push('');

  L.push('## Machine-readable');
  L.push('');
  L.push(`- [Full profile as markdown](${b}/llms-full.txt): everything on this site in one document`);
  L.push(`- [Profile JSON](${b}/api/profile.json): identity, links, availability`);
  L.push(`- [Projects JSON](${b}/api/projects.json): projects and workflows`);
  L.push(`- [Résumé (JSON Resume standard)](${b}/api/resume.json)`);
  L.push(`- [MCP server](${b}/mcp/README.md): query this profile as tools from an AI assistant`);
  L.push('');

  L.push('## Contact');
  L.push('');
  L.push(`- Email: ${profile.email}`);
  for (const s of profile.sameAs.filter((x) => x.url)) {
    L.push(`- ${s.platform}: ${s.url}`);
  }
  L.push('');

  return L.join('\n');
}

export function buildLlmsFullTxt(db, lang = 'en') {
  const { profile, copy } = db;
  const c = copy[lang];
  const L = [];

  L.push(`# ${profile.name[lang]}: complete profile`);
  L.push('');
  L.push(`> ${profile.headline[lang]}`);
  L.push('');
  if (profile.nameVariants?.length) {
    L.push(`**Also known as:** ${profile.nameVariants.join(' · ')}`);
  }
  L.push(`**Location:** ${profile.location.city[lang]}, ${profile.location.region[lang]}, ${profile.location.country[lang]}`);
  L.push(`**Email:** ${profile.email}`);
  L.push(`**Phone:** ${profile.phone}`);
  L.push(`**Languages:** ${profile.languages.map((l) => `${l.name[lang]} (${l.level[lang]})`).join(', ')}`);
  L.push(`**Open to work:** ${profile.availability.openToWork ? 'yes' : 'no'} (${profile.availability.arrangements[lang].join(', ')})`);
  L.push(...lookingFor(profile, c, lang));
  L.push('');
  L.push('**Links:**');
  for (const s of profile.sameAs.filter((x) => x.url)) L.push(`- ${s.platform}: ${s.url}`);
  L.push('');

  L.push('## About');
  L.push('');
  for (const para of c.about.body) { L.push(para); L.push(''); }

  L.push('## How he works');
  L.push('');
  for (const p of c.about.principles) {
    L.push(`### ${p.title}`);
    L.push('');
    L.push(p.body);
    L.push('');
  }

  L.push('## Projects');
  L.push('');
  for (const p of db.projects) {
    L.push(`### ${p.name} (${yearOf(p.year, lang)})`);
    L.push('');
    L.push(`*${p.category[lang]}*: ${p.tagline[lang]}`);
    L.push('');
    L.push(`**Problem.** ${p.problem[lang]}`);
    L.push('');
    L.push(`**What he built.** ${p.built[lang]}`);
    L.push('');
    L.push(`**Role.** ${p.role[lang]}`);
    L.push('');
    if (p.metrics?.length) {
      L.push(`**Numbers.** ${p.metrics.map((m) => `${m.value} ${m.label[lang]}`).join(' · ')}`);
      L.push('');
    }
    L.push(`**Stack.** ${p.stack.join(', ')}`);
    L.push('');
    if (p.url) { L.push(`**Live.** ${p.url}`); L.push(''); }
    if (p.context) { L.push(`**Context.** ${p.context[lang]}`); L.push(''); }
  }

  L.push('## Automation systems');
  L.push('');
  for (const w of db.workflows) {
    L.push(`### ${w.name[lang]} (${yearOf(w.year, lang)})`);
    L.push('');
    L.push(`*${w.kind[lang]}* · ${c.ui.status[w.status]}${w.workflowCount ? ` · ${w.workflowCount} n8n workflow(s)` : ''} · trigger: ${w.trigger[lang]}`);
    if (w.flow) {
      L.push('');
      L.push(`**Flow.** ${w.flow.nodes.map((n) => n.label[lang]).join(' → ')}`);
    }
    L.push('');
    L.push(w.summary[lang]);
    L.push('');
    L.push(`**Services.** ${w.services.join(', ')}`);
    L.push('');
    for (const h of w.highlights[lang]) L.push(`- ${h}`);
    L.push('');
    L.push(`**Outcome.** ${w.outcome[lang]}`);
    L.push('');
  }

  L.push('## Websites built for clients');
  L.push('');
  for (const x of db.showcase.sites) {
    L.push(`### ${x.name[lang]}: ${x.role[lang]}`);
    L.push('');
    L.push(x.concept[lang]);
    L.push('');
    for (const h of x.highlights[lang]) L.push(`- ${h}`);
    L.push('');
    if (x.url) { L.push(`**Live.** ${x.url}`); L.push(''); }
  }
  L.push(`### ${db.showcase.lab.name[lang]}`);
  L.push('');
  L.push(`${db.showcase.lab.count} ${db.showcase.lab.countLabel[lang]}. ${db.showcase.lab.tagline[lang]} ${db.showcase.lab.url}`);
  L.push('');

  L.push('## Experience');
  L.push('');
  for (const g of byCompany(db.experience)) {
    // Several roles at one employer: one tenure, each role inside it.
    const nested = g.roles.length > 1;
    if (nested) {
      L.push(`### ${g.company}`);
      L.push('');
      L.push(`${period(g.start, g.end, c)} · ${g.roles[0].location[lang]}`);
      L.push('');
    }
    for (const e of g.roles) {
      L.push(nested ? `#### ${e.role[lang]}` : `### ${e.role[lang]}, ${e.company}`);
      L.push('');
      L.push(nested ? `${period(e.start, e.end, c)} · ${e.type[lang]}` : `${period(e.start, e.end, c)} · ${e.location[lang]} · ${e.type[lang]}`);
      L.push('');
      for (const bullet of e.bullets[lang]) L.push(`- ${bullet}`);
      L.push('');
    }
  }

  L.push('## Education and awards');
  L.push('');
  for (const cr of db.credentials.filter((x) => x.kind !== 'certification')) {
    L.push(`- **${cr.name[lang]}**, ${cr.issuer} (${cr.issued})`);
  }
  L.push('');

  L.push('## Certifications');
  L.push('');
  for (const cr of db.credentials.filter((x) => x.kind === 'certification')) {
    L.push(`- **${cr.name[lang]}**, ${cr.issuer} (${cr.issued})${cr.credentialId ? ` · ID ${cr.credentialId}` : ''}`);
  }
  L.push('');

  L.push('## Skills');
  L.push('');
  for (const g of db.skills) {
    L.push(`**${g.category[lang]}.** ${g.items.join(', ')}`);
    L.push('');
  }

  L.push('## Recommendations');
  L.push('');
  for (const t of db.testimonials) {
    L.push(`### ${t.author}, ${t.title[lang]}`);
    L.push('');
    L.push(`*${t.relationship[lang]}, ${t.date}*`);
    L.push('');
    L.push(`> ${t.quote[lang]}`);
    L.push('');
  }

  L.push('## Frequently asked');
  L.push('');
  for (const f of c.about.faq) {
    L.push(`**${f.q}**`);
    L.push('');
    L.push(f.a);
    L.push('');
  }

  return L.join('\n');
}
