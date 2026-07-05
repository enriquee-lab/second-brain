# 🧠 Second Brain

Eine schlanke Notizen-Web-App, die Wissen nicht nur speichert, sondern **nutzbar** macht: festhalten, ordnen, per KI verdichten und über alle Notizen hinweg befragen. Aufgebaut nach dem **CODE-Prinzip** von Tiago Forte (*Building a Second Brain*). Kein Framework, kein Backend, kein Login: einfach öffnen und loslegen.

**▶️ Live-Demo:** https://enriquee-lab.github.io/second-brain/

---

## Vorschau

![Screenshot der Second-Brain-App](screenshot.png)

## Die vier Schritte (CODE)

Die App bildet den Wissens-Workflow **Capture → Organize → Distill → Express** ab:

| Schritt | In der App |
|---------|------------|
| **Capture** – festhalten | Schneller Composer für Titel, Inhalt und Tags |
| **Organize** – ordnen | Tags, **PARA-Kategorie** (Projekt/Bereich/Ressource/Archiv), Anpinnen, Suche & Filter |
| **Distill** – verdichten | **KI-Auto-Tagging** und **KI-Kernaussage** (Notiz auf einen Satz verdichten) |
| **Express** – nutzen | **„Frag dein Second Brain"** – die KI synthetisiert eine Antwort aus allen Notizen |

## Features

- **Notizen anlegen, bearbeiten und anpinnen** – wichtige Notizen bleiben oben
- **PARA-Kategorien** zur Organisation nach Actionability (Projekt, Bereich, Ressource, Archiv)
- **„Frag dein Second Brain"** – KI beantwortet Fragen auf Basis *deiner* Notizen und nennt die genutzten Quellen
- **KI-Auto-Tagging** und **KI-Kernaussage** per Google-Gemini-API
- **Volltextsuche** über Titel, Inhalt, Kernaussage und Tags · **Tag- & PARA-Filter** per Klick
- **Export & Import** als JSON – volle Datenhoheit
- **Galerie-Ansicht** im editorialen Masonry-Layout
- **Lebendiger Wissensgraph** als animierter Hintergrund – ein Netz verknüpfter Notizen, das die Idee des „zweiten Gehirns" sichtbar macht
- **Lokale Speicherung** im Browser (`localStorage`) – die Daten bleiben auf deinem Gerät
- **Responsive** und barrierearm (Fokus-Ringe, `prefers-reduced-motion`)

## KI-Auto-Tagging einrichten (optional)

Die KI-Funktionen (Auto-Tagging, Kernaussage, „Frag dein Second Brain") nutzen die **Google-Gemini-API**, die einen kostenlosen Tarif ohne Kreditkarte bietet.

1. Kostenlosen API-Key erstellen bei [Google AI Studio](https://aistudio.google.com/apikey)
2. In der App oben rechts auf **✨ KI** klicken
3. Key einfügen und **Speichern**

Der Key wird ausschließlich lokal in deinem Browser gespeichert und landet nie im Repository.

## Tech-Stack

- **HTML, CSS, JavaScript** (Vanilla, bewusst ohne Framework)
- **Google Gemini API** für die KI-Funktionen (Tags, Kernaussage, Frage-Antwort)
- **GitHub Pages** für das Hosting

## Lokal starten

Kein Build-Schritt nötig – einfach die Datei `index.html` im Browser öffnen.

## Architektur & Entscheidungen

Bewusst klein gehalten – wenige Dateien, kein Framework, kein Backend:

| Datei | Aufgabe |
|-------|---------|
| `index.html` | Struktur & Semantik |
| `style.css` | Design-Tokens (CSS-Variablen) & Layout |
| `script.js` | Zustand, Rendering, `localStorage`, KI-Aufrufe (zentraler `callGemini`-Helper) |
| `graph-bg.js` | Eigenständiger Canvas-Wissensgraph im Hintergrund (rein dekorativ, entkoppelt von der App-Logik) |

**Warum flach statt Ordnerstruktur?** Bei so wenigen Dateien erzeugt ein `src/`-Baum
mehr Overhead als Nutzen. Die Struktur soll dem Umfang entsprechen – nicht
umgekehrt. Wächst das Projekt (Bearbeiten, Export/Import, Tests), ist ein
Schnitt in `src/` und `assets/` der nächste sinnvolle Schritt.

**Warum Vanilla JS?** Ziel war ein schneller, transparenter MVP ohne Build-Kette.
Jeder kann die App verstehen und in Sekunden lokal starten – ideal, um eine Idee
zu validieren, bevor man in Framework-Komplexität investiert.

## Sicherheit & Umgang mit dem API-Key

Der Gemini-API-Key wird **ausschließlich clientseitig** in `localStorage`
gehalten und direkt vom Browser an die Google-API geschickt – er landet nie im
Repository und wird über keinen eigenen Server geleitet.

Bewusster Trade-off: `localStorage` ist für einen clientseitigen MVP pragmatisch,
aber für JavaScript auf derselben Seite lesbar (Risiko bei XSS). Für einen
produktiven Einsatz mit fremden Nutzern gehört der Key hinter eine
Serverless-Funktion (siehe Roadmap), damit er den Client nie erreicht. Für eine
lokale Einzelnutzer-App ist die aktuelle Lösung angemessen und einfach.

## Roadmap

- [x] Bestehende Notizen bearbeiten
- [x] Notizen exportieren und importieren (JSON)
- [x] KI-Kernaussage (Distill) und KI-Frage-Antwort über alle Notizen (Express)
- [ ] KI-Funktionen optional über eine Serverless-Funktion (z. B. Vercel), damit Besucher ohne eigenen Key nutzen können
- [ ] Verknüpfte Notizen (`[[wiki-links]]`) und Backlinks
- [ ] Progressive Summarization (mehrstufiges Hervorheben)

## Methodik

Konzept angelehnt an Tiago Fortes *Building a Second Brain* – **CODE** (Capture, Organize, Distill, Express) und **PARA** (Projects, Areas, Resources, Archives). Mehr dazu: [buildingasecondbrain.com](https://www.buildingasecondbrain.com/) und die [Definitive Introductory Guide von Forte Labs](https://fortelabs.com/blog/basboverview/).

---

Gebaut als iteratives, KI-unterstütztes Lernprojekt.
