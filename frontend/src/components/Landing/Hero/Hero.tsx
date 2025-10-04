import css from "./Hero.module.scss";

export default function Hero() {
    return (
        <section className={css.container}>
            <h1>
                Sichere P2P-Dateiübertragung <br />
                <span className="text-highlight">direkt im Browser</span>
            </h1>
            <p className="text-muted">
                PeerDrop ermöglicht es dir, Dateien sicher und digital souverän
                zwischen Geräten zu teilen. Keine Server, keine Speicherung,
                super einfach.
            </p>
        </section>
    );
}
