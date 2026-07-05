/**
 * Second Brain — client-only Notiz-App (kein Backend, kein Build).
 *
 * Aufgebaut nach dem CODE-Prinzip (Tiago Forte, "Building a Second Brain"):
 *   Capture  – Notizen schnell festhalten (Composer)
 *   Organize – Tags + PARA-Kategorie, Pinnen, Suche & Filter
 *   Distill  – KI verdichtet eine Notiz auf ihre Kernaussage
 *   Express  – "Frag dein Second Brain": KI synthetisiert aus allen Notizen
 *
 * Datenmodell (eine Notiz):
 *   id        string   – eindeutige ID (Zeitstempel)
 *   title     string   – Titel (Fallback "(ohne Titel)")
 *   content   string   – Freitext
 *   tags      string[] – kleingeschrieben, dedupliziert
 *   para      string   – "" | projekt | bereich | ressource | archiv
 *   pinned    boolean  – angepinnte Notizen stehen oben
 *   summary   string   – KI-Kernaussage (Distill), optional
 *   createdAt string   – ISO-Datum
 *
 * Persistenz: localStorage. Alle Daten bleiben auf dem Gerät des Nutzers.
 * Der optionale Gemini-API-Key liegt getrennt unter API_KEY_STORAGE
 * und wird nur clientseitig verwendet (siehe README, Abschnitt Sicherheit).
 */
const STORAGE_KEY = 'second-brain-notes';
const API_KEY_STORAGE = 'second-brain-gemini-key';
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';

const PARA_LABELS = {
  projekt: 'Projekt',
  bereich: 'Bereich',
  ressource: 'Ressource',
  archiv: 'Archiv'
};

// --- DOM-Referenzen ---
const titleInput = document.getElementById('title-input');
const contentInput = document.getElementById('content-input');
const tagsInput = document.getElementById('tags-input');
const paraInput = document.getElementById('para-input');
const addBtn = document.getElementById('add-btn');
const autotagBtn = document.getElementById('autotag-btn');
const editBanner = document.getElementById('edit-banner');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const askInput = document.getElementById('ask-input');
const askBtn = document.getElementById('ask-btn');
const askAnswer = document.getElementById('ask-answer');
const askAnswerBody = document.getElementById('ask-answer-body');
const askClose = document.getElementById('ask-close');

const searchInput = document.getElementById('search-input');
const paraFiltersEl = document.getElementById('para-filters');
const tagFiltersEl = document.getElementById('tag-filters');
const notesGrid = document.getElementById('notes-grid');
const emptyState = document.getElementById('empty-state');
const emptyText = document.getElementById('empty-text');
const noteCountEl = document.getElementById('note-count');

const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const keyInput = document.getElementById('key-input');
const saveKeyBtn = document.getElementById('save-key-btn');

const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFile = document.getElementById('import-file');

let notes = loadNotes();
let activeTag = null;
let activePara = null;
let editingId = null; // null = neue Notiz, sonst wird bestehende bearbeitet

// --- Persistenz & Datenmodell ---

/** Ältere Notizen können neue Felder nicht kennen — hier defensiv auffüllen. */
function normalizeNote(n) {
  return {
    id: n.id || Date.now().toString(),
    title: n.title || '(ohne Titel)',
    content: n.content || '',
    tags: Array.isArray(n.tags) ? n.tags : [],
    para: n.para || '',
    pinned: !!n.pinned,
    summary: n.summary || '',
    createdAt: n.createdAt || new Date().toISOString()
  };
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeNote) : [];
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

// --- CAPTURE / ORGANIZE: Notiz anlegen & bearbeiten ---

function addNote() {
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const tags = parseTags(tagsInput.value);
  const para = paraInput.value;

  if (!title && !content) return;

  if (editingId) {
    // Bestehende Notiz aktualisieren (Felder, die die UI nicht verwaltet, bleiben erhalten)
    const note = notes.find(n => n.id === editingId);
    if (note) {
      note.title = title || '(ohne Titel)';
      note.content = content;
      note.tags = tags;
      note.para = para;
    }
    stopEditing();
  } else {
    notes.unshift({
      id: Date.now().toString(),
      title: title || '(ohne Titel)',
      content,
      tags,
      para,
      pinned: false,
      summary: '',
      createdAt: new Date().toISOString()
    });
  }

  saveNotes();
  clearComposer();
  render();
}

function clearComposer() {
  titleInput.value = '';
  contentInput.value = '';
  tagsInput.value = '';
  paraInput.value = '';
}

