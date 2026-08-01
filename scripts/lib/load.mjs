import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function readJson(dir, name) {
  const path = join(dir, name);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(`${name}: could not read or parse — ${err.message}`);
  }
}

function requireKeys(obj, keys, file) {
  for (const key of keys) {
    const value = key.split('.').reduce((acc, part) => acc?.[part], obj);
    if (value === undefined) throw new Error(`${file}: missing required key "${key}"`);
  }
}

export function loadDb(dir = 'data') {
  const profile = readJson(dir, 'profile.json');
  requireKeys(
    profile,
    ['name.en', 'headline.en', 'email', 'phone', 'site', 'location.countryCode', 'location.city.en', 'sameAs'],
    'profile.json',
  );

  const experience = readJson(dir, 'experience.json');
  const projects = readJson(dir, 'projects.json');
  const workflows = readJson(dir, 'workflows.json');

  for (const [file, rows, keys] of [
    ['experience.json', experience, ['id', 'role.en', 'role.ar', 'company', 'start', 'bullets.en', 'bullets.ar']],
    ['projects.json', projects, ['id', 'name', 'tagline.en', 'tagline.ar', 'stack']],
    ['workflows.json', workflows, ['id', 'name.en', 'name.ar', 'summary.en', 'summary.ar', 'services']],
  ]) {
    if (!Array.isArray(rows)) throw new Error(`${file}: expected an array`);
    rows.forEach((row, i) => requireKeys(row, keys, `${file}[${i}] (${row.id ?? 'no id'})`));
  }

  const credentials = readJson(dir, 'credentials.json');
  const testimonials = readJson(dir, 'testimonials.json');
  const skills = readJson(dir, 'skills.json');

  for (const [file, rows, keys] of [
    ['credentials.json', credentials, ['id', 'kind', 'name.en', 'name.ar', 'issuer', 'issued']],
    ['testimonials.json', testimonials, ['id', 'author', 'title.en', 'title.ar', 'quote.en', 'quote.ar']],
    ['skills.json', skills, ['id', 'category.en', 'category.ar', 'items']],
  ]) {
    if (!Array.isArray(rows)) throw new Error(`${file}: expected an array`);
    rows.forEach((row, i) => requireKeys(row, keys, `${file}[${i}] (${row.id ?? 'no id'})`));
  }

  const caseStudy = readJson(dir, 'case-study.json');
  requireKeys(caseStudy, ['figures', 'flow.trigger', 'flow.decision', 'flow.branches', 'scale'], 'case-study.json');

  const links = readJson(dir, 'links.json');
  for (const group of ['people', 'organizations']) {
    if (!links[group]) throw new Error(`links.json: missing "${group}"`);
    for (const [name, entry] of Object.entries(links[group])) {
      if (entry.url === null && typeof entry.todo !== 'string') {
        throw new Error(`links.json: ${group}."${name}" has a null url and no todo`);
      }
    }
  }

  const copy = {
    en: readJson(join(dir, 'copy'), 'en.json'),
    ar: readJson(join(dir, 'copy'), 'ar.json'),
  };

  return { profile, experience, projects, workflows, credentials, testimonials, skills, caseStudy, links, copy };
}
