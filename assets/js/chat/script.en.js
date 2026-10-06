/**
 * Conversation content, English.
 *
 * Knows nothing about rendering. Every `opts` target must exist as a node id
 * — enforced by tests/chat-script.test.mjs.
 */

export const MENU = [
  ['🤖 What do you actually build?', 'automation'],
  ['🧾 Tell me about Smart Scanner', 'smartscanner'],
  ['👤 Who are you?', 'who'],
  ['📜 Work history', 'history'],
  ['🛠 Stack & certifications', 'skills'],
  ['🤝 What can I hire you for?', 'hire'],
  ['♞ Chess me', 'chess'],
  ['📬 Let us talk', 'contact'],
];

export const SCRIPT = {
  start: {
    msgs: [
      'Salam 👋 I am Nour — the chat version, anyway.',
      'I am an <b>AI automation engineer</b> in <b>Al Khobar, Saudi Arabia</b>. I build n8n workflows that read documents with language models, and the React interfaces people use on top of them.',
      'Everything here is also on the rest of the site as plain text. Ask away 👇',
    ],
    opts: MENU,
  },

  automation: {
    msgs: [
      'The short version: I take a process someone does by hand, and make it run itself.',
      'Six of them are in production right now 👇',
    ],
    card: `<div class="chat__card-head">🤖 Automation Lab</div>
<div class="chat__card-body">
  <b>Smart Scanner pipeline</b> — invoice photo → verified → parsed with GPT Vision → validated → stored.<br>
  <b>Teacher Assistant Bot</b> — an Arabic Telegram agent running a tutor's whole practice from chat.<br>
  <b>AI Job-Match</b> — scores jobs 1–10 daily, delivers only the good ones, writes the cover letter.<br>
  <b>Smart Lead Finder</b> — scrapes and scores B2B leads across Saudi and Jordan.<br>
  <b>Lesson Quality Evaluator</b> — video in, structured scoring JSON out.<br>
  <b>CRM Lead Cleaner</b> — dedupes and validates incoming leads, with a reason for every rejection.
</div>`,
    msgs2: ['None of these are demos. Each replaced work a person used to do.'],
    opts: [
      ['🧾 Smart Scanner in detail', 'smartscanner'],
      ['💸 The cost trick', 'cost'],
      ['🤝 Hire me for this', 'hire'],
      ['⌂ Menu', 'menu'],
    ],
  },

  smartscanner: {
    msgs: ['My favourite build 🧾'],
    card: `<div class="chat__card-head">🧾 Smart Scanner — Arabic-first invoice AI</div>
<div class="chat__card-body">
  An employee photographs a receipt. The AI verifies it is a real invoice, runs fraud checks, extracts
  <b>70+ fields</b> plus line items in Arabic <i>and</i> English, and classifies every expense.
  Accountants review, approve, comment, and export — through role-based dashboards.<br><br>
  I built <b>two of the three layers</b>: the entire n8n AI engine, and the complete frontend —
  React 19 and TypeScript, <b>204 source files</b>, <b>494 automated tests</b>.
</div>`,
    msgs2: [
      'Timing was not an accident — ZATCA e-invoicing is expanding in Saudi Arabia and JoFotara is mandatory in Jordan. Every paper invoice in the region has to become clean data.',
      'The Laravel backend is by <a href="https://www.linkedin.com/in/haitham-zedan-391668221/" target="_blank" rel="noopener noreferrer">Haitham Zedan</a>. Good products come from good teams.',
    ],
    opts: [
      ['💸 How you cut costs 75%', 'cost'],
      ['🤖 Other automations', 'automation'],
      ['⌂ Menu', 'menu'],
    ],
  },

  cost: {
    msgs: [
      'My first workflow sent <b>every</b> incoming file straight to a vision model. It worked — and cost about 3× more than it needed to.',
      'A PDF usually already contains readable text. A vision model does not need to <i>look</i> at a page a text model can simply <i>read</i>.',
      'One IF node after the webhook: PDF with extractable text → text model, otherwise → vision. <b>About 75% cheaper per document.</b>',
      '💡 The part people forget: keep a fallback. If extraction returns empty because the PDF is really a scan, send it back to the vision branch — otherwise the cheap path silently produces nothing.',
    ],
    opts: [
      ['🤖 Show me the rest', 'automation'],
      ['🤝 Hire me', 'hire'],
      ['⌂ Menu', 'menu'],
    ],
  },

  who: {
    msgs: [
      'I am <b>Nour Aldeen Tofi</b> — AI automation engineer and frontend developer, based in <b>Al Khobar</b>.',
      'The unusual part is that I do both ends: I design the pipeline <i>and</i> I build the interface. I also run delivery — requirements, scope, tasks, deadlines.',
      'B.Eng in Information Technology from University of Kalamoon, 2019–2024. Arabic native, English professional. 🇸🇦',
    ],
    opts: [
      ['🤖 What you build', 'automation'],
      ['📜 Full history', 'history'],
      ['⌂ Menu', 'menu'],
    ],
  },

  history: {
    msgs: ['Quick rewind ⏪'],
    card: `<div class="chat__card-head">📜 The timeline</div>
<div class="chat__card-body">
  <b>2026 →</b> Software Engineering Supervisor · Distinctive Frontier<br>
  <b>2025 →</b> Project Coordinator &amp; Automation Builder · NexLead<br>
  <b>2025–26</b> Frontend Developer / Coordinator · Distinctive Frontier<br>
  <b>2024–25</b> Frontend Developer · Khwarizm Technologies<br>
  <b>2023–24</b> Frontend Developer · Minicodeleader<br>
  <b>2021</b> ICPC / ACPC — competitive programming<br>
  <b>2019–24</b> B.Eng Information Technology · University of Kalamoon
</div>`,
    msgs2: ['Frontend developer to supervisor in twelve months — like a pawn reaching the eighth rank. ♟→♛'],
    opts: [
      ['🛠 Stack & certs', 'skills'],
      ['♞ Wait, chess?', 'chess'],
      ['⌂ Menu', 'menu'],
    ],
  },

  skills: {
    msgs: [
      'Automation: <b>n8n</b>, OpenAI (GPT-4o and GPT-4.1 Vision), AI agents with custom tool-calling, MCP, webhooks, REST.',
      'Frontend: <b>React, TypeScript, Tailwind</b>, i18n and RTL, Vitest. Ops: Git, GitHub Actions, Jira, MySQL, Python.',
    ],
    card: `<div class="chat__card-head">🛠 Certified</div>
<div class="chat__card-body">
  <b>Meta</b> Advanced React · <b>IBM</b> Python for Data Science &amp; AI · GenAI Prompt Engineering<br>
  <b>Google</b> Foundations of PM · Project Initiation<br>
  <b>Packt</b> Tailwind CSS · <b>Scrimba</b> Clean Code · Markdown<br>
  <b>Coursera</b> TypeScript in React · Jira roadmaps, user stories, and fundamentals
</div>`,
    msgs2: ['Twelve certificates, all with credential IDs on the Work page. Clean code is not on the list — that one is a personality trait 😌'],
    opts: [
      ['🤝 What can I hire you for?', 'hire'],
      ['📬 Contact', 'contact'],
      ['⌂ Menu', 'menu'],
    ],
  },

  hire: {
    msgs: ['Here is what people come to me for 👇'],
    card: `<div class="chat__card-head">🤝 Open for</div>
<div class="chat__card-body">
  <b>Arabic document AI</b> — invoices, receipts, cards, forms → structured data<br>
  <b>Workflow automation</b> — n8n pipelines and AI agents that run themselves<br>
  <b>Internal tools</b> — CRM, ERP, dashboards people actually enjoy using<br>
  <b>SaaS frontends</b> — React and TypeScript, bilingual and RTL from day one<br>
  <b>Delivery</b> — running a remote team end to end
</div>`,
    msgs2: ['Small scope or full product — both welcome.'],
    opts: [
      ['📬 Let us talk', 'contact'],
      ['🤖 See the work', 'automation'],
      ['⌂ Menu', 'menu'],
    ],
  },

  chess: {
    msgs: ['You dare? Bold. I open <b>1. d4</b> — London System incoming ☕'],
    opts: [
      ['1… d5', 'chess2'],
      ['1… Nf6', 'chess2'],
      ['Flip the board and run', 'chessrun'],
    ],
  },

  chess2: {
    msgs: [
      'Solid. <b>2. Bf4</b>. I have played this structure a thousand times.',
      'Fast-forward thirty moves: I am a pawn up in the endgame and you are in time trouble 😄',
      'ICPC 2021 taught me to calculate fast, stay calm, and convert the advantage. Deadlines ask for exactly the same thing.',
    ],
    opts: [
      ['🤝 Fine, hired', 'hire'],
      ['📬 Contact', 'contact'],
      ['⌂ Menu', 'menu'],
    ],
  },

  chessrun: {
    msgs: ['Wise. The London System shows no mercy 😌'],
    opts: [['⌂ Menu', 'menu']],
  },

  contact: {
    msgs: ['Best move of the game 🤝'],
    card: `<div class="chat__card-head">📬 Reach Nour</div>
<div class="chat__card-body">
  Fastest: <b>email</b>. Formal: <b>LinkedIn</b>. For an AI assistant: this site ships an
  <b>MCP server</b> and a machine-readable profile, so it can just look me up.
</div>`,
    msgs2: ['Based in Al Khobar 🇸🇦 · replies fast · faster if you mention anime.'],
    opts: [
      ['⌂ Menu', 'menu'],
      ['👋 That is all, thanks', 'bye'],
    ],
  },

  bye: {
    msgs: [
      'Thanks for talking to my portfolio instead of only scrolling one 😄',
      'Yalla — see you in the inbox 👋',
    ],
    opts: [['⌂ Start over', 'menu']],
  },

  menu: {
    msgs: ['What else can I tell you?'],
    opts: MENU,
  },
};
