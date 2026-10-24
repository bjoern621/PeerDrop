import { useRef, useState } from "react";
import css from "./ActivityList.module.scss";
import { IconChevronRight as ArrowIcon } from "@tabler/icons-react";
import { useScrollShadows } from "../../../hooks/useScrollShadows";
import { MessagingSnapshot } from "../../../services/MessagingService";
import { TransferSnapshot } from "../../../services/TransferTracker";
import { buildActivity, DEFAULT_SORT, Sort, SortKey } from "../activity";
import { FileRow, FolderRow, OfferRow, TextRow } from "./ActivityRows";
import ReadView from "./ReadView";

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "progress", label: "Fortschritt" },
    { key: "size", label: "Größe" },
    { key: "time", label: "Zeitstempel" },
];

/** Everything sent and received in this session, in one sortable list. */
export default function ActivityList({
    messaging,
    transfers,
}: {
    messaging: MessagingSnapshot;
    transfers: TransferSnapshot[];
}) {
    const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
    const [readId, setReadId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const shadows = useScrollShadows(scrollRef);

    const items = buildActivity(
        messaging.texts,
        messaging.offers,
        transfers,
        sort
    );
    const reading = messaging.texts.find(entry => entry.id === readId);

    const toggleSort = (key: SortKey) =>
        setSort(current =>
            current.key === key
                ? {
                      key,
                      direction: current.direction === "asc" ? "desc" : "asc",
                  }
                : { key, direction: key === "time" ? "desc" : "asc" }
        );

    return (
        <div role="table" aria-label="Übertragungen" className={css.table}>
            <div
                role="rowgroup"
                className={css.head}
                style={{ paddingRight: shadows.scrollbar }}
            >
                <div role="row" className={css.headRow}>
                    {COLUMNS.map(column => {
                        const active = sort.key === column.key;
                        return (
                            <div
                                key={column.key}
                                role="columnheader"
                                aria-sort={
                                    active
                                        ? sort.direction === "asc"
                                            ? "ascending"
                                            : "descending"
                                        : "none"
                                }
                            >
                                <button
                                    type="button"
                                    className={css.sortButton}
                                    onClick={() => toggleSort(column.key)}
                                >
                                    {column.label}
                                    {active && (
                                        <ArrowIcon
                                            className={
                                                sort.direction === "asc"
                                                    ? css.ascending
                                                    : css.descending
                                            }
                                            aria-hidden
                                        />
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className={css.bodyFrame}>
                <div ref={scrollRef} className={css.scroll}>
                    <div role="rowgroup" className={css.rows}>
                        {items.length === 0 && (
                            <div role="row">
                                <div role="cell" className={css.empty}>
                                    Keine Übertragungen
                                </div>
                            </div>
                        )}
                        {items.map(item => {
                            switch (item.kind) {
                                case "text":
                                    return (
                                        <TextRow
                                            key={item.key}
                                            entry={item.entry}
                                            blocked={messaging.blocked}
                                            onOpen={() =>
                                                setReadId(item.entry.id)
                                            }
                                        />
                                    );
                                case "offer":
                                    return (
                                        <OfferRow
                                            key={item.key}
                                            entry={item.entry}
                                            blocked={messaging.blocked}
                                        />
                                    );
                                case "file":
                                    return (
                                        <FileRow
                                            key={item.key}
                                            transfer={item.transfer}
                                            blocked={messaging.blocked}
                                        />
                                    );
                                case "folder":
                                    return (
                                        <FolderRow
                                            key={item.key}
                                            folder={item}
                                            folderId={item.folderId}
                                            blocked={messaging.blocked}
                                        />
                                    );
                            }
                        })}
                    </div>
                </div>
                <div
                    className={`${css.shadowTop} ${shadows.top ? css.visible : ""}`}
                    style={{
                        right: `calc(${shadows.scrollbar}px + var(--space-12))`,
                    }}
                    aria-hidden
                />
                <div
                    className={`${css.shadowBottom} ${shadows.bottom ? css.visible : ""}`}
                    style={{
                        right: `calc(${shadows.scrollbar}px + var(--space-12))`,
                    }}
                    aria-hidden
                />
            </div>
            {reading && (
                <ReadView
                    entry={reading}
                    blocked={messaging.blocked.has(reading.peer)}
                    onClose={() => setReadId(null)}
                />
            )}
        </div>
    );
}
