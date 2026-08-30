/*
 * Talent Show 2026 — registration
 *
 * A single-page registration app with no backend and no build step. It is
 * organised as small modules that each own one job:
 *
 *   Config   the event, its categories and the faculty list
 *   Store    persistence in localStorage, defensive about being blocked
 *   State    the entries in memory plus the current search/filter/sort
 *   Validate field-level rules, returning messages the form can show
 *   Render   every piece of the page that reflects state
 *   Csv      export of the line-up for the organisers
 *
 * Nothing outside Render touches the DOM, and nothing outside Store touches
 * storage, so each part can be reasoned about — and tested — on its own.
 */

'use strict';

/* ------------------------------------------------------------------ config */

const Config = {
  event: {
    name: 'Talent Show 2026',
    date: new Date('2026-12-11T19:00:00+03:00'),
    registrationCloses: new Date('2026-11-27T23:59:59+03:00'),
    referencePrefix: 'UTS-2026-',
  },

  /** Each category owns a block of stage slots. */
  categories: [
    { id: 'singing',  name: 'Singing',      icon: '♪', slots: 10, blurb: 'Solo or group, any language. A piano and two mics are on stage.' },
    { id: 'dancing',  name: 'Dancing',      icon: '✦', slots: 10, blurb: 'Choreographed or freestyle. The floor is sprung and 8m wide.' },
    { id: 'music',    name: 'Instrumental', icon: '♬', slots: 8,  blurb: 'Bands and soloists. Backline provided, bring your own pedals.' },
    { id: 'comedy',   name: 'Comedy',       icon: '☺', slots: 8,  blurb: 'Stand-up or sketch. Keep it inside the conduct rules.' },
    { id: 'magic',    name: 'Magic',        icon: '✧', slots: 6,  blurb: 'Close-up work is relayed to the screen by a roaming camera.' },
    { id: 'story',    name: 'Story telling',icon: '❝', slots: 6,  blurb: 'Spoken word, poetry and monologue. Handheld or stand mic.' },
  ],

  faculties: [
    'Engineering',
    'Fine Arts',
    'Medicine',
    'Law',
    'Economics & Administrative Sciences',
    'Communication',
    'Education',
    'Applied Sciences',
  ],

  maxDurationMinutes: 5,
  maxPerformers: 12,
};

/** Total slots across every category. */
Config.totalSlots = Config.categories.reduce((sum, c) => sum + c.slots, 0);

/** Look a category up by id. */
Config.categoryById = (id) => Config.categories.find((c) => c.id === id) || null;

/* ----------------------------------------------------------------- storage */

