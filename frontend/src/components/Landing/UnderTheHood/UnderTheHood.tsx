import { useState } from "react";
import css from "./UnderTheHood.module.scss";
import Security from "../../../assets/security.svg?react";
import Compress from "../../../assets/compression.svg?react";
import Routes from "../../../assets/all_routes.svg?react";
import * as Accordion from "@radix-ui/react-accordion";

const illustrations = {
    "item-0": <Routes />,
    "item-1": <Security />,
    "item-2": <Compress />,
} as const;

export default function UnderTheHood() {
    const [selectedItem, setSelectedItem] = useState("item-0");

    return (
        <section className={css.container}>
            <h2>
                Die <span className="text-highlight">technischen</span> Details
            </h2>

            <div className={css.horizontalLayout}>
                <div className={css.illustrationContainer}>
                    {illustrations[selectedItem as keyof typeof illustrations]}
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
                                P2P Verbindungsaufbau
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <div className={css.textBoxText}>
                                Die Architektur von PeerDrop basiert auf dem
                                Prinzip der strikten Trennung von
                                Verbindungsaufbau und Datentransfer, um maximale
                                Sicherheit und Effizienz zu garantieren.
                                <br /> Unser Backend agiert dabei als sicherer
                                Signaling-Server: Es orchestriert den Kontakt
                                wie eine Vermittlungsstelle, indem es Metadaten
                                wie Verbindungswünsche über eine
                                WebSocket-Verbindung austauscht. Entscheidend
                                ist, dass dieser Server Ihre Dateien niemals
                                sieht oder speichert.
                                <br /> Sobald beide Nutzer der Verbindung
                                zustimmen, beginnt ein sorgfältig orchestrierter
                                Handshake. Der Server weist beide Browser an,
                                eine direkte, Ende-zu-Ende-verschlüsselte
                                Peer-to-Peer (P2P) Verbindung via WebRTC
                                aufzubauen. Der gesamte Dateitransfer findet
                                ausschließlich in diesem privaten Kanal statt
                                und umgeht unsere Server vollständig.
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item value="item-1" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                P2P Verbindungsaufbau
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <div className={css.textBoxText}>
                                Die Architektur von PeerDrop basiert auf dem
                                Prinzip der strikten Trennung von
                                Verbindungsaufbau und Datentransfer, um maximale
                                Sicherheit und Effizienz zu garantieren.
                                <br /> Unser Backend agiert dabei als sicherer
                                Signaling-Server: Es orchestriert den Kontakt
                                wie eine Vermittlungsstelle, indem es Metadaten
                                wie Verbindungswünsche über eine
                                WebSocket-Verbindung austauscht. Entscheidend
                                ist, dass dieser Server Ihre Dateien niemals
                                sieht oder speichert.
                                <br /> Sobald beide Nutzer der Verbindung
                                zustimmen, beginnt ein sorgfältig orchestrierter
                                Handshake. Der Server weist beide Browser an,
                                eine direkte, Ende-zu-Ende-verschlüsselte
                                Peer-to-Peer (P2P) Verbindung via WebRTC
                                aufzubauen. Der gesamte Dateitransfer findet
                                ausschließlich in diesem privaten Kanal statt
                                und umgeht unsere Server vollständig.
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item value="item-2" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                P2P Verbindungsaufbau
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <div className={css.textBoxText}>
                                Die Architektur von PeerDrop basiert auf dem
                                Prinzip der strikten Trennung von
                                Verbindungsaufbau und Datentransfer, um maximale
                                Sicherheit und Effizienz zu garantieren.
                                <br /> Unser Backend agiert dabei als sicherer
                                Signaling-Server: Es orchestriert den Kontakt
                                wie eine Vermittlungsstelle, indem es Metadaten
                                wie Verbindungswünsche über eine
                                WebSocket-Verbindung austauscht. Entscheidend
                                ist, dass dieser Server Ihre Dateien niemals
                                sieht oder speichert.
                                <br /> Sobald beide Nutzer der Verbindung
                                zustimmen, beginnt ein sorgfältig orchestrierter
                                Handshake. Der Server weist beide Browser an,
                                eine direkte, Ende-zu-Ende-verschlüsselte
                                Peer-to-Peer (P2P) Verbindung via WebRTC
                                aufzubauen. Der gesamte Dateitransfer findet
                                ausschließlich in diesem privaten Kanal statt
                                und umgeht unsere Server vollständig.
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion.Root>
            </div>

            <p className={css.insidePeerDropLink}>
                Du willst noch mehr über die Technik hinter PeerDrop erfahren?
                Schau dir unser <a href="/inside">Inside PeerDrop</a> an!
            </p>
        </section>
    );
}
