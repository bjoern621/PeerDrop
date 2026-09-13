import css from "./UserProfile.module.scss";
import userIcon from "../../../assets/account_circle_black.svg";
import userIconLight from "../../../assets/account_circle_light.svg";
import deleteIconDark from "../../../assets/delete_dark.svg";
import deleteIconLight from "../../../assets/delete_light.svg";
import addIcon from "../../../assets/add.svg";
import logoutIcon from "../../../assets/logout.svg";
import errorAsValue from "../../../util/ErrorAsValue";
import { useEffect, useState } from "react";
import { assert } from "../../../util/Assert";
import { LoginResponse } from "../../../util/dtos/LoginResponse";
import { DeviceResponse } from "../../../util/dtos/DeviceResponse";
import { DeviceStatus } from "../../../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../../../types/device/DeviceHeartbeatMessage";
import {
    MessageHandler,
    WebSocketService,
} from "../../../services/WebSocketService";
import { useWebSocketService } from "../../../context/connection/WebSocketContext";
import { MessageType } from "../../../types/MessageType";
import { QuickConnectMessage } from "../../../types/connection/QuickConnectMessage";
import { toast } from "react-toastify/unstyled";
import { getRuntimeEnvVars } from "../../../util/RuntimeEnvVars";

interface DeviceDisplay {
    status: DeviceStatus;
    current: boolean;
    name: string;
    uuid: string;
}

/**
 * Reads the device UUID the backend stored as a cookie.
 * undefined while the device is unregistered.
 */
const getDeviceUuidFromCookie = (): string | undefined => {
    return document.cookie
        .split("; ")
        .find(row => row.startsWith("deviceUuid="))
        ?.split("=")[1];
};

/**
 * Sends a heartbeat for the registered device.
 * No-op while the device is unregistered.
 */
const sendHeartbeat = (
    websocketService: WebSocketService,
    status: DeviceStatus
) => {
    const deviceUuid = getDeviceUuidFromCookie();

    if (!deviceUuid) {
        return;
    }

    websocketService.sendMessage(
        new DeviceHeartbeatMessage({ uuid: deviceUuid, status })
    );
};

