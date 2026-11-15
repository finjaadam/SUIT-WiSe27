# SUIT-WiSe27
Museumsanwendung mit Bodytracking zum Thema körperliche und geistige Fitness

## Voraussetzungen

- [Node.js](https://nodejs.org/) inklusive npm
- Eine Webcam
- Ein aktueller Browser (Chrome, Edge oder Firefox)

## Aufbau

Das Repo ist ein npm-Workspace: Alle Abhängigkeiten (MediaPipe, Vite, TypeScript) stehen in der `package.json` im Hauptverzeichnis und werden einmal gemeinsam installiert.

| Ordner     | Inhalt                                                                 |
|------------|------------------------------------------------------------------------|
| `project1` | Interaktion 1                                                          |
| `project2` | Interaktion 2                                                          |
| `shared`   | Gemeinsam genutzt: Pose-Modell (`shared/models`) und `createPoseLandmarker()` (`shared/poseLandmarker.ts`) |

Ebenfalls zentral im Hauptverzeichnis: `.gitignore` und `tsconfig.base.json`, die jedes Projekt per `extends` übernimmt. Die WASM-Dateien kommen direkt aus `@mediapipe/tasks-vision`.

## Projekt starten

```bash
# 1. Einmalig im Hauptverzeichnis alle Abhängigkeiten installieren
npm install

# 2. Dev-Server eines Projekts starten
npm run dev -w project1    # Interaktion 1
npm run dev -w project2    # Interaktion 2
```

Alternativ im jeweiligen Projektordner `npm run dev` ausführen.

Danach die Adresse öffnen, die Vite im Terminal ausgibt (meistens http://localhost:5173, laufen zwei Projekte gleichzeitig, bekommt das zweite den nächsten freien Port), und den Kamerazugriff im Browser erlauben. Das Kamerabild wird nicht angezeigt, nur das erkannte Skelett (Linien und Gelenkpunkte).

## Weitere Befehle (mit `-w <projekt>` oder im Projektordner)

| Befehl            | Beschreibung                                         |
|-------------------|------------------------------------------------------|
| `npm run dev`     | Startet den Dev-Server mit Hot Reload                |
| `npm run build`   | Prüft die Typen mit `tsc` und baut die App nach `dist/` |
| `npm run preview` | Startet einen lokalen Server für den gebauten Stand  |

## Neues Projekt anlegen

1. Ordner mit `index.html`, `src/`, `package.json` (Name und Skripte wie in `project2`) und `tsconfig.json` (`extends` auf `../tsconfig.base.json`) anlegen
2. Ordner in der `package.json` im Hauptverzeichnis unter `workspaces` eintragen
3. Im Hauptverzeichnis `npm install` ausführen

## Fehlerbehebung

- **Kein Bild bzw. Skelett:** Prüfen, ob der Browser Zugriff auf die Kamera hat. `getUserMedia` funktioniert nur über `localhost` oder HTTPS.
- **`Failed to resolve import "@mediapipe/tasks-vision"` oder `vite` nicht gefunden:** `npm install` wurde im Hauptverzeichnis nicht ausgeführt (Schritt 1).
- **Nach dem Wechsel auf die Workspace-Struktur:** Alte `node_modules`-Ordner im früheren Ordner `init` bzw. den Projektordnern löschen und im Hauptverzeichnis `npm install` ausführen.
- **Fehler beim Laden des Modells:** Browser-Konsole prüfen. Das Modell muss in `shared/models` liegen.

## Soundeffekte
### Interaction 1
Music: Sound Effect  by <a href="https://pixabay.com/users/meowmusic-57149811/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=589088">Chinku Agrawal</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=589088">Pixabay</a>
Game Start: Sound Effect by <a href="https://pixabay.com/de/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=250240">Official Profile</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=250240">Pixabay</a>
Stop: Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=125761">Official Profile</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=125761">Pixabay</a>
end screen: Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6185">freesound_community</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=6185">Pixabay</a>
Not finished after 2 minutes: Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=126515">Official Profile</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=126515">Pixabay</a>

## Ressourcen
### Interaction 1
Katzen-Modell: <a href="https://sketchfab.com/3d-models/toon-cat-free-b2bd1ee7858444bda366110a2d960386">Toon Cat by Omabuarts Studio</a>
