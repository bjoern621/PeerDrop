import { useState } from "react";
import css from "./UnderTheHood.module.scss";
import Security from "../../../assets/illustrations/security.svg?react";
import Compress from "../../../assets/illustrations/compression.svg?react";
import Routes from "../../../assets/illustrations/all_routes.svg?react";
import * as Accordion from "@radix-ui/react-accordion";
import Anchor from "../../Anchor/Anchor";

const illustrations = {
    "item-0": <Routes aria-hidden />,
    "item-1": <Security aria-hidden />,
    "item-2": <Compress aria-hidden />,
} as const;

export default function UnderTheHood() {
    const [selectedItem, setSelectedItem] = useState("item-0");

    return (
        <section>
            <h2>
                Die <span className="text-highlight">technischen</span> Details
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
                                P2P Verbindungsaufbau
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <p className={css.textBoxText}>
                                Wenn du den Token eingibst und auf Verbinden
                                klickst, startet im Hintergrund der
                                Verbindungsaufbau: Unser Signaling-Server
                                tauscht die Verbindungsdaten zwischen den Peers
                                aus. Danach verbinden sich die Geräte direkt per
                                WebRTC. Angebot und Antwort, also Offer und
                                Answer, sowie ICE-Kandidaten werden in Sekunden
                                verhandelt. Dabei werden alle Verbindungswege
                                priorisiert: zuerst lokale Verbindungen, dann
                                über das Internet. Der perfekte Pfad wird
                                automatisch ausgewählt. Router- und
                                Firewall-Hürden werden automatisch umgangen,
                                ganz ohne VPN und ohne gemeinsames WLAN. Weil
                                nichts auf Server hochgeladen wird, geht es
                                schneller los als bei Upload-Diensten. Und im
                                Gegensatz zu reinen LAN-Tools funktioniert
                                PeerDrop zuverlässig auch quer durchs Internet.
                            </p>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item value="item-1" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                Ende-zu-Ende-Verschlüsselung by Design
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <p className={css.textBoxText}>
                                Die Ende-zu-Ende-Verschlüsselung ist fest
                                eingebaut und funktioniert ohne zusätzliches
                                Setup. Deine Daten laufen über
                                DTLS-verschlüsselte WebRTC DataChannel direkt
                                von Gerät zu Gerät, ohne Umwege über Drittserver
                                und ohne, dass Inhalte zwischengespeichert oder
                                entschlüsselt werden. Die Schlüssel werden
                                ausschließlich im Browser ausgehandelt und
                                verlassen ihn nicht, unsere Server sehen nur das
                                Minimum, das für die Vermittlung der Verbindung
                                nötig ist. Wir speichern weder Dateien noch
                                Transferprotokolle; es gibt keinen Account,
                                keine Cloud und keine Freigaben, die man später
                                wieder entfernen müsste. Privacy ohne Aufwand
                                automatisch und standardmäßig. Du kannst die
                                Ende-zu-Ende-Verschlüsselung selbst
                                nachvollziehen, wir sind{" "}
                                <Anchor to="https://github.com/bjoern621/PeerDrop">
                                    Open Source
                                </Anchor>
                                .
                            </p>
                        </Accordion.Content>
                    </Accordion.Item>

                    <Accordion.Item value="item-2" className={css.textBox}>
                        <Accordion.Header className={css.textBoxHeader}>
                            <Accordion.Trigger>
                                Optimierter Dateitransfer
                            </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className={css.textBoxTextWrapper}>
                            <p className={css.textBoxText}>
                                Hinter den Kulissen zerlegt PeerDrop Dateien in
                                kleine Blöcke und passt den Fluss automatisch an
                                die verfügbare Bandbreite an. So bleiben
                                Übertragungen stabil, auch wenn das Netz
                                schwankt, und sie sind trotzdem schnell. Ordner
                                werden vor dem Senden automatisch komprimiert,
                                mehrere Dateien laufen parallel in einer
                                wartenden Pipeline. Abgebrochene Übertragungen
                                setzt PeerDrop nahtlos fort und bestätigt am
                                Ende die Integrität jeder Datei. Ergebnis:
                                spürbar weniger Wartezeit als bei Upload-
                                Download-Lösungen und keine Limits fremder
                                Server. Du kannst den Fortschritt der
                                Übertragung pro Datei in Echtzeit sehen.
                            </p>
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion.Root>
            </div>

            <p className={css.insidePeerDropLink}>
                Du willst noch mehr über die Technik hinter PeerDrop erfahren?
                Schau dir unser <Anchor to="/inside">Inside PeerDrop</Anchor>{" "}
                an!
            </p>
        </section>
    );
}