export const UserProfile = () => {
    const [userName, setUserName] = useState<string | null>(null);
    const [devices, setDevices] = useState<DeviceDisplay[]>([]);
    const [currentDeviceRegistered, setCurrentDeviceRegistered] =
        useState(false);
    const [registerButtonDisabled, setRegisterButtonDisabled] = useState(false);

    const websocketService = useWebSocketService();

    // const handleDeviceChangedMessage = useCallback(() => {
    //     const onDeviceChanged = async () => {
    //         await fetchDevices();
    //     };

    //     websocketService.subscribeMessage(
    //         MessageType.DEVICE_CHANGED,
    //         onDeviceChanged as MessageHandler
    //     );
    // }, [websocketService]);

    useEffect(() => {
        void fetchUserName();
        void fetchDevices();

        // handleDeviceChangedMessage();

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

        sendHeartbeat(websocketService, DeviceStatus.ONLINE);

        const sendOfflineHeartbeat = () => {
            sendHeartbeat(websocketService, DeviceStatus.OFFLINE);
        };
        window.addEventListener("beforeunload", sendOfflineHeartbeat);

        return () => {
            websocketService.unsubscribeMessage(
                MessageType.DEVICE_HEARTBEAT,
                onHeartbeatReceived as MessageHandler
            );
            window.removeEventListener("beforeunload", sendOfflineHeartbeat);
        };

        // Both fetches load the initial state once. The profile has no reload path
        // that would justify re-running them.
        // exhaustive-deps-exclude [fetchUserName, fetchDevices]
    }, [websocketService]);

    const fetchDevices = async () => {
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
        const updatedDevices: DeviceDisplay[] = devicesData.devices
            .map(device => ({
                name: device.displayName,
                current: device.uuid === currentDeviceUuid,
                status: device.status,
                uuid: device.uuid,
            }))
            .filter(deviceDisplay => !deviceDisplay.current);
        const hasCurrentDevice = devicesData.devices.some(
            device => device.uuid === currentDeviceUuid
        );
        setRegisterButtonDisabled(hasCurrentDevice);
        setCurrentDeviceRegistered(hasCurrentDevice);
        setDevices(updatedDevices);
    };

    const fetchUserName = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/me`, {
                method: "GET",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Abrufen des Benutzernamens. Bitte versuche es später erneut."
            );
            console.error("Error fetching user name:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Abrufen des Benutzernamens. Bitte versuche es später erneut."
            );
            console.error("Error fetching user name:", response.statusText);
            return;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
            toast.error(
                "Fehler beim Abrufen des Benutzernamens. Bitte versuche es später erneut."
            );
            console.error("Error parsing user name response:", parseError);
            return;
        }

        const loginData = responseBody as LoginResponse;
        assert(loginData && loginData.message, "Invalid user name response");

        setUserName(loginData.message);
    };

    const registerCurrentDevice = async () => {
        setRegisterButtonDisabled(true);

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

        setRegisterButtonDisabled(false);

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

        setCurrentDeviceRegistered(true);

        sendHeartbeat(websocketService, DeviceStatus.ONLINE);
    };

    const connectDevice = (device: DeviceDisplay) => {
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
    };

    const deleteCurrentDevice = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/device`, {
                method: "DELETE",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Löschen des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error unregistering device:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Löschen des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error unregistering device:", response.statusText);
            return;
        }
        setCurrentDeviceRegistered(false);
        setRegisterButtonDisabled(false);
    };

    const deleteOtherDevice = async (device: DeviceDisplay) => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/devices`, {
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
            console.error("Error unregistering device:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Löschen des Geräts. Bitte versuche es später erneut."
            );
            console.error("Error unregistering device:", response.statusText);
            return;
        }
        setDevices(devices.filter(d => d.uuid !== device.uuid));
    };

    function getDeviceStatusClass(status: DeviceStatus) {
        switch (status) {
            case DeviceStatus.ONLINE:
                return css.deviceOnline;
            case DeviceStatus.BUSY:
                return css.deviceBusy;
            default:
                return css.deviceOffline;
        }
    }

    const logout = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${getRuntimeEnvVars().backendUrl}/logout`, {
                method: "POST",
                credentials: "include",
            })
        );

        if (err) {
            toast.error(
                "Fehler beim Ausloggen. Bitte versuche es später erneut."
            );
            console.error("Error logging out:", err);
            return;
        } else if (!response.ok) {
            toast.error(
                "Fehler beim Ausloggen. Bitte versuche es später erneut."
            );
            console.error("Error logging out:", response.statusText);
            return;
        }

        window.location.reload();
    };

    return (
        <div className={css.container}>
            <img className={css.profilePicture} src={userIcon}></img>
            <div className={css.profileNameContainer}>
                <h3 className={css.greeting}>Hi {userName}!</h3>
                <button
                    className={css.logoutButton}
                    onClick={() => void logout()}
                >
                    <img src={logoutIcon} alt="Logout" />
                </button>
            </div>
            <div className={css.registeredDevices}>
                <h4>Registrierte Geräte</h4>
                <ul className={css.deviceList}>
                    <li key={-1} className={css.deviceListItem}>
                        {!currentDeviceRegistered ? (
                            <button
                                className={css.unregisteredCurrentDevice}
                                type="button"
                                onClick={() => void registerCurrentDevice()}
                                disabled={registerButtonDisabled}
                            >
                                <span className={css.deviceInfo}>
                                    <img
                                        src={addIcon}
                                        className={css.deviceStatusBase}
                                    ></img>
                                    <p>Gerät hinzufügen</p>
                                </span>
                            </button>
                        ) : (
                            <div className={css.registeredCurrentDevice}>
                                <span className={css.deviceInfo}>
                                    <img
                                        src={userIconLight}
                                        className={css.deviceStatusBase}
                                    />
                                    <p>Dieses Gerät</p>
                                </span>
                                <span className={css.deleteButtonContainer}>
                                    <span
                                        className={css.deleteButton}
                                        onClick={() =>
                                            void deleteCurrentDevice()
                                        }
                                    >
                                        <img src={deleteIconLight} />
                                    </span>
                                </span>
                            </div>
                        )}
                    </li>
                    {devices.map((device, index) => (
                        <li key={index} className={css.deviceListItem}>
                            <button
                                className={css.connectButton}
                                onClick={() => connectDevice(device)}
                            >
                                <span className={css.deviceInfo}>
                                    <span
                                        className={getDeviceStatusClass(
                                            device.status
                                        )}
                                    ></span>
                                    <p>{device.name}</p>
                                </span>
                                <span className={css.deleteButtonContainer}>
                                    <span
                                        className={css.deleteButton}
                                        onClick={e => {
                                            e.stopPropagation();
                                            void deleteOtherDevice(device);
                                        }}
                                    >
                                        <img src={deleteIconDark} />
                                    </span>
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
