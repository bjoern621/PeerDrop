import css from "./Connection.module.scss";
import ProfileIcon from "../../assets/icons8-name-tag.svg?react";
import ConnectIcon from "../../assets/icons8-computers-connecting.svg?react";

export default function Connection() {
    return (
        <>
            <div className={css.ownTokenContainer}>
                <h2>
                    <ProfileIcon /> Dein Token
                </h2>
            </div>
            <div className={css.connectToPeerContainer}>
                <h2>
                    <ConnectIcon /> Mit Peer verbinden
                </h2>
            </div>
        </>
    );
}
