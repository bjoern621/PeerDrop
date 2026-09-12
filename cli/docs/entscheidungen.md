# Entscheidungen

Festgelegte Punkte des Entwurfs, je einer pro Zeile.

## Umfang

- Zielsysteme: Linux amd64 und Windows amd64.
- Ein Terminal verbindet sich mit einem Browser oder mit einem zweiten Terminal, alle Paarungen sind gleichwertig.
- Ausgabe des Clients auf Englisch.
- Kein Login, keine Geräte, kein Quick Connect.
- Ordner werden abgelehnt, mit Hinweis auf `tar cz ORDNER | peerdrop - --name ordner.tgz`.
- Das Signaling-Protokoll bleibt unverändert.
  Das Backend sammelt zusätzlich WebSocket-Fragmente bis 64 KiB.
- Härtung von Token und Anfragerate liegt außerhalb dieses Entwurfs.

## Bootstrap

- Der Einzeiler lädt eine Binärdatei.
- Ohne Argumente wartet der Client im aktuellen Ordner auf eine Verbindung.
- Argumente laufen über `sh -s --`, unter PowerShell über einen Scriptblock.
- Der Einzeiler nennt `https://`, das Skript wird nie über `http://` ausgeliefert.
- Binärdateien liegen als GitHub-Release-Assets, die Skripte im Frontend-Image.
- Prüfsummen werden verglichen, wenn ein Werkzeug dafür vorhanden ist.
- Die Binärdatei ist unsigniert.
- Der Cache ist nach Version benannt und liegt außerhalb von `PATH`.

## Sitzung

- Eine Sitzung sendet und empfängt gleichzeitig, ohne Rollenwahl beim Aufruf.
- Eingehende Anfragen werden ohne Rückfrage bestätigt.
- Die Sitzung endet mit dem Peer, mit `quit`, Strg+C oder `--exit-after-send`.
- Ausgehende Dateien laufen nacheinander, eingehende parallel.
- Pfade werden auf der Eingabezeile nachgereicht, nur ein explizites `-` liest Daten von stdin.
- Fortschritt als Balken je Transfer mit Eingabezeile darunter, ohne TUI-Bibliothek.
- Senden gilt als abgeschlossen, wenn der Kanal nach leerem Puffer geschlossen ist.
  Schreiben auf Platte beim Peer bleibt unbestätigt.

## Dateien

- Der Empfänger nimmt den Basename, ersetzt leere Namen, schreibt nach `.part` und benennt um.
- Vorhandene Namen bekommen ein Suffix, `--overwrite` ersetzt.
- Die Webseite bekommt denselben minimalen Basename-Schutz.
- stdin wird gespoolt, weil das Format Größe und Blockzahl vor dem ersten Byte verlangt.
- `--stdout` spoolt ebenfalls, weil Blöcke ungeordnet ankommen.

## Protokoll und Konfiguration

- Der Client spricht das Browser-Protokoll unverändert.
- ICE-Server stehen in `/envvars.json` unter `iceServers`, Webseite und Client lesen sie von dort, der Client fällt auf eingebaute Werte zurück.
- SDP wird auf die Pflichtzeilen gekürzt, damit es in ein Frame passt.

## Stack und Prüfung

- Go mit pion/webrtc, `go` im Nix-DevShell, `gofmt` und `go vet` als Prüfer.
- Unit-Tests, Integrationstest Terminal gegen Terminal im Testprozess, Windows-Smoke-Test in CI.
- Browser-Interoperabilität per Checkliste je Release.

## Berührte Stellen außerhalb von `cli/`

- Backend: WebSocket-Fragmente sammeln.
- `frontend/public/cli`, `frontend/public/cli.ps1`: Bootstrap-Skripte.
- `frontend/nginx.conf`: Locations für beide Skripte mit `text/plain`.
- `frontend/entrypoint.sh`, `frontend/Dockerfile`: Host und Version einsetzen.
- `frontend/envvars.sh` und die Webseite: `iceServers` in `/envvars.json`.
- Webseite: Basename-Schutz beim Empfang.
- `.github/workflows/cd.yml`, `.github/workflows/cli.yml`: Release-Job und PR-Prüfung.
- `flake.nix`: `go`.
