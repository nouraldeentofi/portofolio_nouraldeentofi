/**
 * Employment grouped by employer.
 *
 * A promotion is one tenure, not two jobs. Roles at the same company sit next
 * to each other in `data/experience.json`, newest first, and are shown as one
 * entry that runs from the first day of the earliest role to the last day of
 * the latest, with each role and its own dates inside it.
 */
export function byCompany(experience) {
  const groups = [];
  for (const role of experience) {
    const last = groups.at(-1);
    if (last?.company === role.company) last.roles.push(role);
    else groups.push({ company: role.company, roles: [role] });
  }

  return groups.map((g) => ({
    ...g,
    start: g.roles.map((r) => r.start).sort()[0],
    end: g.roles.some((r) => r.end === null) ? null : g.roles.map((r) => r.end).sort().at(-1),
  }));
}
