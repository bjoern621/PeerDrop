import css from "./Why.module.scss";
import {
    IconMoodSmile as EasyIcon,
    IconShieldLock as SecurityIcon,
    IconGift as GiftIcon,
    IconBolt as SpeedIcon,
} from "@tabler/icons-react";
import { useRef } from "react";

export default function Why() {
    const cardsRef = useRef<HTMLDivElement[]>([]);

    const handleCardMouseMove = (card: HTMLDivElement, e: React.MouseEvent) => {
        const rect = card.getBoundingClientRect(),
            x = e.clientX - rect.left,
            y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        cardsRef.current.forEach(card => {
            handleCardMouseMove(card, e);
        });
    };

    return (
        <section>
            <h2>
                <span className="text-highlight">Warum</span> PeerDrop?
            </h2>
            <div className={css.cardContainer} onMouseMove={onMouseMove}>
                <div
                    className={css.card}
                    ref={el => {
                        if (el) cardsRef.current.push(el);
                    }}
                >
                    <div className={css.cardBorder}></div>
                    <div className={css.cardContent}>
                        <h3>
                            Super{" "}
                            <span className={css.noWrap}>
                                einfach
                                <EasyIcon aria-hidden />
                            </span>
                        </h3>
                        <p className="text-muted">
                            Vergiss das umständliche Hochladen in eine Cloud und
                            das Teilen von Links.
                            <br />
                            Öffne PeerDrop im Browser, gib den 5-stelligen Token
                            deines Partners ein und schicke los.
                        </p>
                    </div>
                </div>
                <div
                    className={css.card}
                    ref={el => {
                        if (el) cardsRef.current.push(el);
                    }}
                >
                    <div className={css.cardBorder}></div>
                    <div className={css.cardContent}>
                        <h3>
                            Deine Daten, deine{" "}
                            <span className={css.noWrap}>
                                Kontrolle
                                <SecurityIcon aria-hidden />
                            </span>
                        </h3>
                        <p className="text-muted">
                            Wir öffnen eine verschlüsselte Peer-to-Peer
                            Verbindung für dich, um deine Daten sicher zu
                            übertragen. Dateien werden niemals auf einem Server
                            zwischengespeichert und können so von niemanden
                            sonst gelesen werden.
                        </p>
                    </div>
                </div>
                <div
                    className={css.card}
                    ref={el => {
                        if (el) cardsRef.current.push(el);
                    }}
                >
                    <div className={css.cardBorder}></div>
                    <div className={css.cardContent}>
                        <h3>
                            Keine Anmeldung, keine Werbung, Open{" "}
                            <span className={css.noWrap}>
                                Source
                                <GiftIcon aria-hidden />
                            </span>
                        </h3>
                        <p className="text-muted">
                            Sende eine einzelne Datei oder deine gesamte
                            Fotosammlung. Alles ohne Registrierung und ohne
                            nervige Werbung. <br />
                            PeerDrop ist vollständig Open Source.
                        </p>
                    </div>
                </div>
                <div
                    className={css.card}
                    ref={el => {
                        if (el) cardsRef.current.push(el);
                    }}
                >
                    <div className={css.cardBorder}></div>
                    <div className={css.cardContent}>
                        <h3>
                            Maximale{" "}
                            <span className={css.noWrap}>
                                Geschwindigkeit
                                <SpeedIcon aria-hidden />
                            </span>
                        </h3>
                        <p className={"text-muted"}>
                            Du zahlst für eine schnelle Internetverbindung,
                            nutz&#x2019; sie auch!
                            <br />
                            Die direkte Verbindung ist der kürzeste Weg für
                            deine Daten und macht den Austausch spürbar
                            schneller als bei herkömmlichen Diensten.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
