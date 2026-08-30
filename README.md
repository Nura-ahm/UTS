# University Talent Show — registration site

A registration site for a university talent show, built as a single page with
vanilla HTML, CSS and JavaScript. No framework, no build step, no backend.

**Live demo:** https://nura-ahm.github.io/UTS/

---

## What it does

**Registration form.** One entry per student, covering who they are
(name, student ID, faculty, university email, phone) and what the act is
(category, title, number of performers, duration, technical needs, backing
track, consent to be filmed). Every field is validated as it is filled in and
again on submit, with messages written for a student rather than a developer —
`IDs look like B2010457 — a letter and 6–10 digits.`

**Stage slots.** The show has six categories and forty-eight slots between
them. Each category card shows how many are left and moves through *open →
filling → full* states; a full category can no longer be chosen in the form.

**Reference numbers.** A successful entry produces a ticket with a reference
(`UTS-2026-001`) that the student is told to keep for the technical rehearsal.

**The line-up.** Every entry appears in a searchable table that can be
filtered by category, sorted three ways, exported to CSV for the organisers,
and withdrawn from.

**Persistence.** Entries are kept in `localStorage`, so they survive a reload.
Because there is no server, they live only in the browser that created them —
the footer says so, since this is a demonstration project.

---

## How it is put together

| File | Role |
| --- | --- |
| `index.html` | Structure, the inline SVG stage backdrop, and all copy |
| `styles.css` | Design tokens, layout, component styles, motion |
| `app.js` | `Config`, `Store`, `State`, `Validate`, `Render`, `Csv` |

`app.js` is organised so that each module owns exactly one job: only `Render`
touches the DOM and only `Store` touches storage, which keeps the validation
and state logic straightforward to follow and to test.

The background is an inline SVG — spotlight beams, curtains, a stage floor and
a crowd silhouette — rather than a photograph, so the page stays a few tens of
kilobytes, scales to any screen without blurring, and loads nothing from a
third party.

## Details worth noting

- Accessible form markup: labels, `aria-describedby` error messages,
  `aria-live` regions for the counters and the toast.
- `prefers-reduced-motion` is respected — the spotlight sway and count-ups stop.
- All user text is escaped before it reaches the DOM.
- `localStorage` access is wrapped so the page still works where it is blocked.
- Responsive from 320px up, with no horizontal overflow.

## Running it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

---

Built by [Nura M. Ahmed](https://nura-ahm.github.io/).