function startEditing(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  editingId = id;
  titleInput.value = note.title === '(ohne Titel)' ? '' : note.title;
  contentInput.value = note.content;
  tagsInput.value = note.tags.join(', ');
  paraInput.value = note.para;
  editBanner.hidden = false;
  addBtn.textContent = 'Aktualisieren';
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function stopEditing() {
  editingId = null;
  editBanner.hidden = true;
  addBtn.textContent = 'Notiz speichern';
}

function cancelEditing() {
  stopEditing();
  clearComposer();
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  if (editingId === id) cancelEditing();
  saveNotes();
  render();
}

function togglePin(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  saveNotes();
  render();
}

// --- ORGANIZE: Tags & PARA-Filter ---

function getAllTags() {
  const set = new Set();
  notes.forEach(n => n.tags.forEach(t => set.add(t)));
  return [...set].sort();
}

function renderParaFilters() {
  const present = [...new Set(notes.map(n => n.para).filter(Boolean))];
  const order = ['projekt', 'bereich', 'ressource', 'archiv'];
  const sorted = order.filter(p => present.includes(p));

  paraFiltersEl.innerHTML = '';
  sorted.forEach(para => {
    const btn = document.createElement('button');
    btn.className = 'para-chip para-' + para + (activePara === para ? ' active' : '');
    btn.textContent = PARA_LABELS[para];
    btn.addEventListener('click', () => {
      activePara = activePara === para ? null : para;
      render();
    });
    paraFiltersEl.appendChild(btn);
  });
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

// --- Rendering der Notizen ---

function getFilteredNotes() {
  const query = searchInput.value.trim().toLowerCase();
  return notes.filter(n => {
    const matchesQuery =
      !query ||
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query) ||
      n.summary.toLowerCase().includes(query) ||
      n.tags.some(t => t.includes(query));
    const matchesTag = !activeTag || n.tags.includes(activeTag);
    const matchesPara = !activePara || n.para === activePara;
    return matchesQuery && matchesTag && matchesPara;
  });
}

function iconBtn(cls, label, glyph, handler) {
  const b = document.createElement('button');
  b.className = cls;
  b.setAttribute('aria-label', label);
  b.title = label;
  b.textContent = glyph;
  b.addEventListener('click', handler);
  return b;
}

function renderNotes() {
  const filtered = getFilteredNotes()
    // Angepinnte zuerst, sonst Reihenfolge unverändert lassen
    .slice()
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  notesGrid.innerHTML = '';

  if (notes.length === 0) {
    emptyState.hidden = false;
    emptyText.textContent = 'Noch keine Notizen. Leg oben deine erste an.';
  } else if (filtered.length === 0) {
    emptyState.hidden = false;
    emptyText.textContent = 'Keine Treffer. Andere Suche oder anderen Filter probieren.';
  } else {
    emptyState.hidden = true;
  }

  filtered.forEach(note => {
    const card = document.createElement('article');
    card.className = 'note-card' + (note.pinned ? ' pinned' : '');

    // Aktions-Cluster oben rechts
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      iconBtn('icon-btn pin-btn' + (note.pinned ? ' active' : ''),
        note.pinned ? 'Loslösen' : 'Anpinnen', '📌', () => togglePin(note.id)),
      iconBtn('icon-btn', 'Bearbeiten', '✎', () => startEditing(note.id)),
      iconBtn('icon-btn delete-btn', `Notiz "${note.title}" löschen`, '✕', () => deleteNote(note.id))
    );

    // PARA-Badge oben links
    if (note.para) {
      const badge = document.createElement('span');
      badge.className = 'para-badge para-' + note.para;
      badge.textContent = PARA_LABELS[note.para];
      card.appendChild(badge);
    }

    const h3 = document.createElement('h3');
    h3.textContent = note.title;

    const p = document.createElement('p');
    p.textContent = note.content;

    card.append(actions, h3, p);

    // Distill: Kernaussage (falls vorhanden)
    if (note.summary) {
      const sum = document.createElement('div');
      sum.className = 'note-summary';
      sum.innerHTML = '<span class="summary-label">Kernaussage</span>';
      const t = document.createElement('p');
      t.textContent = note.summary;
      sum.appendChild(t);
      card.appendChild(sum);
    }

    if (note.tags.length) {
      const tagsWrap = document.createElement('div');
      tagsWrap.className = 'note-tags';
      note.tags.forEach(tag => {
        const span = document.createElement('span');
        span.textContent = tag;
        tagsWrap.appendChild(span);
      });
      card.appendChild(tagsWrap);
    }

    // Footer: Datum + Distill-Button
    const footer = document.createElement('div');
    footer.className = 'note-footer';

    const meta = document.createElement('span');
    meta.className = 'note-meta';
    meta.textContent = new Date(note.createdAt).toLocaleDateString('de-DE', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const distill = document.createElement('button');
    distill.className = 'distill-btn';
    distill.textContent = note.summary ? '✨ Neu verdichten' : '✨ Verdichten';
    distill.title = 'Kernaussage per KI erzeugen';
    distill.addEventListener('click', () => distillNote(note.id, distill));

    footer.append(meta, distill);
    card.appendChild(footer);

    notesGrid.appendChild(card);
  });
}

function render() {
  renderParaFilters();
  renderTagFilters();
  renderNotes();
  noteCountEl.textContent = String(notes.length);
}

// --- KI-Einstellungen (API-Key) ---

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function requireApiKey() {
  const key = getApiKey();
  if (!key) {
    alert('Bitte zuerst deinen Gemini-API-Key unter "✨ KI" speichern.');
    toggleSettings(true);
  }
  return key;
}

function toggleSettings(forceOpen) {
  settingsPanel.hidden = forceOpen ? false : !settingsPanel.hidden;
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

// --- Gemini-Aufruf (zentral, damit alle KI-Funktionen dieselbe Logik nutzen) ---

async function callGemini(prompt) {
  const key = getApiKey();
  if (!key) throw new Error('Kein API-Key gesetzt');

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!res.ok) throw new Error('API-Fehler ' + res.status);

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) throw new Error('Leere Antwort der KI');
  return text.trim();
}

