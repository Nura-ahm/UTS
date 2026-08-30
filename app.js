/*
 * University Talent Show — registration
 *
 * Entries live in memory for the length of the session: registering adds a
 * talent to the list, selecting one shows their details, and removing one
 * takes it back out. No backend, no build step — just the DOM.
 */

const CATEGORIES = ['Dancing', 'Singing', 'Magic', 'Story telling', 'Comedy'];

/** One registered act. */
class Talent {
  constructor(name, major, studentId, category) {
    this.name = name;
    this.major = major;
    this.studentId = studentId;
    this.category = category;
  }
}

const talents = [];

const form = document.querySelector('#registration-form');
const categorySelect = document.querySelector('#category');
const listElement = document.querySelector('#talent-list');
const countElement = document.querySelector('#count');
const detailsElement = document.querySelector('#details');
const emptyNote = document.querySelector('#empty-note');

/** Fills the category dropdown from the CATEGORIES list. */
function populateCategories() {
  for (const category of CATEGORIES) {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.append(option);
  }
}

/** Redraws the line-up and the counter from the talents array. */
function render() {
  listElement.replaceChildren();

  talents.forEach((talent, index) => {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center';

    const label = document.createElement('button');
    label.type = 'button';
    label.className = 'btn btn-link p-0 text-decoration-none text-start text-body';
    label.textContent = `${talent.name} — ${talent.category}`;
    label.addEventListener('click', () => showDetails(talent));

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn-close';
    remove.setAttribute('aria-label', `Remove ${talent.name}`);
    remove.addEventListener('click', () => {
      talents.splice(index, 1);
      detailsElement.replaceChildren();
      render();
    });

    item.append(label, remove);
    listElement.append(item);
  });

  countElement.textContent = String(talents.length);
  emptyNote.hidden = talents.length > 0;
}

/** Shows one act's full details under the list. */
function showDetails(talent) {
  const card = document.createElement('div');
  card.className = 'border rounded p-3 bg-body-tertiary';
  card.innerHTML = `
    <div class="fw-semibold">${escapeHtml(talent.name)}</div>
    <div class="small text-secondary">
      ${escapeHtml(talent.major)} · ID ${escapeHtml(talent.studentId)} · ${escapeHtml(talent.category)}
    </div>`;
  detailsElement.replaceChildren(card);
}

/** Keeps user input from being treated as markup. */
function escapeHtml(value) {
  const span = document.createElement('span');
  span.textContent = value;
  return span.innerHTML;
}

form.addEventListener('submit', (event) => {
  event.preventDefault();

  // Bootstrap's own validation styling, driven by the browser's constraint API.
  if (!form.checkValidity()) {
    form.classList.add('was-validated');
    return;
  }

  talents.push(new Talent(
    document.querySelector('#name').value.trim(),
    document.querySelector('#major').value.trim(),
    document.querySelector('#student-id').value.trim(),
    categorySelect.value,
  ));

  form.reset();
  form.classList.remove('was-validated');
  categorySelect.selectedIndex = 0;
  render();
});

populateCategories();
render();
