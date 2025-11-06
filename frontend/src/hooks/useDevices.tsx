import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify/unstyled";
import { Device } from "../types/device/Device";
import { DeviceResponse } from "../util/dtos/DeviceResponse";
import { DeviceStatus } from "../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../types/device/DeviceHeartbeatMessage";
import { DeviceChangedMessage } from "../types/device/DeviceChangedMessage";
import { MessageHandler } from "../services/WebSocketService";
import { useWebSocketService } from "../context/connection/WebSocketContext";
import { MessageType } from "../types/MessageType";
import { QuickConnectMessage } from "../types/connection/QuickConnectMessage";
import errorAsValue from "../util/ErrorAsValue";
import { assert } from "../util/Assert";
import { useDeviceHeartbeat } from "./useDeviceHeartbeat";
import { getRuntimeEnvVars } from "../util/RuntimeEnvVars";

/**
 * Gets the device UUID from the browser cookie.
 */
const getDeviceUuidFromCookie = (): string | undefined => {
    return document.cookie
        .split("; ")
        .find(row => row.startsWith("deviceUuid="))
        ?.split("=")[1];
};

/**
 * Custom hook to manage device state and operations.
 */
export const useDevices = () => {
    const [devices, setDevices] = useState<Device[]>([]);

    const currentDeviceRegistered = devices.some(
        device => device.uuid === getDeviceUuidFromCookie()
    );

    const websocketService = useWebSocketService();
    const { sendHeartbeat } = useDeviceHeartbeat({
        status: DeviceStatus.ONLINE,
        enabled: false,
    });

    /**
     * Fetches all devices for the current user from the backend.
     */
    const fetchDevices = useCallback(async () => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/devices`, {
                method: "GET",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Abrufen der registrierten Geräte. Bitte versuche es später erneut."
            );
            console.error("Error fetching devices:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Abrufen der registrierten Geräte. Bitte versuche es später erneut."
            );
            console.error("Error fetching devices:", response.statusText);
            return;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Fehler beim Abrufen der registrierten Geräte. Bitte versuche es später erneut."
            );
            console.error("Error parsing device names:", parseError);
            return;
        }

        const currentDeviceUuid = getDeviceUuidFromCookie();
        const devicesData = responseBody as DeviceResponse;

        assert(devicesData && devicesData.devices, "Invalid device response");

        const updatedDevices: Device[] = devicesData.devices.map(device => ({
            name: device.displayName,
            current: device.uuid === currentDeviceUuid,
            status: device.status,
            uuid: device.uuid,
        }));

        setDevices(updatedDevices);
    }, []);

    /**
     * Registers the current device with the backend.
     */
    const registerCurrentDevice = useCallback(async () => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/device/register`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": navigator.userAgent,
                },
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Registrieren des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error registering device:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Registrieren des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error registering device:", response.statusText);
            return;
        }

        sendHeartbeat();
    }, [sendHeartbeat]);

    /**
     * Deletes a device by sending its UUID to the server.
     */
    const deleteDevice = useCallback(async (device: Device) => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/device`, {
                method: "DELETE",
                credentials: "include",
                body: JSON.stringify(device.uuid),
                headers: {
                    "Content-Type": "application/json",
                },
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Löschen des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error deleting device:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Löschen des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error deleting device:", response.statusText);
            return;
        }
    }, []);

    /**
     * Initiates a quick connect to another device.
     */
    const connectToDevice = useCallback(
        (device: Device) => {
            if (device.status !== DeviceStatus.ONLINE) {
                toast.warn(
                    `Dein Gerät ${device.name} ist nicht bereit für eine Verbindung.`,
                    {
                        toastId: "device-not-online-toast",
                        updateId: "device-not-online-toast",
                    }
                );
                return;
            }

            const msg = new QuickConnectMessage({
                deviceUuid: device.uuid,
            });

            websocketService.sendMessage(msg);
        },
        [websocketService]
    );

    /**
     * Handles incoming heartbeat messages to update device status
     */
    const handleHeartbeatMessage = useCallback(() => {
        const onHeartbeatReceived = (message: DeviceHeartbeatMessage) => {
            setDevices(prevDevices =>
                prevDevices.map(device =>
                    device.uuid === message.msg.uuid
                        ? { ...device, status: message.msg.status }
                        : device
                )
            );
        };

        websocketService.subscribeMessage(
            MessageType.DEVICE_HEARTBEAT,
            onHeartbeatReceived as MessageHandler
        );

        return () => {
            websocketService.unsubscribeMessage(
                MessageType.DEVICE_HEARTBEAT,
                onHeartbeatReceived as MessageHandler
            );
        };
    }, [websocketService]);

    /**
     * Handles incoming device-changed messages to add/remove devices from local state
     */
    const handleDeviceChangedMessage = useCallback(() => {
        const onDeviceChanged = (message: DeviceChangedMessage) => {
            const { action, device } = message.msg;

            if (action === "added") {
                const currentDeviceUuid = getDeviceUuidFromCookie();
                const newDevice: Device = {
                    name: device.displayName,
                    current: device.uuid === currentDeviceUuid,
                    status: device.status,
                    uuid: device.uuid,
                };

                setDevices(prevDevices => {
                    // Check if device already exists, shouldn't happen, but defensive
                    if (prevDevices.some(d => d.uuid === device.uuid)) {
                        return prevDevices;
                    }
                    return [...prevDevices, newDevice];
                });
            } else if (action === "removed") {
                setDevices(prevDevices =>
                    prevDevices.filter(d => d.uuid !== device.uuid)
                );
            }
        };

        websocketService.subscribeMessage(
            MessageType.DEVICE_CHANGED,
            onDeviceChanged as MessageHandler
        );

        return () => {
            websocketService.unsubscribeMessage(
                MessageType.DEVICE_CHANGED,
                onDeviceChanged as MessageHandler
            );
        };
    }, [websocketService]);

    useEffect(() => {
        void fetchDevices();
        const cleanupHeartbeat = handleHeartbeatMessage();
        const cleanupDeviceChanged = handleDeviceChangedMessage();

        return () => {
            cleanupHeartbeat();
            cleanupDeviceChanged();
        };
    }, [fetchDevices, handleHeartbeatMessage, handleDeviceChangedMessage]);

    return {
        devices,
        currentDeviceRegistered,
        registerCurrentDevice,
        deleteDevice,
        connectToDevice,
    };
};
