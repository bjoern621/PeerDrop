import { useCallback, useEffect } from "react";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { DeviceHeartbeatMessage } from "../types/device/DeviceHeartbeatMessage";
import { DeviceStatus } from "../types/device/DeviceStatus";
import { HEARTBEAT_INTERVAL_MS } from "../util/Constants";
import { useBeforeUnload } from "react-router";

interface UseDeviceHeartbeatOptions {
    status: DeviceStatus;
    enabled?: boolean;
    intervalMs?: number;
    onExit?: () => void;
}

/**
 * Custom hook to manage device heartbeat messages.
 * Automatically sends heartbeat messages at regular intervals while the component is mounted.
 *
 * @param options - Configuration options for the heartbeat
 * @param options.status - The device status to send in heartbeat messages
 * @param options.enabled - Whether heartbeats are enabled (default: true)
 * @param options.intervalMs - Interval between heartbeats in milliseconds (default: HEARTBEAT_INTERVAL_MS)
 *
 * @example
 * ```tsx
 * // Simple usage with BUSY status
 * useDeviceHeartbeat({ status: DeviceStatus.BUSY });
 *
 * // Conditionally enable heartbeats
 * useDeviceHeartbeat({
 *   status: DeviceStatus.BUSY,
 *   enabled: isConnected
 * });
 * ```
 */
export function useDeviceHeartbeat({
    status,
    enabled = true,
    intervalMs = HEARTBEAT_INTERVAL_MS,
    onExit,
}: UseDeviceHeartbeatOptions) {
    const websocketService = useWebSocketService();

    /**
     * Gets the device UUID from cookies.
     * @returns The device UUID if found, undefined otherwise
     */
    const getDeviceUuid = useCallback((): string | undefined => {
        return document.cookie
            .split("; ")
            .find(row => row.startsWith("deviceUuid="))
            ?.split("=")[1];
    }, []);

    /**
     * Sends a heartbeat message if the device UUID is available.
     */
    const sendHeartbeat = useCallback(
        (deviceStatus: DeviceStatus) => {
            const deviceUuid = getDeviceUuid();

            if (!deviceUuid) {
                return; // The user might not have registered the device
            }

            const heartbeat = new DeviceHeartbeatMessage({
                uuid: deviceUuid,
                status: deviceStatus,
            });

            websocketService.sendMessage(heartbeat);
        },
        [getDeviceUuid, websocketService]
    );

    useEffect(() => {
        if (!enabled) {
            return;
        }

        // Send initial heartbeat
        sendHeartbeat(status);

        // Set up interval for continuous heartbeats
        const timer = setInterval(() => {
            sendHeartbeat(status);
        }, intervalMs);

        // Cleanup on unmount
        return () => {
            clearInterval(timer);
        };
    }, [enabled, intervalMs, sendHeartbeat, status]);

    useBeforeUnload(() => {
        console.log("Sending OFFLINE heartbeat before unload");
        if (!enabled) {
            return;
        }

        if (onExit) {
            onExit();
            return;
        }

        sendHeartbeat(DeviceStatus.OFFLINE);
    });

    return { sendHeartbeat };
}
