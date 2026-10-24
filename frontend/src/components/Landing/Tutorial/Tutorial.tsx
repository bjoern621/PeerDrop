import css from "./Tutorial.module.scss";

export const TUTORIAL_ID = "tutorial";

export default function Tutorial() {
    return (
        <section id={TUTORIAL_ID}>
            <h2>
                <span className="text-highlight">So einfach</span> geht&#x2019;s
            </h2>
            <p className="text-muted">
                Es braucht nur drei Schritte für eine sichere Dateiübertragung
            </p>
            <div className={css.cardContainer}>
                <div className={css.card1}>
                    <div className={css.cardIcon}>1</div>
                    <h3>Token teilen</h3>
                    <p className="text-muted">
                        Die Person, die etwas empfangen soll, gibt dir ihren
                        Token. Im selben Netzwerk siehst du ihr Gerät direkt
                        unter „Geräte“.
                    </p>
                </div>
                <div className={css.card2}>
                    <div className={css.cardIcon}>2</div>
                    <h3>Text oder Dateien senden</h3>
                    <p className="text-muted">
                        Gib den Token unter „An“ ein. Schreibe einen Text oder
                        wähle Dateien und Ordner. Die Übertragung startet
                        sofort.
                    </p>
                </div>
                <div className={css.card3}>
                    <div className={css.cardIcon}>3</div>
                    <h3>Annehmen</h3>
                    <p className="text-muted">
                        Deine erste Datei nimmt der Empfänger mit einem Klick
                        an. Weitere Dateien und alle Texte kommen ohne erneute
                        Nachfrage an.
                    </p>
                </div>
            </div>
        </section>
    );
}
