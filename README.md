<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Wallet Tracker

Eine mobile-first Progressive Web App zur einfachen Erfassung, Kategorisierung und Analyse täglicher Ausgaben – inklusive Budgetplanung und persönlichem Gehalts-Zyklus.

## Features

- **Ausgaben erfassen** – Betrag, Kategorie und Beschreibung mit wenigen Taps
- **Übersicht & Analytics** – Monats-, Wochen- und Tagesansicht mit Trend-Chart, Kategorie-Donut und Vorperioden-Vergleich
- **Budgetplanung** – Manuelles Monatsbudget oder einkommensbasierter Sparplan mit Sparziel (€ oder %)
- **Gehalts-Zyklus** – Persönlicher Zahltag (1–28): Übersicht und Trend folgen deinem echten Abrechnungsmonat
- **Import / Export** – JSON-Backup und CSV-Import/Export mit Fehlerreporting
- **PWA & Offline** – Installierbar, funktioniert ohne Internetverbindung, automatische Updates

## Tech Stack

- React 19 + TypeScript, Vite 6
- Tailwind CSS 4, shadcn/ui
- Recharts, Embla Carousel, Motion
- vite-plugin-pwa (Service Worker, Offline-Cache)

## Lokal starten

**Voraussetzung:** Node.js

```bash
npm install
npm run dev
```

Die App läuft danach unter `http://localhost:3000`.

## Datenhaltung

Alle Daten werden ausschließlich lokal im Browser (`localStorage`) gespeichert. Es findet keine Übertragung an externe Server statt.
