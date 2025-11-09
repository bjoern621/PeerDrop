import css from "./Hero.module.scss";
import Illustration from "../../../assets/illustrations/hero_illustration.svg?react";
import Arrow from "../../../assets/actions/icons8-arrow-2.svg?react";
import Link from "../../Button/Link";
import { TUTORIAL_ID } from "../Tutorial/Tutorial";

export default function Hero() {
    return (
        <section className={css.container}>
            <Illustration aria-hidden />
            <h1>
                Sichere P2P-Dateiübertragung <br />
                <span className="text-highlight">direkt im Browser</span>
            </h1>
            <p className="text-muted">
                PeerDrop ermöglicht es dir, Dateien sicher und digital souverän
                zwischen Geräten zu teilen. Keine Server, keine Speicherung,
                super einfach.
            </p>
            <div className={css.actions}>
                <Link to="/connect">
                    Sofort loslegen
                    <Arrow aria-hidden />
                </Link>
                <Link
                    to={`#${TUTORIAL_ID}`}
                    variant="outline"
                    onClick={() => {
                        document.getElementById(TUTORIAL_ID)!.scrollIntoView({
                            block: "center",
                        });
                    }}
                >
                    Wie funktioniert's ?
                </Link>
            </div>
        </section>
    );
}
