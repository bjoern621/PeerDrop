# PeerDrop

**Dateien direkt von Peer zu Peer. Im Browser, ohne Upload, ohne Konto.**
Jetzt teilen auf [peerdrop.de](https://peerdrop.de).

![Übertragung mit Fortschritt, Tempo und Restzeit je Datei](docs/uebertragung.png)

## Die Cloud will deine Datei. PeerDrop nicht.

Hochladen heißt hergeben: die Datei liegt lesbar beim Anbieter, Backups behalten ihre Kopien, und der Freigabe-Link öffnet sie für jeden, der ihn weiterbekommt.
Bei PeerDrop geht sie aus deinem Browser in den des anderen Peers. Sonst nirgendwohin.

## In Sekunden verbunden

![Eigener Token und die Anfrage des anderen Peers](docs/verbinden.png)

1. Beide Peers öffnen peerdrop.de und bekommen je einen fünfstelligen Token.
2. Token weitergeben, per Kopierknopf oder als Link auf `peerdrop.de/connect?token=ABCDE`.
3. Angezeigten Token vergleichen, Verbindung zulassen.
4. Dateien und Ordner draufziehen. 🚀

Peers im selben Netzwerk stehen ohne Token in der Liste, ein Klick genügt.

## Unsere Server sehen deine Dateien nie

Echte Ende-zu-Ende-Verschlüsselung, direkt zwischen den beiden Browsern.
Unsere Server vermitteln die Verbindung und bekommen deine Dateien nie zu Gesicht, also kann sie dort auch niemand lesen. Das ist P2P.
Sperrt eine Firewall den direkten Weg, reicht ein Relay die Pakete weiter, verschlüsselt und für das Relay unlesbar.

## Gut zu wissen

Beide Peers müssen gleichzeitig auf peerdrop.de sein.
Tab zu heißt Übertragung neu.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
Am Code mitarbeiten: [CONTRIBUTING](docs/CONTRIBUTING.md).
