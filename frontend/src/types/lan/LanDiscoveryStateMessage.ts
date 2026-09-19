import { ITypedMessage } from "../ITypedMessage";
import { MessageType } from "../MessageType";

/**
 * Tells the server whether this device takes part in LAN discovery. With
 * `enabled` false the server sends no peer list and leaves the device out of
 * the lists of the other devices in the same network.
 */
export class LanDiscoveryStateMessage implements ITypedMessage {
    public readonly type = MessageType.LAN_DISCOVERY_STATE;
    public msg: {
        enabled: boolean;
    };

    public constructor(msg: { enabled: boolean }) {
        this.msg = msg;
    }
}
