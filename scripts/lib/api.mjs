/**
 * The public, machine-readable API.
 *
 * Served with `Access-Control-Allow-Origin: *` so any agent can fetch it
 * cross-origin. `resume.json` follows the JSON Resume open standard
 * (https://jsonresume.org/schema/) so existing tooling can parse it directly.
 */

const base = (db) => db.profile.site.replace(/\/$/, '');
const iso = (ym) => (ym ? `${ym}-01` : undefined);

export function buildApiProfile(db) {
  const { profile } = db;
  return {
    $schema: `${base(db)}/api/profile.json`,
    generated: new Date().toISOString(),
    name: profile.name,
    // Alternate spellings people actually use — same list as the JSON-LD
    // alternateName, so agents can match any of them to this profile.
    nameVariants: profile.nameVariants ?? [],
    headline: profile.headline,
    tagline: profile.tagline,
    location: profile.location,
    email: profile.email,
    phone: profile.phone,
    url: base(db),
    languages: profile.languages,
    links: profile.sameAs.filter((s) => s.url),
    availability: profile.availability,
    skills: db.skills,
    documents: {
      llms: `${base(db)}/llms.txt`,
      llmsFull: `${base(db)}/llms-full.txt`,
      resume: `${base(db)}/api/resume.json`,
      projects: `${base(db)}/api/projects.json`,
      cv: profile.cv.map((c) => ({ id: c.id, url: `${base(db)}/${c.file}` })),
    },
  };
}

export function buildApiProjects(db) {
  return {
    generated: new Date().toISOString(),
    projects: db.projects.map((p) => ({
      id: p.id,
      name: p.name,
      year: p.year,
      featured: p.featured,
      category: p.category,
      tagline: p.tagline,
      problem: p.problem,
      built: p.built,
      role: p.role,
      metrics: p.metrics ?? [],
      stack: p.stack,
      url: p.url,
    })),
    workflows: db.workflows.map((w) => ({
      id: w.id,
      name: w.name,
      year: w.year,
      kind: w.kind,
      summary: w.summary,
      trigger: w.trigger,
      services: w.services,
      highlights: w.highlights,
      outcome: w.outcome,
    })),
  };
}

export function buildResumeJson(db, lang = 'en') {
  const { profile } = db;
  const education = db.credentials.find((c) => c.kind === 'education');

  return {
    $schema: 'https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json',
    basics: {
      name: profile.name[lang],
      label: profile.headline[lang],
      email: profile.email,
      phone: profile.phone,
      url: base(db),
      summary: profile.tagline[lang],
      location: {
        city: profile.location.city[lang],
        region: profile.location.region[lang],
        countryCode: profile.location.countryCode,
      },
      profiles: profile.sameAs
        .filter((s) => s.url)
        .map((s) => ({ network: s.platform, username: profile.name[lang], url: s.url })),
    },
    work: db.experience.map((e) => ({
      name: e.company,
      position: e.role[lang],
      location: e.location[lang],
      startDate: iso(e.start),
      ...(e.end ? { endDate: iso(e.end) } : {}),
      highlights: e.bullets[lang],
    })),
    education: education
      ? [
          {
            institution: education.issuer,
            area: 'Information Technology Engineering',
            studyType: 'Bachelor',
            startDate: iso(education.start),
            endDate: iso(education.issued),
          },
        ]
      : [],
    certificates: db.credentials
      .filter((c) => c.kind === 'certification')
      .map((c) => ({
        name: c.name[lang],
        issuer: c.issuer,
        date: iso(c.issued),
        // Only a real verification URL goes in `url` — JSON Resume defines it as
        // one, and a parser will render whatever is here as a link. The
        // credential ID travels in the JSON-LD `identifier` and llms-full.txt.
        ...(c.url ? { url: c.url } : {}),
      })),
    awards: db.credentials
      .filter((c) => c.kind === 'award')
      .map((c) => ({
        title: c.name[lang],
        awarder: c.issuer,
        date: iso(c.issued),
        ...(c.note ? { summary: c.note[lang] } : {}),
      })),
    skills: db.skills.map((g) => ({ name: g.category[lang], keywords: g.items })),
    languages: profile.languages.map((l) => ({ language: l.name[lang], fluency: l.level[lang] })),
    projects: db.projects.map((p) => ({
      name: p.name,
      description: p.tagline[lang],
      highlights: (p.metrics ?? []).map((m) => `${m.value} ${m.label[lang]}`),
      keywords: p.stack,
      ...(p.url ? { url: p.url } : {}),
      roles: [p.role[lang]],
    })),
    references: db.testimonials.map((t) => ({
      name: `${t.author} — ${t.title[lang]}`,
      reference: t.quote[lang],
    })),
  };
}
