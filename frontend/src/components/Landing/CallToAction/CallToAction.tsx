import Link from "../../Button/Link";
import Arrow from "../../../assets/icons8-arrow-2.svg?react";
import css from "./CallToAction.module.scss";

export default function CallToAction() {
    return (
        <section className={css.container}>
            <h2>Bereit für sichere Dateiübertragung?</h2>
            <p className="text-muted">
                Dann verbinde dich auf dem direktesten Weg und teile, was du
                willst.
            </p>
            <Link to="/connect" className={css.ctaButton}>
                Jetzt loslegen
                <Arrow />
            </Link>
        </section>
    );
}
