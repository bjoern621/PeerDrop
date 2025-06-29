import css from "./UserProfile.module.scss";
import userIcon from "../../../assets/account_circle_icon.svg";
import userIconLight from "../../../assets/account_circle_icon_light.svg";
import deleteIcon from "../../../assets/delete_icon.svg";
import deleteIconLight from "../../../assets/delete_icon_light.svg";
import addIcon from "../../../assets/add_icon.svg";
import errorAsValue from "../../../util/ErrorAsValue";
import { useCallback, useEffect, useState } from "react";
import { assert } from "../../../util/Assert";
import { LoginResponse } from "../../dtos/LoginResponse";
import { DeviceResponse } from "../../dtos/DeviceResponse";
import { DeviceStatus } from "../../../types/device/DeviceStatus";
import { DeviceHeartbeatMessage } from "../../../types/device/DeviceHeartbeatMessage";
import {
    MessageHandler,
    TypedMessage,
} from "../../../services/WebSocketService";
import { MessageType } from "../../../services/MessageType";
import { useWebSocketService } from "../../../context/WebSocketContext";

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

    const handleHeartbeatMessage = useCallback(() => {
        const onHeartbeatReceived = (
            message: TypedMessage<DeviceHeartbeatMessage>
        ) => {
            console.log("Received heartbeat message:", message);

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

        const heartbeat: TypedMessage<DeviceHeartbeatMessage> = {
            type: MessageType.DEVICE_HEARTBEAT,
            msg: {
                uuid: deviceUuid,
                status: DeviceStatus.ONLINE,
            },
        };

        websocketService.sendMessage(heartbeat);
    }, [websocketService]);

    /**
     * Sets up an event listener to send an offline heartbeat when the tab is closed.
     */
    const sendOfflineHeartbeat = useCallback(() => {
        const handleTabClose = () => {
            const deviceUuid: string | undefined = document.cookie
                .split("; ")
                .find(row => row.startsWith("deviceUuid="))
                ?.split("=")[1];

            if (!deviceUuid) {
                return; // The user might not have registered the device
            }

            const heartbeat: TypedMessage<DeviceHeartbeatMessage> = {
                type: MessageType.DEVICE_HEARTBEAT,
                msg: {
                    uuid: deviceUuid,
                    status: DeviceStatus.OFFLINE,
                },
            };
            websocketService.sendMessage(heartbeat);

            window.removeEventListener("beforeunload", handleTabClose);
        };
        window.addEventListener("beforeunload", handleTabClose);
    }, [websocketService]);

    useEffect(() => {
        void fetchUserName();
        void fetchDevices();

        handleHeartbeatMessage();

        sendHeartbeatIfPossible();

        sendOfflineHeartbeat();
    }, [handleHeartbeatMessage, sendHeartbeatIfPossible, sendOfflineHeartbeat]);

    const fetchDevices = async () => {
        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/devices`, {
                method: "GET",
                credentials: "include",
            })
        );

        if (err) {
            console.error("Error fetching devices:", err);
            return;
        } else if (!response.ok) {
            console.error("Error fetching devices:", response.statusText);
            return;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
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
            console.error("Error fetching user name:", err);
            return;
        } else if (!response.ok) {
            console.error("Error fetching user name:", response.statusText);
            return;
        }

        const [responseBody, parseError] = await errorAsValue(response.json());

        if (parseError) {
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
            console.error("Error registering device:", err);
            return;
        } else if (!response.ok) {
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
            console.error("Error unregistering device:", err);
            return;
        } else if (!response.ok) {
            console.error("Error unregistering device:", response.statusText);
            return;
        }

        setCurrentDeviceRegistered(false);
    };

    const deleteDevice = (device: DeviceDisplay) => {
        console.log("Deleting device " + device.name);

        setDevices(devices.filter(d => d.name !== device.name));
    };

    return (
        <div className={css.container}>
            <img className={css.profilePicture} src={userIcon}></img>
            <h3 className={css.greeting}>Hi {userName}!</h3>
            <div className={css.registeredDevices}>
                <h4>Registrierte Geräte</h4>
                <ul className={css.deviceList}>
                    <li key={-1} className={css.deviceListItem}>
                        {!currentDeviceRegistered ? (
                            <button
                                className={css.addCurrentDeviceButton}
                                type="button"
                                onClick={() => void registerCurrentDevice()}
                                disabled={registerButtonDisabled}
                            >
                                <img
                                    src={addIcon}
                                    className={css.addIcon}
                                ></img>
                                Gerät hinzufügen
                            </button>
                        ) : (
                            <div className={css.currentDevice}>
                                <span className={css.deviceInfo}>
                                    <img src={userIconLight} />
                                    Current Device
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
                                        className={
                                            device.status ===
                                            DeviceStatus.ONLINE
                                                ? css.deviceOnline
                                                : device.status ===
                                                  DeviceStatus.TEMPORARILY_OFFLINE
                                                ? css.deviceTmpOffline
                                                : css.deviceOffline
                                        }
                                    ></span>
                                    {device.name}
                                </span>
                                <span className={css.deleteButtonContainer}>
                                    <span
                                        className={css.deleteButton}
                                        onClick={e => {
                                            e.stopPropagation();
                                            deleteDevice(device);
                                        }}
                                    >
                                        <img src={deleteIcon} />
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
