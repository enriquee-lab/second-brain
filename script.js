const STORAGE_KEY = 'second-brain-notes';
const API_KEY_STORAGE = 'second-brain-gemini-key';

const titleInput = document.getElementById('title-input');
const contentInput = document.getElementById('content-input');
const tagsInput = document.getElementById('tags-input');
const addBtn = document.getElementById('add-btn');
const autotagBtn = document.getElementById('autotag-btn');
const searchInput = document.getElementById('search-input');
const tagFiltersEl = document.getElementById('tag-filters');
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const keyInput = document.getElementById('key-input');
const saveKeyBtn = document.getElementById('save-key-btn');

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

    const meta = document.createElement('div');
    meta.className = 'note-meta';
    meta.textContent = new Date(note.createdAt).toLocaleDateString('de-DE', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    card.append(del, h3, p, tagsWrap, meta);
    notesGrid.appendChild(card);
  });
}

function render() {
  renderTagFilters();
  renderNotes();
}

// --- KI-Einstellungen (API-Key) ---

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function toggleSettings() {
  settingsPanel.hidden = !settingsPanel.hidden;
  if (!settingsPanel.hidden) {
    keyInput.value = getApiKey();
    keyInput.focus();
  }
}

function saveApiKey() {
  const key = keyInput.value.trim();
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key);
    saveKeyBtn.textContent = '✓ Gespeichert';
    setTimeout(() => {
      saveKeyBtn.textContent = 'Speichern';
      settingsPanel.hidden = true;
    }, 1200);
  } else {
    localStorage.removeItem(API_KEY_STORAGE);
    settingsPanel.hidden = true;
  }
}

// --- KI-Auto-Tagging via Gemini ---

async function suggestTags() {
  const key = getApiKey();
  if (!key) {
    alert('Bitte zuerst deinen Gemini-API-Key unter "⚙ KI" speichern.');
    toggleSettings();
    return;
  }

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title && !content) {
    alert('Schreib zuerst einen Titel oder Inhalt, dann kann die KI Tags vorschlagen.');
    return;
  }

  autotagBtn.disabled = true;
  autotagBtn.textContent = '…';

  const prompt =
    'Schlage 3 bis 5 kurze, thematische Tags fuer die folgende Notiz vor. ' +
    'Regeln: einzelne Woerter, kleingeschrieben, auf Deutsch. ' +
    'Antworte NUR mit den Tags, kommagetrennt, ohne weitere Erklaerung.\n\n' +
    'Titel: ' + title + '\nInhalt: ' + content;

  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    if (!res.ok) throw new Error('API-Fehler ' + res.status);

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const suggested = parseTags(text.replace(/\n/g, ' '));

    if (suggested.length === 0) throw new Error('Keine Tags in der Antwort');

    const merged = [...new Set([...parseTags(tagsInput.value), ...suggested])];
    tagsInput.value = merged.join(', ');
  } catch (e) {
    alert('Konnte keine Tags erzeugen: ' + e.message);
  } finally {
    autotagBtn.disabled = false;
    autotagBtn.textContent = '✨ Tags';
  }
}

addBtn.addEventListener('click', addNote);
autotagBtn.addEventListener('click', suggestTags);
settingsBtn.addEventListener('click', toggleSettings);
saveKeyBtn.addEventListener('click', saveApiKey);
searchInput.addEventListener('input', renderNotes);

[titleInput, tagsInput].forEach(el =>
  el.addEventListener('keydown', e => {
    if (e.key === 'Enter') addNote();
  })
);

render();
