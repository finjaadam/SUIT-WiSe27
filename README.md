# SUIT-WiSe27
Museumsanwendung mit Bodytracking zum Thema körperliche und geistige Fitness

## Voraussetzungen

- [Node.js](https://nodejs.org/) inklusive npm
- Eine Webcam
- Ein aktueller Browser (Chrome, Edge oder Firefox)

## Projekt starten

Die Abhängigkeiten liegen an zwei Stellen und müssen beide installiert werden:

- `package.json` im Hauptverzeichnis: `@mediapipe/tasks-vision` (Bodytracking)
- `init/package.json`: Vite und TypeScript (Dev-Server und Build)

```bash
# 1. Abhängigkeiten im Hauptverzeichnis installieren (MediaPipe)
npm install

# 2. In die App wechseln und ihre Abhängigkeiten installieren (Vite, TypeScript)
cd init
npm install

# 3. Dev-Server starten
npm run dev
```

Danach die Adresse öffnen, die Vite im Terminal ausgibt (meistens http://localhost:5173), und den Kamerazugriff im Browser erlauben. Das Kamerabild wird nicht angezeigt, nur das erkannte Skelett (Linien und Gelenkpunkte).

## Weitere Befehle (im Ordner `init`)

| Befehl            | Beschreibung                                         |
|-------------------|------------------------------------------------------|
| `npm run dev`     | Startet den Dev-Server mit Hot Reload                |
| `npm run build`   | Prüft die Typen mit `tsc` und baut die App nach `dist/` |
| `npm run preview` | Startet einen lokalen Server für den gebauten Stand  |

## Fehlerbehebung

- **Kein Bild bzw. Skelett:** Prüfen, ob der Browser Zugriff auf die Kamera hat. `getUserMedia` funktioniert nur über `localhost` oder HTTPS.
- **`Failed to resolve import "@mediapipe/tasks-vision"`:** `npm install` wurde im Hauptverzeichnis nicht ausgeführt (Schritt 1).
- **Fehler beim Laden des Modells:** In der Browser-Konsole nach `KRITISCHER FEHLER` suchen. Die Dateien in `init/public/models` und `init/public/wasm` müssen vorhanden sein.
