import { usePeerConnectionManager } from "../../context/connection/PeerConnectionContext";

interface RemoteTokenDisplayProps {
    placeholder?: string;
}

/**
 * Component to display the remote token of the connected peer.
 *
 * @param placeholder Placeholder string if the remote token is not (yet) available
 */
export default function RemoteTokenDisplay({
    placeholder = "?????",
}: RemoteTokenDisplayProps) {
    const peerConnectionManager = usePeerConnectionManager();

    const getRemoteTokenIfAvailable = () => {
        if (
            !peerConnectionManager.getConnection() ||
            peerConnectionManager.getConnection()?.getPeerConnection()
                .connectionState !== "connected"
        ) {
            return undefined;
        } else {
            return peerConnectionManager.getRemoteToken();
        }
    };

    return <span>{getRemoteTokenIfAvailable() ?? placeholder}</span>;
}
