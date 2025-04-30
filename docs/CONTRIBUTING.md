# CONTRIBUTING

Dieser Leitfaden beschreibt den Prozess, wie du beitragen kannst.

## Arbeitsaufträge und Feature-Planung

-   **Issues:** Alle Arbeitsaufträge, Bugs und Feature-Vorschläge werden in den GitHub Issues getrackt.
-   **User Stories:** Neue Features werden als User Stories formuliert. Diese werden in zukünftigen Sprints eingeplant und umgesetzt.

## Entwicklungsprozess

1.  **Branch erstellen:** Für jedes Issue, wird ein eigener Branch erstellt. Nutze dafür die "Create Branch"-Funktion direkt aus dem Issue heraus.
2.  **Entwicklungsumgebung aufsetzen:** Informationen zum Aufsetzen der lokalen Entwicklungsumgebung findest du [hier](development.md).
3.  **Entwickeln auf dem Branch:**
    -   **"Development"-Branches:** Diese Branches sind persönliche Spielwiesen für den Entwickler.
    -   **Freiheiten:** Auf diesen Branches sind Aktionen wie Merges, Force Pushes, Rebasing etc. erlaubt.
    -   **Ziel:** Das Ziel ist es, die Anforderungen des Issues auf diesem Branch zu implementieren und zu testen.

## Review-Prozess

1.  **Pull Request erstellen:** Sobald die Spezifikationen umgesetzt sind und die Implementierung abgeschlossen ist, wird das Issue in den "Review"-Status versetzt. Erstelle einen Pull Request (PR) von deinem Development-Branch in den `main`-Branch.
2.  **Reviewer:** Der Product Owner (PO) und mindestens ein "relevanter Verantwortlicher" (z.B. ein Frontend-Verantwortlicher, wenn das Issue den Tag "Frontend" hat) müssen den Pull Request prüfen und genehmigen.
3.  **Testumgebung:** Für das Review wird die Stage-Umgebung verwendet, die über die `docker-compose.yml` gestartet werden kann.
4.  **Automatisierte Tests:** Alle relevanten automatisierten Tests müssen erfolgreich durchlaufen, bevor der PR gemerged werden kann.

## Release und Deployment

-   **Merge:** Nach erfolgreichem Review und Genehmigung wird der Pull Request in den `main`-Branch gemerged.
-   **Release:** Anschließend wird ein neuer Release mit einer entsprechenden Versionsnummer erstellt.
-   **Deployment:** Die neue Version wird auf der Produktivumgebung deployed.

## Weitere Informationen

-   Der neue Release ist jetzt öffentlich. In [README](/README.md) ist beschrieben, wie die Webseite genutzt werden kann.
