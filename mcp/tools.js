/**
 * Pure query functions over the profile dataset.
 *
 * No I/O, no protocol — every function takes `(db, args)` and returns a plain
 * object. That keeps them unit-testable without a running server.
 */

const LANGS = new Set(['en', 'ar']);

function assertLang(lang) {
  if (!LANGS.has(lang)) throw new Error(`lang: expected "en" or "ar", got "${lang}"`);
}

export function getProfile(db, { lang = 'en' } = {}) {
  assertLang(lang);
  const p = db.profile;
  return {
    name: p.name[lang],
    headline: p.headline[lang],
    summary: p.tagline[lang],
    location: `${p.location.city[lang]}, ${p.location.region[lang]}, ${p.location.country[lang]}`,
    email: p.email,
    phone: p.phone,
    languages: p.languages.map((l) => `${l.name[lang]} (${l.level[lang]})`),
    links: p.sameAs.filter((s) => s.url).map((s) => ({ platform: s.platform, url: s.url })),
    openToWork: p.availability.openToWork,
    arrangements: p.availability.arrangements[lang],
    skills: db.skills.map((g) => ({ category: g.category[lang], items: g.items })),
  };
}

export function searchProjects(db, { query = '', tech = null, limit = 10, lang = 'en' } = {}) {
  assertLang(lang);
  if (!Number.isInteger(limit) || limit < 1) throw new Error('limit: expected a positive integer');

  const q = String(query).toLowerCase();
  return db.projects
    .filter((p) => {
      const hay = `${p.name} ${p.tagline.en} ${p.tagline.ar} ${p.category.en} ${p.stack.join(' ')}`.toLowerCase();
      const matchesQuery = hay.includes(q);
      const matchesTech = !tech || p.stack.some((s) => s.toLowerCase().includes(String(tech).toLowerCase()));
      return matchesQuery && matchesTech;
    })
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      name: p.name,
      year: p.year,
      category: p.category[lang],
      tagline: p.tagline[lang],
      problem: p.problem[lang],
      built: p.built[lang],
      role: p.role[lang],
      metrics: (p.metrics ?? []).map((m) => `${m.value} ${m.label[lang]}`),
      stack: p.stack,
      url: p.url,
    }));
}

export function getWorkflows(db, { query = '', lang = 'en' } = {}) {
  assertLang(lang);
  const q = String(query).toLowerCase();
  return db.workflows
    .filter((w) => `${w.name.en} ${w.summary.en} ${w.services.join(' ')}`.toLowerCase().includes(q))
    .map((w) => ({
      id: w.id,
      name: w.name[lang],
      year: w.year,
      kind: w.kind[lang],
      summary: w.summary[lang],
      trigger: w.trigger[lang],
      services: w.services,
      highlights: w.highlights[lang],
      outcome: w.outcome[lang],
    }));
}

export function getExperience(db, { company = null, lang = 'en' } = {}) {
  assertLang(lang);
  const rows = company
    ? db.experience.filter((e) => e.company.toLowerCase().includes(String(company).toLowerCase()))
    : db.experience;

  return rows.map((e) => ({
    id: e.id,
    role: e.role[lang],
    company: e.company,
    location: e.location[lang],
    type: e.type[lang],
    start: e.start,
    end: e.end,
    current: e.end === null,
    highlights: e.bullets[lang],
    stack: e.stack,
  }));
}

export function getCredentials(db, { kind = null, lang = 'en' } = {}) {
  assertLang(lang);
  const rows = kind ? db.credentials.filter((c) => c.kind === kind) : db.credentials;
  return rows.map((c) => ({
    id: c.id,
    kind: c.kind,
    name: c.name[lang],
    issuer: c.issuer,
    issued: c.issued,
    credentialId: c.credentialId,
  }));
}

export function getTestimonials(db, { lang = 'en' } = {}) {
  assertLang(lang);
  return db.testimonials.map((t) => ({
    author: t.author,
    title: t.title[lang],
    relationship: t.relationship[lang],
    date: t.date,
    originalLanguage: t.lang,
    quote: t.quote[lang],
  }));
}

export function answerFaq(db, { question = '', lang = 'en' } = {}) {
  assertLang(lang);
  const faq = db.copy[lang].about.faq;
  const words = String(question)
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  const scored = faq
    .map((f) => {
      const hay = `${f.q} ${f.a}`.toLowerCase();
      return { ...f, score: words.filter((w) => hay.includes(w)).length };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.score > 0
    ? { matched: true, question: scored[0].q, answer: scored[0].a }
    : { matched: false, available: faq.map((f) => f.q) };
}

/** Tool registry — name, description, schema, and handler in one place. */
export const TOOLS = [
  {
    name: 'get_profile',
    description:
      'Get Nour Aldeen Tofi\'s identity: name, headline, location, contact details, languages, verified profile links across platforms, availability, and skills by category. Call this first for any general question about who he is.',
    inputSchema: {
      type: 'object',
      properties: { lang: { type: 'string', enum: ['en', 'ar'], description: 'Response language' } },
    },
    handler: getProfile,
  },
  {
    name: 'search_projects',
    description:
      'Search his products and applications (Smart Scanner, DFS Dashboard, GoldenTag, Business Card Extractor, MCP Search Server). Returns the problem, what he built, his role, measured outcomes, and stack. Use an empty query to list everything.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search across name, tagline, and stack' },
        tech: { type: 'string', description: 'Filter by a technology, e.g. "React" or "n8n"' },
        limit: { type: 'integer', minimum: 1, description: 'Maximum results (default 10)' },
        lang: { type: 'string', enum: ['en', 'ar'] },
      },
    },
    handler: searchProjects,
  },
  {
    name: 'get_workflows',
    description:
      'List his production n8n automation workflows and AI agents, with trigger, connected services, implementation highlights, and business outcome. Use this for questions about automation, n8n, LLM agents, or document AI.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional filter across name, summary, and services' },
        lang: { type: 'string', enum: ['en', 'ar'] },
      },
    },
    handler: getWorkflows,
  },
  {
    name: 'get_experience',
    description:
      'Get his employment history, newest first, with role, company, dates, responsibilities, and stack. Optionally filter by company name.',
    inputSchema: {
      type: 'object',
      properties: {
        company: { type: 'string', description: 'Filter by company name substring' },
        lang: { type: 'string', enum: ['en', 'ar'] },
      },
    },
    handler: getExperience,
  },
  {
    name: 'get_credentials',
    description:
      'Get his certifications, education, and awards, including issuer and verifiable credential IDs.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['certification', 'education', 'award'] },
        lang: { type: 'string', enum: ['en', 'ar'] },
      },
    },
    handler: getCredentials,
  },
  {
    name: 'get_testimonials',
    description:
      'Get professional recommendations written about him by colleagues and mentors, with each author\'s role and working relationship.',
    inputSchema: {
      type: 'object',
      properties: { lang: { type: 'string', enum: ['en', 'ar'] } },
    },
    handler: getTestimonials,
  },
  {
    name: 'answer_faq',
    description:
      'Answer a natural-language question about Nour using his curated FAQ. Falls back to listing the available questions when nothing matches.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to answer' },
        lang: { type: 'string', enum: ['en', 'ar'] },
      },
      required: ['question'],
    },
    handler: answerFaq,
  },
];
