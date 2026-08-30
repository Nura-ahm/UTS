# University Talent Show — Registration

A registration page for a campus talent show. Students enter their details and
category, the entry joins a live line-up, and selecting an act shows the full
details. Everything runs in the browser: no backend, no build step.

**[Live demo →](https://nura-ahm.github.io/UTS/)**

## What it does

- A validated form (name, major, student ID, category) using the browser's own
  constraint validation, styled by Bootstrap.
- Entries are held as `Talent` objects and rendered from that array, so the
  list, the counter and the details panel always agree.
- Click an act to see their details; the close button removes them again.
- User input is escaped before it reaches the DOM.

## Built with

Vanilla JavaScript, HTML and Bootstrap 5. No dependencies to install.

## Running it locally

```bash
git clone https://github.com/Nura-ahm/UTS.git
cd UTS
open index.html        # or just double-click it
```

## Structure

```
index.html   markup and layout
app.js       registration logic and rendering
styles.css   a few touches on top of Bootstrap
```

## Author

Nura M. Ahmed — [nura-ahm.github.io](https://nura-ahm.github.io)
