/**
 * What he offers, tied to the pages and the systems that show it.
 *
 * The words are copy and live in `data/copy`. What lives here is where each
 * of them leads: an offer on the home page to the page that covers it, and a
 * service on the automation page to the systems that back it. Copy names an
 * entry by `id` only, so a sentence can be rewritten without touching a link,
 * and an id nobody recognises stops the build instead of rendering a card
 * that goes nowhere.
 */

/**
 * The three things on the home page, and the page each one opens.
 *
 * `serviceType` is the plain category schema.org asks for next to the name:
 * it is not shown, so it is not copy.
 */
export const OFFERS = {
  automation: {
    page: 'automation',
    serviceType: { en: 'AI automation', ar: 'أتمتة الأعمال بالذكاء الاصطناعي' },
  },
  websites: {
    page: 'showcase',
    serviceType: { en: 'Website design and development', ar: 'تصميم وتطوير المواقع' },
  },
  frontend: {
    page: 'work',
    serviceType: { en: 'Frontend development', ar: 'تطوير الواجهات الأمامية' },
  },
};

/** The home page offers, each with its page and its category in `lang`. */
export function homeOffers(db, lang) {
  return db.copy[lang].home.offers.map((offer) => {
    const known = OFFERS[offer.id];
    if (!known) throw new Error(`copy/${lang}.json: home.offers names an unknown offer "${offer.id}"`);
    return { ...offer, page: known.page, serviceType: known.serviceType[lang] };
  });
}

/**
 * Which systems in `data/workflows.json` stand behind each service card.
 *
 * A service card is a claim in plain words, and every claim on the automation
 * page has to be something he actually built. Naming the systems here lets
 * the card link to them, so a reader can check the claim one click away, and
 * lets a test fail the day a system is removed from under a sentence.
 */
export const SERVICE_SYSTEMS = {
  invoices: ['smart-scanner-pipeline'],
  bots: ['whatsapp-booking', 'teacher-assistant-bot'],
  reviews: ['google-review-reply', 'unified-inbox'],
  hiring: ['cv-screener'],
  data: ['universal-web-scraper', 'smart-lead-finder', 'crm-lead-cleaner'],
};

/** The automation services, each with the workflows that back it. */
export function automationServices(db, lang) {
  return db.copy[lang].automation.services.map((service) => {
    const ids = SERVICE_SYSTEMS[service.id];
    if (!ids) throw new Error(`copy/${lang}.json: automation.services names an unknown service "${service.id}"`);
    const systems = ids.map((id) => {
      const workflow = db.workflows.find((w) => w.id === id);
      if (!workflow) throw new Error(`offers.mjs: service "${service.id}" points at "${id}", which is not in workflows.json`);
      return workflow;
    });
    return { ...service, systems };
  });
}
