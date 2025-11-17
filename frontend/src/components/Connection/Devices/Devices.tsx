import { useAuth } from "../../../context/AuthContext";
import QuestionIcon from "../../../assets/icons8-question.svg?react";
import css from "./Devices.module.scss";
import Anchor from "../../Anchor/Anchor";
import DeviceList from "./DeviceList/DeviceList";
import Tooltip from "../../Tooltip/Tooltip";

export default function Devices() {
    const { isLoggedIn, isLoading } = useAuth();

    if (isLoading) {
        return null;
    }

    return (
        <div className={css.devicesInfo}>
            {isLoggedIn ? (
                <>
                    <div className={css.loggedIn}>
                        Deine registrierten Geräte{" "}
                        <Tooltip content={"Zu FAQ wechseln: Geräteverwaltung"}>
                            <Anchor to={"/faq#device-management"}>
                                <QuestionIcon className={css.icon} />
                            </Anchor>
                        </Tooltip>
                    </div>
                    <DeviceList />
                </>
            ) : (
                <div className={css.notLoggedIn}>
                    Melde dich an, um Geräte zu registrieren
                    <Tooltip content={"Zu FAQ wechseln: Geräteverwaltung"}>
                        <Anchor to={"/faq#device-management"}>
                            <QuestionIcon className={css.icon} />
                        </Anchor>
                    </Tooltip>
                </div>
            )}
        </div>
    );
}
