import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import css from "./ActivityList.module.scss";
import { IconChevronRight as ArrowIcon } from "@tabler/icons-react";
import { useScrollShadows } from "../../../hooks/useScrollShadows";
import { MessagingSnapshot } from "../../../services/MessagingService";
import { TransferSnapshot } from "../../../services/TransferTracker";
import { buildActivity, DEFAULT_SORT, Sort, SortKey } from "../activity";
import { FileRow, FolderRow, OfferRow, TextRow } from "./ActivityRows";
import ReadView from "./ReadView";
import EdgeShadows from "../EdgeShadows/EdgeShadows";

const COLUMNS: SortKey[] = ["name", "progress", "size", "time"];

/** Everything sent and received in this session, in one sortable list. */
export default function ActivityList({
    messaging,
    transfers,
}: {
    messaging: MessagingSnapshot;
    transfers: TransferSnapshot[];
}) {
    const { t, i18n } = useTranslation("dashboard");
    const [sort, setSort] = useState<Sort>(DEFAULT_SORT);
    const [readId, setReadId] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const headRowRef = useRef<HTMLDivElement>(null);
    const shadows = useScrollShadows(scrollRef);

    const items = buildActivity(
        messaging.texts,
        messaging.offers,
        transfers,
        sort,
        t,
        i18n.language
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

    const scrollHeadAlong = (event: React.UIEvent<HTMLDivElement>) =>
        headRowRef.current?.style.setProperty(
            "translate",
            `${-event.currentTarget.scrollLeft}px`
        );

    return (
        <div
            role="table"
            aria-label={t("transfers.title")}
            className={css.table}
        >
            <div
                role="rowgroup"
                className={css.head}
                style={{
                    paddingRight: `calc(var(--row-gutter) + ${shadows.scrollbar}px)`,
                }}
            >
                <div role="row" ref={headRowRef} className={css.headRow}>
                    {COLUMNS.map(column => {
                        const active = sort.key === column;
                        return (
                            <div
                                key={column}
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
                                    onClick={() => toggleSort(column)}
                                >
                                    {t(`transfers.columns.${column}`)}
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
                <div
                    ref={scrollRef}
                    className={css.scroll}
                    onScroll={scrollHeadAlong}
                >
                    <div role="rowgroup" className={css.rows}>
                        {items.length === 0 && (
                            <div role="row">
                                <div role="cell" className={css.empty}>
                                    {t("transfers.empty")}
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
                <EdgeShadows shadows={shadows} className={css.edgeShadows} />
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
