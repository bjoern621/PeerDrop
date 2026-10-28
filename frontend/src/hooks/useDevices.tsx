import {
    Dispatch,
    SetStateAction,
    useCallback,
    useEffect,
    useState,
} from "react";
import { toast } from "react-toastify/unstyled";
import i18n from "../i18n/i18n";
import { Device } from "../types/device/Device";
import { DeviceResponse } from "../util/dtos/DeviceResponse";
import { DeviceStatus } from "../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../types/device/DeviceHeartbeatMessage";
import { DeviceChangedMessage } from "../types/device/DeviceChangedMessage";
import { MessageType } from "../types/MessageType";
import errorAsValue from "../util/ErrorAsValue";
import { assert } from "../util/Assert";
import { useDeviceHeartbeat } from "./useDeviceHeartbeat";
import { useWebSocketMessage } from "./useWebSocketMessage";
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
 * Fetches all devices for the current user from the backend.
 */
const fetchDevices = async (setDevices: Dispatch<SetStateAction<Device[]>>) => {
    const [response, err] = await errorAsValue(
        fetch(`${getRuntimeEnvVars().backendUrl}/devices`, {
            method: "GET",
            credentials: "include",
        })
    );

    if (err) {
        toast.error(i18n.t("dashboard:devices.toast.fetchFailed"));
        console.error("Error fetching devices:", err);
        return;
    } else if (!response.ok) {
        toast.error(i18n.t("dashboard:devices.toast.fetchFailed"));
        console.error("Error fetching devices:", response.statusText);
        return;
    }

    const [responseBody, parseError] = await errorAsValue(response.json());

    if (parseError) {
        toast.error(i18n.t("dashboard:devices.toast.fetchFailed"));
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
};

/** Devices after a heartbeat that carries the status of one of them. */
const withHeartbeat = (
    devices: Device[],
    message: DeviceHeartbeatMessage
): Device[] =>
    devices.map(device =>
        device.uuid === message.msg.uuid
            ? { ...device, status: message.msg.status }
            : device
    );

/** Devices after a device-changed message that adds, removes or renames one. */
const withDeviceChange = (
    devices: Device[],
    message: DeviceChangedMessage
): Device[] => {
    const { action, deviceInfo } = message.msg;

    if (action === "added") {
        const currentDeviceUuid = getDeviceUuidFromCookie();
        if (devices.some(d => d.uuid === deviceInfo.uuid)) {
            // Race condition:
            // Dummy device already added by /device/register response
            // Only update name because other fields are already correct
            console.log("Device already exists, updating name only.");
            return devices.map(device =>
                device.uuid === currentDeviceUuid
                    ? { ...device, name: deviceInfo.displayName }
                    : device
            );
        }

        // New device, add to list
        return [
            ...devices,
            {
                name: deviceInfo.displayName,
                current: deviceInfo.uuid === currentDeviceUuid,
                status: DeviceStatus.ONLINE,
                uuid: deviceInfo.uuid,
            },
        ];
    }
    if (action === "removed") {
        return devices.filter(d => d.uuid !== deviceInfo.uuid);
    }
    if (action === "renamed") {
        return devices.map(device =>
            device.uuid === deviceInfo.uuid
                ? { ...device, name: deviceInfo.displayName }
                : device
        );
    }
    return devices;
};

/**
 * Custom hook to manage device state and operations.
 */
export const useDevices = () => {
    const [devices, setDevices] = useState<Device[]>([]);

    const currentDeviceRegistered = devices.some(
        device => device.uuid === getDeviceUuidFromCookie()
    );

    const { sendHeartbeat } = useDeviceHeartbeat({
        status: DeviceStatus.ONLINE,
        enabled: false,
    });

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
            toast.error(i18n.t("dashboard:devices.toast.registerFailed"));
            console.error("Error registering device:", err);
            return;
        } else if (!response.ok) {
            toast.error(i18n.t("dashboard:devices.toast.registerFailed"));
            console.error("Error registering device:", response.statusText);
            return;
        }

        // Fixes race condition between WebSocket DEVICE_CHANGED and response of /device/register
        setDevices(prevDevices => {
            const currentDeviceUuid = getDeviceUuidFromCookie()!;

            if (prevDevices.some(device => device.uuid === currentDeviceUuid)) {
                // Device already added by WebSocket DEVICE_CHANGED

                // Only update 'current' flag, because Cookie is now set and wasn't before
                return prevDevices.map(device =>
                    device.uuid === currentDeviceUuid
                        ? { ...device, current: true }
                        : device
                );
            }

            // Add a dummy device ourselves since WebSocket was slower or hasn't arrived yet
            return [
                ...prevDevices,
                {
                    name: i18n.t("dashboard:devices.currentName"),
                    current: true,
                    status: DeviceStatus.ONLINE,
                    uuid: currentDeviceUuid,
                },
            ];
        });

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
            toast.error(i18n.t("dashboard:devices.toast.deleteFailed"));
            console.error("Error deleting device:", err);
            return;
        } else if (!response.ok) {
            toast.error(i18n.t("dashboard:devices.toast.deleteFailed"));
            console.error("Error deleting device:", response.statusText);
            return;
        }
    }, []);

    /**
     * Renames a device by sending its UUID and the new name to the server.
     */
    const renameDevice = useCallback(
        async (device: Device, newName: string) => {
            const [response, err] = await errorAsValue(
                fetch(`${getRuntimeEnvVars().backendUrl}/device`, {
                    method: "PATCH",
                    credentials: "include",
                    body: JSON.stringify({
                        uuid: device.uuid,
                        displayName: newName,
                    }),
                    headers: {
                        "Content-Type": "application/json",
                    },
                })
            );

            if (err) {
                toast.error(i18n.t("dashboard:devices.toast.renameFailed"));
                console.error("Error renaming device:", err);
                return;
            } else if (!response.ok) {
                toast.error(i18n.t("dashboard:devices.toast.renameFailed"));
                console.error("Error renaming device:", response.statusText);
                return;
            }

            setDevices(prevDevices =>
                prevDevices.map(d =>
                    d.uuid === device.uuid ? { ...d, name: newName } : d
                )
            );
        },
        []
    );

    useWebSocketMessage<DeviceHeartbeatMessage>(
        MessageType.DEVICE_HEARTBEAT,
        message => setDevices(devices => withHeartbeat(devices, message))
    );
    useWebSocketMessage<DeviceChangedMessage>(
        MessageType.DEVICE_CHANGED,
        message => setDevices(devices => withDeviceChange(devices, message))
    );

    useEffect(() => {
        void fetchDevices(setDevices);
    }, []);

    return {
        devices,
        currentDeviceRegistered,
        registerCurrentDevice,
        deleteDevice,
        renameDevice,
    };
};
