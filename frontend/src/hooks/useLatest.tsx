import { RefObject, useEffect, useRef } from "react";

/** Ref holding the latest `value`, for a listener registered once that must call the current callback. */
export function useLatest<T>(value: T): RefObject<T> {
    const ref = useRef(value);

    useEffect(() => {
        ref.current = value;
    });

    return ref;
}
