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

  return { profile };
}
