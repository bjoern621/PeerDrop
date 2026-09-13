# PeerDrop

PeerDrop ist eine dezentrale P2P-Dateifreigabe-Plattform, die es dir ermöglicht, Dateien direkt von Gerät zu Gerät auszutauschen. Ohne Zwischenserver oder Cloud-Speicher behältst du jederzeit die volle Kontrolle über deine Daten. Die integrierte Ende-zu-Ende-Verschlüsselung sorgt dafür, dass nur Sender und Empfänger Zugriff auf sensible Informationen haben. Egal ob Fotos, Videos, Dokumente oder beliebige andere Dateien – PeerDrop verbindet deine Geräte nahtlos.

## Features

-   **Ende-zu-Ende-Verschlüsselung** für maximale Privatsphäre
-   **Serverloser Transfer**: Deine Dateien werden nirgendwo zwischengespeichert
-   **Plattformübergreifend**: Unterstützt Windows, macOS, Linux, Android, iOS, ...
-   **Hohe Übertragungsgeschwindigkeit** dank direkter P2P-Verbindung
-   **Terminal-Client** für Rechner ohne Browser

## How To Use

### Im Browser

1. Besuche https://peerdrop.de/.
2. Gib die Peer-ID des Empfängers an.
3. Warte bis dein Peer die Verbindung bestätigt hat.
4. Wähle beliebig viele Dateien per Drag & Drop oder Datei-Auswahl.
5. Das wars! 🚀

### Im Terminal

Der Terminal-Client sendet und empfängt ohne Browser, auf Linux und Windows.
Ein Einzeiler lädt ihn und startet die Sitzung, eine Installation ist nicht nötig.

Linux:

```sh
curl -fsSL https://peerdrop.de/cli | sh
```

Windows (PowerShell):

```powershell
irm https://peerdrop.de/cli.ps1 | iex
```

Ohne Argumente zeigt der Client sein Token, das dein Peer auf https://peerdrop.de/connect eingibt.
Token und Dateien lassen sich direkt übergeben, etwa `curl -fsSL https://peerdrop.de/cli | sh -s -- babab ./report.pdf`.
Alle Optionen stehen in [cli/README.md](cli/README.md).

## Wichtige Links

-   [Termine (Wiki)](https://github.com/bjoern621/PeerDrop/wiki/Termine)
-   [Sprint Backlog](https://github.com/users/bjoern621/projects/1/views/1)
-   [CONTRIBUTING](docs/CONTRIBUTING.md)
