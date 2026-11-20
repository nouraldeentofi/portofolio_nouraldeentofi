/**
 * The ways to reach him, built from the facts in `data/profile.json`.
 *
 * The phone number is published once, as `profile.phone`. The WhatsApp
 * address and the number as a visitor reads it are both made from that one
 * value here, so a new number is changed in one place and every button, row
 * and structured-data node follows.
 */

/** The number as WhatsApp wants it in an address: digits only, no plus sign. */
export const phoneDigits = (phone) => String(phone).replace(/\D/g, '');

/**
 * The number as a person reads it: "+966 54 797 2944".
 *
 * Only a Saudi mobile number is grouped, because that is the only shape the
 * grouping is known for. Anything else is printed as it is written.
 */
export function phoneDisplay(phone) {
  const m = String(phone).match(/^\+966(5\d)(\d{3})(\d{4})$/);
  return m ? `+966 ${m[1]} ${m[2]} ${m[3]}` : String(phone);
}

/**
 * The address that opens a WhatsApp chat with him.
 *
 * `text` is the first line of the message, already written for the visitor.
 * It is copy (`contact.whatsappText`), in the language of the page.
 */
export function whatsappUrl(profile, text = '') {
  const digits = phoneDigits(profile.phone);
  if (!digits) throw new Error('profile.json: phone has no digits to build the WhatsApp address from');
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

/**
 * The languages whose readers are shown WhatsApp before any other channel.
 *
 * In Saudi Arabia a client writes to a supplier on WhatsApp first, so on the
 * Arabic pages it is the primary button and the first row. On the English
 * pages, where an employer lands from the CV, email and the contact page
 * come first and WhatsApp stands beside them. It is beside email on every
 * page and never in its place.
 */
const WHATSAPP_FIRST = new Set(['ar']);

export const whatsappFirst = (lang) => WHATSAPP_FIRST.has(lang);
