import { useEffect, useState } from "react";

/** True while `on` holds and for `ms` after it turns false, so a hide animation can finish. */
export function useLingering(on: boolean, ms: number): boolean {
    const [lingering, setLingering] = useState(on);

    useEffect(() => {
        if (on) {
            setLingering(true);
            return;
        }
        const timer = window.setTimeout(() => setLingering(false), ms);
        return () => window.clearTimeout(timer);
    }, [on, ms]);

    return on || lingering;
}