// --- DISTILL: Auto-Tagging ---

async function suggestTags() {
  if (!requireApiKey()) return;

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
    const text = await callGemini(prompt);
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

// --- DISTILL: Kernaussage einer Notiz ---

async function distillNote(id, btn) {
  if (!requireApiKey()) return;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = '…';

  const prompt =
    'Fasse die folgende Notiz in EINEM praegnanten deutschen Satz zusammen ' +
    '(die Kernaussage, max. 20 Woerter). Antworte NUR mit dem Satz.\n\n' +
    'Titel: ' + note.title + '\nInhalt: ' + note.content;

  try {
    note.summary = (await callGemini(prompt)).replace(/\s+/g, ' ').trim();
    saveNotes();
    render();
  } catch (e) {
    alert('Konnte keine Kernaussage erzeugen: ' + e.message);
    btn.disabled = false;
    btn.textContent = original;
  }
}

// --- EXPRESS: "Frag dein Second Brain" (Synthese ueber alle Notizen) ---

async function askBrain() {
  if (!requireApiKey()) return;
  const question = askInput.value.trim();
  if (!question) {
    askInput.focus();
    return;
  }
  if (notes.length === 0) {
    showAnswer('Es sind noch keine Notizen vorhanden, aus denen ich antworten koennte.');
    return;
  }

  askBtn.disabled = true;
  askBtn.textContent = '…';
  showAnswer('Ich durchsuche deine Notizen …', true);

  // Notizen als Kontext aufbereiten (kompakt halten)
  const context = notes
    .map((n, i) => {
      const tags = n.tags.length ? ' [' + n.tags.join(', ') + ']' : '';
      return `#${i + 1} ${n.title}${tags}\n${n.content}`;
    })
    .join('\n\n');

  const prompt =
    'Du bist das "zweite Gehirn" des Nutzers. Beantworte die Frage AUSSCHLIESSLICH ' +
    'auf Basis der folgenden Notizen. Wenn die Notizen keine Antwort hergeben, sage das ehrlich. ' +
    'Antworte kurz und konkret auf Deutsch und nenne am Ende in Klammern die genutzten Notiz-Nummern.\n\n' +
    '=== NOTIZEN ===\n' + context + '\n\n=== FRAGE ===\n' + question;

  try {
    const answer = await callGemini(prompt);
    showAnswer(answer);
  } catch (e) {
    showAnswer('Konnte die Frage nicht beantworten: ' + e.message);
  } finally {
    askBtn.disabled = false;
    askBtn.textContent = '✨ Fragen';
  }
}

function showAnswer(text, pending) {
  askAnswer.hidden = false;
  askAnswerBody.textContent = text;
  askAnswerBody.classList.toggle('pending', !!pending);
}

// --- Datenhoheit: Export / Import ---

function exportNotes() {
  const blob = new Blob([JSON.stringify(notes, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'second-brain-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importNotes(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed)) throw new Error('Kein gültiges Notizen-Format');
      const incoming = parsed.map(normalizeNote);
      const known = new Set(notes.map(n => n.id));
      const added = incoming.filter(n => !known.has(n.id));
      notes = [...added, ...notes];
      saveNotes();
      render();
      alert(added.length + ' Notiz(en) importiert.');
    } catch (e) {
      alert('Import fehlgeschlagen: ' + e.message);
    }
  };
  reader.readAsText(file);
}

// --- Events ---

addBtn.addEventListener('click', addNote);
cancelEditBtn.addEventListener('click', cancelEditing);
autotagBtn.addEventListener('click', suggestTags);
settingsBtn.addEventListener('click', () => toggleSettings());
saveKeyBtn.addEventListener('click', saveApiKey);
searchInput.addEventListener('input', renderNotes);

askBtn.addEventListener('click', askBrain);
askInput.addEventListener('keydown', e => { if (e.key === 'Enter') askBrain(); });
askClose.addEventListener('click', () => { askAnswer.hidden = true; });

exportBtn.addEventListener('click', exportNotes);
importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', e => {
  if (e.target.files[0]) importNotes(e.target.files[0]);
  e.target.value = '';
});

// Enter im Titel/Tag-Feld speichert; Cmd/Ctrl+Enter im Textfeld ebenso
[titleInput, tagsInput].forEach(el =>
  el.addEventListener('keydown', e => { if (e.key === 'Enter') addNote(); })
);
contentInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote();
});

render();
