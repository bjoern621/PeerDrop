import css from "./UserProfile.module.scss";
import userIcon from "../../../assets/account_circle_icon.svg";
import userIconLight from "../../../assets/account_circle_icon_light.svg";
import deleteIcon from "../../../assets/delete_icon.svg";
import deleteIconLight from "../../../assets/delete_icon_light.svg";
import addIcon from "../../../assets/add_icon.svg";
import errorAsValue from "../../../util/ErrorAsValue";
import { useState } from "react";

enum DeviceStatus {
    ONLINE = "online",
    OFFLINE = "offline",
}

interface DeviceDisplay {
    status: DeviceStatus;
    name: string;
}

const mockDevices: DeviceDisplay[] = [
    {
        status: DeviceStatus.ONLINE,
        name: "MyPhone",
    },
    {
        status: DeviceStatus.OFFLINE,
        name: "Desktop-01",
    },
    {
        status: DeviceStatus.ONLINE,
        name: "Desktop-02",
    },
];

export const UserProfile = () => {
    const [devices, setDevices] = useState<DeviceDisplay[]>(mockDevices);
    const [connectedDevice, setConnectedDevice] =
        useState<DeviceDisplay | null>(null);
    const [currentDeviceRegistered, setCurrentDeviceRegistered] =
        useState(false);
    const [registerButtonDisabled, setRegisterButtonDisabled] = useState(false);

    const registerCurrentDevice = async () => {
        setRegisterButtonDisabled(true);
        const device = {
            name: "Current Device",
        };

        const [response, err] = await errorAsValue(
            fetch(`${import.meta.env.VITE_BACKEND_URL}/devices`, {
                method: "POST",
                headers: {
                    "Authorization": "Bearer " + localStorage.getItem("token"),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(device),
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
    };

    const connectDevice = (device: DeviceDisplay) => {
        if (connectedDevice?.name === device.name) return;
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
                    "Authorization": "Bearer " + localStorage.getItem("token"),
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
            <h3 className={css.greeting}>Hi User!</h3>
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
                                        onClick={() => void deleteCurrentDevice()}
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
