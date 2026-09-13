import css from "./UserProfile.module.scss";
import userIcon from "../../../assets/account_circle_black.svg";
import userIconLight from "../../../assets/account_circle_light.svg";
import deleteIconDark from "../../../assets/delete_dark.svg";
import deleteIconLight from "../../../assets/delete_light.svg";
import addIcon from "../../../assets/add.svg";
import logoutIcon from "../../../assets/logout.svg";
import errorAsValue from "../../../util/ErrorAsValue";
import { DeviceStatus } from "../../../types/device/DeviceStatus";
import { toast } from "react-toastify/unstyled";
import { getRuntimeEnvVars } from "../../../util/RuntimeEnvVars";
import { useDevices } from "../../../hooks/useDevices";

export const UserProfile = () => {
    const {
        devices,
        userName,
        currentDeviceRegistered,
        registerCurrentDevice,
        deleteDevice,
        deleteCurrentDevice,
        connectToDevice,
    } = useDevices();

    // Current device gets its own entry above the list.
    const otherDevices = devices.filter(device => !device.current);

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
                    {otherDevices.map(device => (
                        <li key={device.uuid} className={css.deviceListItem}>
                            <button
                                className={css.connectButton}
                                onClick={() => connectToDevice(device)}
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
                                            void deleteDevice(device);
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
