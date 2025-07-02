import css from "./UserProfile.module.scss";
import userIcon from "../../../assets/account_circle_black.svg";
import userIconLight from "../../../assets/account_circle_light.svg";
import deleteIconDark from "../../../assets/delete_dark.svg";
import deleteIconLight from "../../../assets/delete_light.svg";
import addIcon from "../../../assets/add.svg";
import logoutIcon from "../../../assets/logout.svg";
import errorAsValue from "../../../util/ErrorAsValue";
import { useCallback, useEffect, useState } from "react";
import { assert } from "../../../util/Assert";
import { LoginResponse } from "../../../util/dtos/LoginResponse";
import { DeviceResponse } from "../../../util/dtos/DeviceResponse";
import { DeviceStatus } from "../../../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../../../types/device/DeviceHeartbeatMessage";
import { MessageHandler } from "../../../services/WebSocketService";
import { useWebSocketService } from "../../../context/WebSocketContext";
import { MessageType } from "../../../types/MessageType";
import { toast } from "react-toastify";

interface DeviceDisplay {
    status: DeviceStatus;
    current: boolean;
    name: string;
    uuid: string;
}

export const UserProfile = () => {
    const [userName, setUserName] = useState<string | null>(null);
    const [devices, setDevices] = useState<DeviceDisplay[]>([]);
    const [connectedDevice, setConnectedDevice] =
        useState<DeviceDisplay | null>(null);
    const [currentDeviceRegistered, setCurrentDeviceRegistered] =
        useState(false);
    const [registerButtonDisabled, setRegisterButtonDisabled] = useState(false);

    const websocketService = useWebSocketService();

    const HEARTBEAT_INTERVAL_MS = 1000 * 60; // 1 minute; THIS IS LINKED TO THE BACKEND VARIABLE: INACTIVE_HEARTBEAT_CHECK_INTERVAL_MS

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
    }, [websocketService]);

    /**
     * Sends a heartbeat message if the user has registered the device.
     */
    const sendHeartbeatIfPossible = useCallback(() => {
        const deviceUuid: string | undefined = document.cookie
            .split("; ")
            .find(row => row.startsWith("deviceUuid="))
            ?.split("=")[1];

        if (!deviceUuid) {
            return; // The user might not have registered the device
        }

        const heartbeat = new DeviceHeartbeatMessage({
            uuid: deviceUuid,
            status: DeviceStatus.ONLINE,
        });

        websocketService.sendMessage(heartbeat);
    }, [websocketService]);

    /**
     * Sets up an event listener to send an offline heartbeat when the tab is closed.
     */
    const registerOfflineHeartbeatOnClose = useCallback(() => {
        const handleTabClose = () => {
            const deviceUuid: string | undefined = document.cookie
                .split("; ")
                .find(row => row.startsWith("deviceUuid="))
                ?.split("=")[1];

            if (!deviceUuid) {
                return; // The user might not have registered the device
            }

            const heartbeat = new DeviceHeartbeatMessage({
                uuid: deviceUuid,
                status: DeviceStatus.OFFLINE,
            });
            websocketService.sendMessage(heartbeat);

            window.removeEventListener("beforeunload", handleTabClose);
        };
        window.addEventListener("beforeunload", handleTabClose);
    }, [websocketService]);

    /**
     * Sends a heartbeat message every HEARTBEAT_INTERVAL_MS.
     */
    const sendContinuousHeartbeat = useCallback(() => {
        const timer = setInterval(() => {
            sendHeartbeatIfPossible();
        }, HEARTBEAT_INTERVAL_MS);

        return () => {
            clearTimeout(timer);
        };
    }, [sendHeartbeatIfPossible, HEARTBEAT_INTERVAL_MS]);

    useEffect(() => {
        void fetchUserName();
        void fetchDevices();

        handleHeartbeatMessage();

        sendHeartbeatIfPossible();

        registerOfflineHeartbeatOnClose();

        sendContinuousHeartbeat();
    }, [
        handleHeartbeatMessage,
        sendHeartbeatIfPossible,
        registerOfflineHeartbeatOnClose,
        sendContinuousHeartbeat,
    ]);

    const fetchDevices = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/devices`, {
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

        const devicesData = responseBody as DeviceResponse;
        assert(devicesData && devicesData.devices, "Invalid device response");
        const updatedDevices: DeviceDisplay[] = devicesData.devices
            .map(deviceName => ({
                name: deviceName.displayName,
                current: deviceName.isCurrentDevice,
                status: deviceName.status,
                uuid: deviceName.uuid,
            }))
            .filter(device => !device.current);
        const isCurrentDevice = devicesData.devices.some(
            device => device.isCurrentDevice
        );
        setRegisterButtonDisabled(isCurrentDevice);
        setCurrentDeviceRegistered(isCurrentDevice);
        setDevices(updatedDevices);
    };

    const fetchUserName = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/me`, {
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
            fetch(`${import.meta.env.VITE_BACKEND_URL}/device/register`, {
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

        sendHeartbeatIfPossible();
    };

    const connectDevice = (device: DeviceDisplay) => {
        if (connectedDevice?.name === device.name) return;
        console.log("Connecting to device " + device.name);
        setConnectedDevice(device);
    };

    const deleteCurrentDevice = async () => {
        const currentDevice = {
            name: "Current Device",
        };

        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/devices`, {
                method: "DELETE",
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("token"),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(currentDevice),
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
    };

    const deleteDevice = (device: DeviceDisplay) => {
        console.log("Deleting device " + device.name);

        setDevices(devices.filter(d => d.name !== device.name));
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
            fetch(`${import.meta.env.VITE_BACKEND_URL}/logout`, {
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
                                    <p>Current Device</p>
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
                                className={[
                                    css.connectButton,
                                    connectedDevice === device
                                        ? css.selected
                                        : "",
                                ].join(" ")}
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
                                            deleteDevice(device);
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
