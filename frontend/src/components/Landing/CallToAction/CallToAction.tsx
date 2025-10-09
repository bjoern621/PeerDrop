import Link from "../../Button/Link";
import Arrow from "../../../assets/icons8-arrow-2.svg?react";
import css from "./CallToAction.module.scss";

export default function CallToAction() {
    return (
        <section className={css.container}>
            <h2>Bereit für sichere Dateiübertragung?</h2>
            <p className="text-muted">
                Es braucht nur drei Schritte für eine sichere Dateiübertragung
            </p>
            <Link to="/old" className={css.ctaButton}>
                Jetzt loslegen
                <Arrow />
            </Link>
        </section>
    );
}
