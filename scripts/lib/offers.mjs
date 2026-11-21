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
 * `serviceType` is the plain category schema.org asks for next to the name.
 * It is not copy, but it may only use words the card itself shows: structured
 * data says nothing a visitor cannot read, and a test holds each value to the
 * visible text of the home page.
 */
export const OFFERS = {
  automation: {
    page: 'automation',
    serviceType: { en: 'AI automation', ar: 'أتمتة العمل المتكرّر بالذكاء الاصطناعي' },
  },
  websites: {
    page: 'showcase',
    serviceType: { en: 'Websites for professionals and businesses', ar: 'مواقع للأفراد والشركات والمحلات' },
  },
  frontend: {
    page: 'work',
    serviceType: { en: 'Frontend development', ar: 'تطوير الواجهات الأمامية' },
  },
};

/**
 * The parts of an offer, in the order the card prints them, each on a line
 * of its own: the job (`body`), one real example, what happens next, and the
 * tools as a quiet last line. On a phone one paragraph of all four ran to
 * ten lines; four short ones are read. `body` is required, and an offer
 * leaves out a part it has nothing true to say in (the websites card names
 * no tools).
 */
export const OFFER_PARTS = ['body', 'example', 'next', 'tools'];

/**
 * The home page offers, each with its page and its category in `lang`.
 *
 * `text` is the whole card as one paragraph, the parts joined by a space,
 * for the places that have no lines: the description of the Service node
 * and the llms files.
 */
export function homeOffers(db, lang) {
  return db.copy[lang].home.offers.map((offer) => {
    const known = OFFERS[offer.id];
    if (!known) throw new Error(`copy/${lang}.json: home.offers names an unknown offer "${offer.id}"`);
    if (!offer.body) throw new Error(`copy/${lang}.json: the offer "${offer.id}" does not say what the job is`);
    // The line about prices links to them, and only the websites page prints any.
    if (offer.prices && known.page !== 'showcase') throw new Error(`copy/${lang}.json: the offer "${offer.id}" points to prices its page does not print`);
    const text = OFFER_PARTS.map((part) => offer[part]).filter(Boolean).join(' ');
    return { ...offer, text, page: known.page, serviceType: known.serviceType[lang] };
  });
}

/**
 * What a website costs, as the websites page prints it.
 *
 * The kinds of site, the amounts and the currency live in `prices` in
 * `data/showcase.json` and nowhere else; the copy holds no figure. A price
 * printed online binds him, so it is printed as the data states it: the kind
 * of site, then the amount and the currency ("750 SAR", "750 ريال"), with
 * no "from" and no condition the data does not carry. Western digits in both
 * languages, like every other figure on the site.
 */
export function websitePrices(db, lang) {
  const { currency, items } = db.showcase.prices;
  const amount = new Intl.NumberFormat('en-US');
  return items.map((item) => ({ id: item.id, label: item.label[lang], price: `${amount.format(item.amount)} ${currency[lang]}` }));
}

/** The id of the prices on the websites page, which the websites card on the home page links to. */
export const PRICES_ANCHOR = 'prices';

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
