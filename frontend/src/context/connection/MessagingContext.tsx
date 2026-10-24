import { createContext, useContext } from "react";
import { MessagingService } from "../../services/MessagingService";
import { assert } from "../../util/Assert";

export const MessagingContext = createContext<MessagingService | null>(null);

export function useMessagingService() {
    const context = useContext(MessagingContext);
    assert(context, "MessagingService not available in context.");
    return context;
}
