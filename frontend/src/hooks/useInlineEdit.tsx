import { KeyboardEvent, useState } from "react";

/**
 * A value edited in place of its text.
 * Enter or leaving the field passes the draft to `onCommit`; Escape drops it.
 * Spread `fieldProps` on the input and set the draft from its change event.
 */
export function useInlineEdit(onCommit: (draft: string) => void) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");

    const start = (initial: string) => {
        setDraft(initial);
        setEditing(true);
    };

    const commit = () => {
        setEditing(false);
        onCommit(draft);
    };

    const fieldProps = {
        value: draft,
        autoFocus: true,
        onBlur: commit,
        onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
                commit();
            } else if (event.key === "Escape") {
                setEditing(false);
            }
        },
    };

    return { editing, start, setDraft, fieldProps };
}
