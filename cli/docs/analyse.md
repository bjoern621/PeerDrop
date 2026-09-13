# Analyse

Warum der Client als heruntergeladene Binärdatei läuft, und was ein Peer ohne Browser nachbauen muss.

## Randbedingung

Der Browser-Peer spricht einen WebRTC Data Channel: ICE für den Pfad, DTLS für die Verschlüsselung, SCTP für die Nachrichten.
Kein Werkzeug einer POSIX-Shell spricht das, `curl` eingeschlossen.
Ein Terminal-Peer braucht deshalb entweder einen eigenen WebRTC-Stack oder einen Umweg über den Server.

## Wege

| Weg | Funktionsweise | Preis |
|---|---|---|
| Binärdatei | Einzeiler lädt eine statische Binärdatei für das System und startet sie. | Download von rund 12 MB, Ausführungsrecht im Cache-Ordner. |
| Relay | Reine Shell: Upload per HTTPS zum Backend, Backend reicht per WebSocket an den Browser weiter. | Server sieht Klartext, Dateien laufen durch den Serverprozess, bricht das Versprechen der Seite. |
| Binärdatei mit Relay-Rückfall | Wie Binärdatei, Relay wenn `exec` scheitert. | Beide Preise. |

Der Client läuft als Binärdatei.
Der Einzeiler braucht auf dem Rechner `sh`, `curl` oder `wget`, `uname`, `mktemp` und `chmod`, unter Windows PowerShell 5.1.

## Nachzubauen

Das Backend ist ein blinder Vermittler, und die Webseite trägt keine eigene Kryptografie.
Ein Terminal-Peer baut deshalb vier Dinge nach:

1. Das Signaling über WebSocket: Token empfangen, Verbindungsanfrage beantworten oder stellen, `sdp` und `ice-candidate` weiterreichen, `close-connection`.
2. Den WebRTC-Aufbau mit derselben Höflichkeitsregel und demselben Startkanal wie der Browser, mit den ICE-Servern aus `/envvars.json`.
3. Das Dateiformat auf dem Data Channel: JSON-Metadaten, dann nummerierte Blöcke, Abschluss durch Zählen.
4. Die Ablage: Blöcke an ihre Position schreiben, Metadaten nach Blöcken tolerieren, mehrere Kanäle gleichzeitig.

Verschlüsselung kommt vollständig aus DTLS und ist mit jedem WebRTC-Stack bitkompatibel.
Details: [Protokoll](protokoll.md).

## Sprache und Stack

Der Client ist in Go geschrieben und nutzt pion/webrtc.
Ein statisches Binary je Zielsystem entsteht ohne fremde Toolchain, TURN über TLS auf Port 443 ist enthalten, und das Protokoll ist zu klein, um Code mit dem Frontend zu teilen.
Rust mit webrtc-rs bringt einen unreiferen Stack, C# mit SIPSorcery ungesicherte Native-AOT-Unterstützung, Bun mit werift Binärdateien ab 70 MB.

## Risiken

Jeder Punkt nennt die Gegenmaßnahme.

Das Backend liest WebSocket-Nachrichten in einen Puffer von 1024 Byte und schließt die Verbindung bei Überlauf.
Ein Data-Channel-Angebot des Browsers ohne Kandidaten bleibt knapp darunter, Kandidaten kommen einzeln nach.
Das Backend sammelt Fragmente bis 64 KiB, und der Client kürzt sein SDP auf die Pflichtzeilen.

Der Sender setzt `done`, sobald sein Puffer leer ist, und niemand bestätigt den Empfang ([Issue #277](https://github.com/bjoern621/PeerDrop/issues/277)).
Der Client wartet nach dem Leerlaufen auf das Schließen des Kanals, das der SCTP-Stack erst nach Bestätigung aller Daten abschließt.
In pion verwirft `Close` gepufferte Daten, `GracefulClose` wartet.

Blöcke kommen ungeordnet an.
`--stdout` spoolt deshalb in eine temporäre Datei und gibt nach vollständigem Empfang aus.

Der Browser sendet Nachrichten von höchstens 256 KiB, begrenzt durch die vom Gegenüber angekündigte Maximalgröße.
pion kündigt 1 GiB an und nimmt die 256 KiB an, in Senderichtung rechnet der Client mit derselben Formel.

Das Token hat 16 Bit Entropie, und der Client bestätigt Anfragen ohne Rückfrage.
Wer das Token errät, verbindet sich und darf Dateien ablegen.
Die Webseite trägt dieselbe Angriffsfläche, und Härtung von Token und Anfragerate ist Sache des Backends.

Temporäre Ordner sind auf gehärteten Servern mit `noexec` eingehängt.
Das Skript probiert `$XDG_CACHE_HOME`, `$HOME/.cache` und `mktemp -d` in dieser Reihenfolge und nennt bei Fehlschlag alle drei.

Unsignierte Go-Binärdateien lösen bei Windows Defender gelegentlich Fehlalarme aus.
Ein Zertifikat zum Signieren kostet jährlich, die Binärdatei bleibt unsigniert, und ein Fehlalarm wird als Issue aufgenommen.

TURN über TLS setzt in pion Netzwerktypen mit TCP voraus.
Der Integrationstest erzwingt Relay-Kandidaten, so dass der Pfad geprüft bleibt.

Der Client erscheint bei Browsern hinter derselben öffentlichen IP als LAN-Peer.
Der User-Agent lautet `peerdrop-cli/<version> (<os>; <arch>)` und dient als Chip-Beschriftung.
