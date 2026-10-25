import css from "./Why.module.scss";
import {
    Icon,
    IconMoodSmile as EasyIcon,
    IconShieldLock as SecurityIcon,
    IconGift as GiftIcon,
    IconBolt as SpeedIcon,
} from "@tabler/icons-react";
import { ReactNode, useRef } from "react";
import { Trans, useTranslation } from "react-i18next";

const CARDS = [
    { key: "easy", icon: EasyIcon },
    { key: "control", icon: SecurityIcon },
    { key: "free", icon: GiftIcon },
    { key: "speed", icon: SpeedIcon },
] as const;

export default function Why() {
    const { t } = useTranslation("landing");
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
                <Trans
                    t={t}
                    i18nKey="why.heading"
                    components={{
                        highlight: <span className="text-highlight" />,
                    }}
                />
            </h2>
            <div className={css.cardContainer} onMouseMove={onMouseMove}>
                {CARDS.map(card => (
                    <div
                        key={card.key}
                        className={css.card}
                        ref={el => {
                            if (el) cardsRef.current.push(el);
                        }}
                    >
                        <div className={css.cardBorder}></div>
                        <div className={css.cardContent}>
                            <h3>
                                <Trans
                                    t={t}
                                    i18nKey={`why.${card.key}.title`}
                                    components={{
                                        noWrap: <NoWrap icon={card.icon} />,
                                    }}
                                />
                            </h3>
                            <p className="text-muted">
                                <Trans t={t} i18nKey={`why.${card.key}.text`} />
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

/** Keeps the last word of a card title on one line with the card's icon. */
function NoWrap({
    icon: CardIcon,
    children,
}: {
    icon: Icon;
    children?: ReactNode;
}) {
    return (
        <span className={css.noWrap}>
            {children}
            <CardIcon aria-hidden />
        </span>
    );
}
