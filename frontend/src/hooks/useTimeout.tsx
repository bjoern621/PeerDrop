import { useEffect, useRef, useState } from "react";

export interface Timeout {
    /** Runs `fn` after `ms`, in place of any run still pending. */
    set: (fn: () => void, ms: number) => void;
    clear: () => void;
}

/** One pending timeout per caller, cleared on unmount. The returned object keeps its identity. */
export function useTimeout(): Timeout {
    const timer = useRef<number | undefined>(undefined);
    const [timeout] = useState<Timeout>(() => ({
        set: (fn, ms) => {
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(fn, ms);
        },
        clear: () => window.clearTimeout(timer.current),
    }));

    useEffect(() => timeout.clear, [timeout]);

    return timeout;
}
