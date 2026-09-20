# PeerDrop

Dateien direkt von Peer zu Peer übertragen, im Browser unter [peerdrop.de](https://peerdrop.de).
Die Datei geht aus dem einen Browser in den anderen, ohne Zwischenstation.

![Übertragung mit Fortschritt, Tempo und Restzeit je Datei](docs/uebertragung.png)

## Was der Weg über die Cloud kostet

Beim Hochladen gibst du die Datei aus der Hand: sie liegt beim Anbieter, lesbar für ihn, bis jemand sie löscht.
Nach dem Löschen bleibt offen, wie lange Backups und Caches die Kopie noch halten.
Der Freigabe-Link öffnet die Datei für jeden, der ihn bekommt, und ein Link lässt sich weiterschicken.
Wer davon Gebrauch gemacht hat, erfährst du nicht.

## So läuft eine Übertragung

![Eigener Token und die Anfrage des anderen Peers](docs/verbinden.png)

1. Beide Peers öffnen peerdrop.de und bekommen je einen fünfstelligen Token.
2. Gib deinen Token weiter, per Kopierknopf oder als Link auf `peerdrop.de/connect?token=ABCDE`.
3. Der andere Peer fragt damit an, du vergleichst den angezeigten Token und lässt die Verbindung zu.
4. Zieh Dateien und Ordner auf die Seite. 🚀

Peers im selben Netzwerk stehen ohne Token in einer Liste, ein Klick genügt.
Mit einem Konto stehen dort deine eigenen Geräte unter selbst vergebenen Namen.

## Was die Server sehen

Ein Server von PeerDrop bringt die beiden Peers zusammen und reicht dafür ihre Verbindungsdaten durch.
Die Übertragung läuft verschlüsselt über WebRTC, und die Schlüssel handeln die beiden Browser unter sich aus.
Lässt ein Router keinen direkten Weg zu, reicht ein Relay die verschlüsselten Pakete weiter, für das Dateiname und Inhalt unlesbar bleiben.
Auf keinem der Server bleibt eine Datei zurück.

## Grenzen

Eine Übertragung braucht beide Peers gleichzeitig auf peerdrop.de.
Schließt ein Peer den Tab, bricht sie ab und beginnt beim nächsten Anlauf von vorn.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
Am Code mitarbeiten: [CONTRIBUTING](docs/CONTRIBUTING.md).
