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
                        Gib deinen Token an die Person weiter, mit der du
                        Dateien teilen möchtest.
                    </p>
                </div>
                <div className={css.card2}>
                    <div className={css.cardIcon}>2</div>
                    <h3>Verbindung kontrollieren</h3>
                    <p className="text-muted">
                        Warte, bis dein Peer sich zu dir verbindet und
                        kontrolliere den angezeigten Token des Peers. Ist alles
                        in Ordnung, lasse die Verbindung zu.
                    </p>
                </div>
                <div className={css.card3}>
                    <div className={css.cardIcon}>3</div>
                    <h3>Dateien auswählen & übertragen</h3>
                    <p className="text-muted">
                        Wähle Dateien aus, die sicher übertragen werden oder
                        warte bis dein Peer Dateien freigibt.
                    </p>
                </div>
            </div>
        </section>
    );
}
