import { useSyncExternalStore } from "react";
import { useMessagingService } from "../context/connection/MessagingContext";
import { MessagingSnapshot } from "../services/MessagingService";

/** Texts, offers, recipient checks, blocks and the send lock, kept current. */
export function useMessaging(): MessagingSnapshot {
    const messaging = useMessagingService();
    return useSyncExternalStore(
        listener => messaging.subscribe(listener),
        () => messaging.getSnapshot()
    );
}
