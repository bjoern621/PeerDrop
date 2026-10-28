import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import css from "./UnderTheHood.module.scss";
import Security from "../../../assets/illustrations/security.svg?react";
import Compress from "../../../assets/illustrations/compression.svg?react";
import Routes from "../../../assets/illustrations/all_routes.svg?react";
import * as Accordion from "@radix-ui/react-accordion";
import Anchor from "../../Anchor/Anchor";
import { HEADING_COMPONENTS } from "../headingComponents";

const illustrations = {
    "item-0": <Routes aria-hidden />,
    "item-1": <Security aria-hidden />,
    "item-2": <Compress aria-hidden />,
} as const;

export default function UnderTheHood() {
    const { t } = useTranslation("landing");
    const [selectedItem, setSelectedItem] = useState("item-0");

    return (
        <section>
            <h2>
                <Trans
                    t={t}
                    i18nKey="underTheHood.heading"
                    components={HEADING_COMPONENTS}
                />
            </h2>

            <div className={css.horizontalLayout}>
                <div className={css.illustrationContainer}>
                    <div key={selectedItem} className={css.illustration}>
                        {
                            illustrations[
                                selectedItem as keyof typeof illustrations
                            ]
                        }
                    </div>
                </div>

                <Accordion.Root
                    type="single"
                    value={selectedItem}
                    onValueChange={setSelectedItem}
                    className={css.textBoxes}
                >
                    <Accordion.Item value="item-0" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                {t("underTheHood.connection.title")}
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <p className={css.textBoxText}>
                                {t("underTheHood.connection.text")}
                            </p>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item value="item-1" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                {t("underTheHood.encryption.title")}
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <p className={css.textBoxText}>
                                <Trans
                                    t={t}
                                    i18nKey="underTheHood.encryption.text"
                                    components={{
                                        sourceLink: (
                                            <Anchor to="https://github.com/bjoern621/PeerDrop" />
                                        ),
                                    }}
                                />
                            </p>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item value="item-2" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                {t("underTheHood.transfer.title")}
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <p className={css.textBoxText}>
                                {t("underTheHood.transfer.text")}
                            </p>
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion.Root>
            </div>

            <p className={css.insidePeerDropLink}>
                <Trans
                    t={t}
                    i18nKey="underTheHood.more"
                    components={{ insideLink: <Anchor to="/inside" /> }}
                />
            </p>
        </section>
    );
}
