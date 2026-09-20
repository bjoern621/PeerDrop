# PeerDrop

Dateien direkt von Gerät zu Gerät übertragen, im Browser unter [peerdrop.de](https://peerdrop.de).
Die Datei geht aus dem einen Browser in den anderen, ohne Zwischenstation.

<!-- Screenshot: Übertragungsseite mit laufendem Transfer -->

## Der Umweg über die Cloud

Ein 3-GB-Video soll vom Laptop auf das Handy deiner Schwester.
Der gewohnte Weg führt über einen Dienst wie WeTransfer, Drive oder Dropbox: hochladen, warten, Link verschicken, herunterladen lassen.

Die Datei legt dabei zwei Strecken zurück, und die zweite beginnt erst, wenn die erste fertig ist.
Der Upload läuft mit deiner Upload-Rate, die an den meisten Anschlüssen weit unter der Download-Rate liegt.
Danach liegt die Datei auf einem fremden Server, bis jemand sie dort löscht.
Kostenlose Konten deckeln die Dateigröße, und Messenger rechnen Fotos und Videos vor dem Versand klein.

## Der Weg über PeerDrop

Beide Seiten öffnen peerdrop.de, ohne sich irgendwo anzumelden.
Eine Seite tippt den fünfstelligen Token der anderen ein, die andere lässt die Anfrage zu.
Ab da läuft die Übertragung zwischen den beiden Browsern.

Die Datei ist unterwegs, sobald du sie auf der Seite ablegst.
Sie fließt mit dem, was die Leitungen zwischen euch hergeben.
Am Ende liegt sie auf dem Zielgerät.

## So läuft eine Übertragung

1. Öffne [peerdrop.de](https://peerdrop.de) und gehe auf "Sofort loslegen".
2. Gib deinen fünfstelligen Token weiter, über den Kopierknopf oder als fertigen Link auf `peerdrop.de/connect?token=ABCDE`.
3. Die Gegenseite tippt den Token ein und schickt eine Anfrage.
   Du bekommst den Token des anfragenden Geräts angezeigt, vergleichst ihn mit dem, der dir genannt wurde, und lässt die Verbindung zu.
4. Zieh Dateien oder ganze Ordner auf die Seite oder wähle sie über den Dateidialog aus.
   Jede Zeile zeigt Fortschritt, Tempo und Restzeit, und weitere Dateien warten, bis die laufende durch ist.
5. Einzelne Dateien landen nach dem Empfang im Download-Ordner.
   Einen ganzen Ordner speicherst du über seine Zeile, und der Browser fragt dabei nach dem Ziel und legt die Unterordner darin an.

### Geräte im selben Netzwerk

PeerDrop zeigt dir andere Geräte aus deinem Netz in einer Liste, solange "Geräte im Netzwerk finden" eingeschaltet bleibt.
Ein Klick auf ein Gerät schickt die Anfrage dorthin, und die Token-Eingabe entfällt.

### Eigene Geräte

Ein Konto aus Benutzername und Passwort hält deine Geräte unter selbst vergebenen Namen fest.
Die Liste zeigt zu jedem Gerät, ob es bereit, beschäftigt oder nicht erreichbar ist.
Ein Klick auf einen Eintrag baut die Verbindung dorthin auf.

## Wo es läuft

Auf jedem System, für das es einen aktuellen Browser gibt, auf dem Desktop wie auf dem Handy.
Die Seite bringt alles mit, was für eine Übertragung nötig ist.

## Was auf dem Weg passiert

Ein Server von PeerDrop bringt die beiden Browser zusammen und reicht dafür ihre Verbindungsdaten durch.
Die Übertragung selbst läuft über WebRTC und ist verschlüsselt, und die Schlüssel handeln die beiden Browser unter sich aus.
Lässt ein Router oder eine Firewall keinen direkten Weg zu, reicht ein Relay die verschlüsselten Pakete weiter.
Dateiname und Inhalt bleiben auch für dieses Relay unlesbar.
Auf keinem der Server bleibt eine Datei zurück.

## Grenzen

Eine Übertragung braucht beide Geräte gleichzeitig auf peerdrop.de.
PeerDrop legt nichts für später ab.
Schließt du den Tab, endet die Verbindung, und eine laufende Übertragung bricht ab.
Ein abgebrochener Transfer beginnt beim nächsten Anlauf von vorn.
Wie groß eine einzelne Datei sein darf, entscheidet der Speicher, den der Browser auf der Empfangsseite freigibt.

## Einstellungen

Hinter dem Zahnrad wählst du zwischen hellem, dunklem und dem System-Design.
Dort legst du außerdem fest, ob empfangene Dateien automatisch gespeichert werden, ob vor jedem Verbindungsaufbau der Sicherheitshinweis erscheint, ob dein Gerät im Netzwerk sichtbar ist und ob die Seite nach einer Trennung offen bleibt.

## Die naheliegenden Alternativen

Ein Messenger rechnet Fotos und Videos vor dem Versand klein und schickt sie über die Server seines Anbieters.
AirDrop und Quick Share setzen auf beiden Seiten dasselbe Ökosystem voraus und wollen die Geräte in Reichweite haben.
Ein USB-Stick verlangt zwei Kopiervorgänge und beide Geräte am selben Ort.

## Lizenz

MIT, siehe [LICENSE](LICENSE).

Am Code mitarbeiten: [CONTRIBUTING](docs/CONTRIBUTING.md).