const Store = {
  KEY: 'uts2026.entries.v1',

  /**
   * Reads saved entries. Storage can be unavailable (private windows, blocked
   * cookies), so every access is guarded and failure just means an empty list.
   */
  load() {
    try {
      const raw = window.localStorage.getItem(this.KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Could not read saved entries:', error.message);
      return [];
    }
  },

  save(entries) {
    try {
      window.localStorage.setItem(this.KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      console.warn('Could not save entries:', error.message);
      return false;
    }
  },
};

/* ------------------------------------------------------------------- state */

const State = {
  entries: Store.load(),
  query: '',
  category: 'all',
  sort: 'newest',

  add(entry) {
    this.entries.push(entry);
    Store.save(this.entries);
  },

  remove(reference) {
    this.entries = this.entries.filter((entry) => entry.reference !== reference);
    Store.save(this.entries);
  },

  /** How many acts a category already holds. */
  countIn(categoryId) {
    return this.entries.filter((entry) => entry.category === categoryId).length;
  },

  /** Slots left in a category, never below zero. */
  remainingIn(categoryId) {
    const category = Config.categoryById(categoryId);
    return category ? Math.max(0, category.slots - this.countIn(categoryId)) : 0;
  },

  hasStudent(studentId) {
    const wanted = studentId.trim().toUpperCase();
    return this.entries.some((entry) => entry.studentId.toUpperCase() === wanted);
  },

  totalPerformers() {
    return this.entries.reduce((sum, entry) => sum + entry.performers, 0);
  },

  /** The next reference number, continuing from whatever is already stored. */
  nextReference() {
    const highest = this.entries.reduce((max, entry) => {
      const digits = Number.parseInt(String(entry.reference).slice(-3), 10);
      return Number.isFinite(digits) ? Math.max(max, digits) : max;
    }, 0);
    return Config.event.referencePrefix + String(highest + 1).padStart(3, '0');
  },

  /** The entries to show, after search, filter and sort. */
  visible() {
    const needle = this.query.trim().toLowerCase();

    const matches = this.entries.filter((entry) => {
      const inCategory = this.category === 'all' || entry.category === this.category;
      if (!inCategory) return false;
      if (!needle) return true;

      const haystack = [
        entry.fullName,
        entry.actTitle,
        entry.faculty,
        Config.categoryById(entry.category)?.name ?? '',
        entry.reference,
      ].join(' ').toLowerCase();

      return haystack.includes(needle);
    });

    const sorters = {
      newest: (a, b) => b.registeredAt.localeCompare(a.registeredAt),
      name: (a, b) => a.fullName.localeCompare(b.fullName),
      category: (a, b) =>
        (Config.categoryById(a.category)?.name ?? '').localeCompare(
          Config.categoryById(b.category)?.name ?? '') || a.fullName.localeCompare(b.fullName),
    };

    return matches.sort(sorters[this.sort] || sorters.newest);
  },
};

/* -------------------------------------------------------------- validation */

const Validate = {
  /** Rules per field. Each returns an error message, or null when happy. */
  rules: {
    fullName: (value) => {
      if (!value.trim()) return 'Please tell us your name.';
      if (value.trim().length < 3) return 'That looks too short.';
      return null;
    },

    studentId: (value) => {
      const id = value.trim();
      if (!id) return 'Your student ID is on your campus card.';
      if (!/^[A-Za-z]?\d{6,10}$/.test(id)) return 'IDs look like B2010457 — a letter and 6–10 digits.';
      if (State.hasStudent(id)) return 'That ID has already registered an act.';
      return null;
    },

    faculty: (value) => (value ? null : 'Choose your faculty.'),

    email: (value) => {
      const email = value.trim();
      if (!email) return 'We send the rehearsal call by email.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That address does not look right.';
      return null;
    },

    phone: (value) => {
      const phone = value.trim();
      if (!phone) return null;                       // optional
      if (!/^[+()\d\s-]{7,20}$/.test(phone)) return 'Digits, spaces and + only, please.';
      return null;
    },

    category: (value) => {
      if (!value) return 'Pick the category your act belongs in.';
      if (State.remainingIn(value) === 0) return 'That category is full — try another, or join the waiting list.';
      return null;
    },

    actTitle: (value) => {
      if (!value.trim()) return 'Give your act a title for the programme.';
      if (value.trim().length < 2) return 'A little longer, please.';
      return null;
    },

    performers: (value) => {
      const count = Number(value);
      if (!Number.isInteger(count) || count < 1) return 'At least one performer.';
      if (count > Config.maxPerformers) return `The stage holds ${Config.maxPerformers} people.`;
      return null;
    },

    duration: (value) => {
      const minutes = Number(value);
      if (!Number.isFinite(minutes) || minutes < 1) return 'How long is the act?';
      if (minutes > Config.maxDurationMinutes) return `${Config.maxDurationMinutes} minutes is the hard limit.`;
      return null;
    },

    consent: (checked) => (checked ? null : 'We need this to put you on stage.'),
  },

  /** Runs every rule over the form values. Returns a map of field → message. */
  all(values) {
    const errors = {};
    for (const [field, rule] of Object.entries(this.rules)) {
      const message = rule(values[field]);
      if (message) errors[field] = message;
    }
    return errors;
  },
};

/* ------------------------------------------------------------------ render */

const Render = {
  el: {
    categoryGrid: document.querySelector('#category-grid'),
    lineupBody: document.querySelector('#lineup-body'),
    emptyNote: document.querySelector('#empty-note'),
    filterCategory: document.querySelector('#filter-category'),
    categorySelect: document.querySelector('#category'),
    facultySelect: document.querySelector('#faculty'),
    statTotal: document.querySelector('#stat-total'),
    statRemaining: document.querySelector('#stat-remaining'),
    statPerformers: document.querySelector('#stat-performers'),
    statDays: document.querySelector('#stat-days'),
    confirmation: document.querySelector('#confirmation'),
    ticketRef: document.querySelector('#ticket-ref'),
    ticketRows: document.querySelector('#ticket-rows'),
    toast: document.querySelector('#toast'),
  },

  /** Fills the two category dropdowns and the faculty list once, at start-up. */
  fillSelects() {
    for (const category of Config.categories) {
      this.el.categorySelect.append(new Option(category.name, category.id));
      this.el.filterCategory.append(new Option(category.name, category.id));
    }
    for (const faculty of Config.faculties) {
      this.el.facultySelect.append(new Option(faculty, faculty));
    }
  },

  categories() {
    this.el.categoryGrid.replaceChildren(...Config.categories.map((category) => {
      const taken = State.countIn(category.id);
      const remaining = Math.max(0, category.slots - taken);
      const ratio = taken / category.slots;
      const status = remaining === 0 ? 'full' : ratio >= 0.7 ? 'filling' : 'open';

      const card = document.createElement('article');
      card.className = `cat-card is-${status}`;
      card.innerHTML = `
        <div class="cat-top">
          <span class="cat-icon" aria-hidden="true">${category.icon}</span>
          <span class="cat-tag">${status === 'full' ? 'Full' : status === 'filling' ? 'Filling up' : 'Open'}</span>
        </div>
        <h3>${escapeHtml(category.name)}</h3>
        <p>${escapeHtml(category.blurb)}</p>
        <div class="meter" role="img"
             aria-label="${taken} of ${category.slots} slots taken">
          <span style="width:${Math.round(ratio * 100)}%"></span>
        </div>
        <p class="cat-slots"><strong>${remaining}</strong> of ${category.slots} slots left</p>`;
      return card;
    }));
  },

  lineup() {
    const rows = State.visible();

    this.el.lineupBody.replaceChildren(...rows.map((entry, index) => {
      const category = Config.categoryById(entry.category);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-num">${index + 1}</td>
        <td>
          <strong>${escapeHtml(entry.fullName)}</strong>
          <span class="sub">${escapeHtml(entry.faculty)} · ${escapeHtml(entry.reference)}</span>
        </td>
        <td>${escapeHtml(entry.actTitle)}</td>
        <td><span class="pill">${escapeHtml(category ? category.name : entry.category)}</span></td>
        <td>${entry.performers}</td>
        <td>${entry.duration} min</td>
        <td class="col-action"></td>`;

      const withdraw = document.createElement('button');
      withdraw.type = 'button';
      withdraw.className = 'link-danger';
      withdraw.textContent = 'Withdraw';
      withdraw.setAttribute('aria-label', `Withdraw ${entry.fullName}`);
      withdraw.addEventListener('click', () => {
        State.remove(entry.reference);
        Render.everything();
        Render.toast(`${entry.fullName} withdrawn from the line-up.`);
      });
      tr.querySelector('.col-action').append(withdraw);

      return tr;
    }));

    const hasEntries = State.entries.length > 0;
    this.el.emptyNote.textContent = hasEntries
      ? 'No acts match that search.'
      : 'No acts yet. Yours could open the show.';
    this.el.emptyNote.hidden = rows.length > 0;
  },

  stats() {
    const total = State.entries.length;
    this.el.statTotal.textContent = String(total);
    this.el.statRemaining.textContent = String(Math.max(0, Config.totalSlots - total));
    this.el.statPerformers.textContent = String(State.totalPerformers());

    const days = Math.ceil((Config.event.date - new Date()) / 86_400_000);
    this.el.statDays.textContent = days > 0 ? String(days) : 'Tonight';
  },

  /** Shows the confirmation ticket for a freshly saved entry. */
  ticket(entry) {
    const category = Config.categoryById(entry.category);
    this.el.ticketRef.textContent = entry.reference;
    this.el.ticketRows.replaceChildren();

    const rows = [
      ['Performer', entry.fullName],
      ['Act', entry.actTitle],
      ['Category', category ? category.name : entry.category],
      ['On stage', `${entry.performers} · ${entry.duration} min`],
    ];

    for (const [label, value] of rows) {
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      this.el.ticketRows.append(dt, dd);
    }

    this.el.confirmation.hidden = false;
    this.el.confirmation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  /** Puts a message under a field, or clears it when message is null. */
  fieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const hint = document.querySelector(`[data-hint-for="${inputId}"]`);
    if (!input || !hint) return;

    input.classList.toggle('is-invalid', Boolean(message));
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    hint.textContent = message || hint.dataset.default || '';
    hint.classList.toggle('is-error', Boolean(message));
  },

  toast(message) {
    this.el.toast.textContent = message;
    this.el.toast.classList.add('is-visible');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.el.toast.classList.remove('is-visible');
    }, 3600);
  },

  everything() {
    this.categories();
    this.lineup();
    this.stats();
  },
};

/* --------------------------------------------------------------------- csv */

const Csv = {
  columns: [
    ['reference', 'Reference'],
    ['fullName', 'Performer'],
    ['studentId', 'Student ID'],
    ['faculty', 'Faculty'],
    ['email', 'Email'],
    ['phone', 'Phone'],
    ['category', 'Category'],
    ['actTitle', 'Act'],
    ['performers', 'Performers'],
    ['duration', 'Minutes'],
    ['backingTrack', 'Backing track'],
    ['notes', 'Technical needs'],
    ['registeredAt', 'Registered at'],
  ],

  /** Escapes a value for CSV: quotes doubled, field wrapped when needed. */
  cell(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  },

  build(entries) {
    const header = this.columns.map(([, label]) => label).join(',');
    const rows = entries.map((entry) =>
      this.columns.map(([key]) => this.cell(entry[key])).join(','));
    return [header, ...rows].join('\n');
  },

  download(entries) {
    const blob = new Blob([this.build(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'talent-show-2026-lineup.csv';
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

/* ------------------------------------------------------------------ helper */

/** Keeps anything a student typed from being treated as markup. */
function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = String(value ?? '');
  return span.innerHTML;
}

/* ------------------------------------------------------------------ wiring */

const form = document.querySelector('#registration-form');

/** Reads the form into plain values, ready for validation. */
function readForm() {
  const data = new FormData(form);
  return {
    fullName: String(data.get('fullName') || ''),
    studentId: String(data.get('studentId') || ''),
    faculty: String(data.get('faculty') || ''),
    email: String(data.get('email') || ''),
    phone: String(data.get('phone') || ''),
    category: String(data.get('category') || ''),
    actTitle: String(data.get('actTitle') || ''),
    performers: String(data.get('performers') || ''),
    duration: String(data.get('duration') || ''),
    notes: String(data.get('notes') || ''),
    backingTrack: form.elements.backingTrack.checked,
    consent: form.elements.consent.checked,
  };
}

/** Field ids, so an error can be attached to the right input. */
const FIELD_IDS = {
  fullName: 'full-name',
  studentId: 'student-id',
  faculty: 'faculty',
  email: 'email',
  phone: 'phone',
  category: 'category',
  actTitle: 'act-title',
  performers: 'performers',
  duration: 'duration',
  consent: 'consent',
};

form.addEventListener('submit', (event) => {
  event.preventDefault();

  const values = readForm();
  const errors = Validate.all(values);

  for (const [field, inputId] of Object.entries(FIELD_IDS)) {
    Render.fieldError(inputId, errors[field] || null);
  }

  if (Object.keys(errors).length > 0) {
    const firstId = FIELD_IDS[Object.keys(errors)[0]];
    document.getElementById(firstId)?.focus();
    Render.toast('Some details still need fixing.');
    return;
  }

  const entry = {
    reference: State.nextReference(),
    fullName: values.fullName.trim(),
    studentId: values.studentId.trim().toUpperCase(),
    faculty: values.faculty,
    email: values.email.trim(),
    phone: values.phone.trim(),
    category: values.category,
    actTitle: values.actTitle.trim(),
    performers: Number(values.performers),
    duration: Number(values.duration),
    notes: values.notes.trim(),
    backingTrack: values.backingTrack ? 'yes' : 'no',
    registeredAt: new Date().toISOString(),
  };

  State.add(entry);
  Render.everything();
  Render.ticket(entry);
  Render.toast(`You're in — reference ${entry.reference}.`);

  form.reset();
  document.querySelector('#notes-count').textContent = '0';
});

/* Clear an error as soon as the student starts fixing it. */
for (const [field, inputId] of Object.entries(FIELD_IDS)) {
  const input = document.getElementById(inputId);
  input?.addEventListener('input', () => Render.fieldError(inputId, null));
  input?.addEventListener('change', () => {
    const values = readForm();
    const message = Validate.rules[field](
      field === 'consent' ? values.consent : values[field]);
    Render.fieldError(inputId, message);
  });
}

/* Live character count on the notes box. */
const notes = document.querySelector('#notes');
notes.addEventListener('input', () => {
  document.querySelector('#notes-count').textContent = String(notes.value.length);
});

/* Line-up controls. */
document.querySelector('#search').addEventListener('input', (event) => {
  State.query = event.target.value;
  Render.lineup();
});

document.querySelector('#filter-category').addEventListener('change', (event) => {
  State.category = event.target.value;
  Render.lineup();
});

document.querySelector('#sort-by').addEventListener('change', (event) => {
  State.sort = event.target.value;
  Render.lineup();
});

document.querySelector('#export-csv').addEventListener('click', () => {
  const rows = State.visible();
  if (rows.length === 0) {
    Render.toast('Nothing to export yet.');
    return;
  }
  Csv.download(rows);
  Render.toast(`Exported ${rows.length} ${rows.length === 1 ? 'act' : 'acts'}.`);
});

/* Go. */
Render.fillSelects();
Render.everything();
