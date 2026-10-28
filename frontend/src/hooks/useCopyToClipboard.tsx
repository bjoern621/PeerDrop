import { useState } from "react";
import errorAsValue from "../util/ErrorAsValue";
import { useTimeout } from "./useTimeout";

const COPIED_DURATION_MS = 2000;

/**
 * Copies text to the clipboard and reports `copied` for two seconds after a success.
 * Each caller keeps its own state, so two copy buttons never reset each other.
 * A failed copy logs the error and leaves `copied` false.
 */
export function useCopyToClipboard(): [
    copied: boolean,
    copy: (text: string) => Promise<void>,
] {
    const [copied, setCopied] = useState(false);
    const reset = useTimeout();

    const copy = async (text: string) => {
        const [, err] = await errorAsValue(navigator.clipboard.writeText(text));
        if (err) {
            console.error("Failed to copy to the clipboard:", err);
            return;
        }
        setCopied(true);
        reset.set(() => setCopied(false), COPIED_DURATION_MS);
    };

    return [copied, copy];
}
