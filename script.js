const STORAGE_KEY = 'second-brain-notes';

const titleInput = document.getElementById('title-input');
const contentInput = document.getElementById('content-input');
const tagsInput = document.getElementById('tags-input');
const addBtn = document.getElementById('add-btn');
const searchInput = document.getElementById('search-input');
const tagFiltersEl = document.getElementById('tag-filters');
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');

let notes = loadNotes();
let activeTag = null;

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function parseTags(raw) {
  return raw
    .split(',')
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

function addNote() {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = parseTags(tagsInput.value);

  if (!title && !content) return;

  notes.unshift({
    id: Date.now().toString(),
    title: title || '(ohne Titel)',
    content,
    tags,
    createdAt: new Date().toISOString()
  });

  saveNotes();
  titleInput.value = '';
  contentInput.value = '';
  tagsInput.value = '';
  render();
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  render();
}

function getAllTags() {
  const set = new Set();
  notes.forEach(n => n.tags.forEach(t => set.add(t)));
  return [...set].sort();
}

function renderTagFilters() {
  const tags = getAllTags();
  tagFiltersEl.innerHTML = '';
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'tag-chip' + (activeTag === tag ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      activeTag = activeTag === tag ? null : tag;
      render();
    });
    tagFiltersEl.appendChild(btn);
  });
}

function renderNotes() {
  const query = searchInput.value.trim().toLowerCase();

  const filtered = notes.filter(n => {
    const matchesQuery =
      !query ||
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      n.tags.some(t => t.includes(query));

    const matchesTag = !activeTag || n.tags.includes(activeTag);

    return matchesQuery && matchesTag;
  });

  notesGrid.innerHTML = '';
  emptyState.hidden = notes.length > 0;

  filtered.forEach(note => {
    const card = document.createElement('article');
    card.className = 'note-card';

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.setAttribute('aria-label', `Notiz "${note.title}" löschen`);
    del.textContent = '✕';
    del.addEventListener('click', () => deleteNote(note.id));

    const h3 = document.createElement('h3');
    h3.textContent = note.title;

    const p = document.createElement('p');
    p.textContent = note.content;

    const tagsWrap = document.createElement('div');
    tagsWrap.className = 'note-tags';
    note.tags.forEach(tag => {
      const span = document.createElement('span');
      span.textContent = tag;
      tagsWrap.appendChild(span);
    });

    card.append(del, h3, p, tagsWrap);
    notesGrid.appendChild(card);
  });
}

function render() {
  renderTagFilters();
  renderNotes();
}

addBtn.addEventListener('click', addNote);
searchInput.addEventListener('input', renderNotes);

[titleInput, tagsInput].forEach(el =>
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') addNote();
  })
);

render();
