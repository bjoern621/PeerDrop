package signaling

import "encoding/json"

// Message types the signaling server routes. The web client speaks the same set.
const (
	TypeClientToken                = "client-token"
	TypeConnectionRequest          = "connection-request"
	TypeConnectionResponse         = "connection-response"
	TypeConnectionRequestCancelled = "connection-request-cancelled"
	TypeEstablishConnection        = "establish-connection"
	TypeSDP                        = "sdp"
	TypeICECandidate               = "ice-candidate"
	TypeCloseConnection            = "close-connection"
)

// Envelope is the frame shape of every signaling message.
type Envelope struct {
	Type string          `json:"type"`
	Msg  json.RawMessage `json:"msg"`
}

type ClientToken struct {
	Token string `json:"token"`
}

type ConnectionRequest struct {
	RemoteToken string `json:"remoteToken"`
}

type ConnectionResponse struct {
	Accepted    bool   `json:"accepted"`
	RemoteToken string `json:"remoteToken"`
}

type EstablishConnection struct {
	RemoteToken string `json:"remoteToken"`
}

type CloseConnection struct {
	RemoteToken string `json:"remoteToken"`
}

// SDP carries a session description in the form the browser serializes.
type SDP struct {
	RemoteToken string          `json:"remoteToken"`
	Description json.RawMessage `json:"description"`
}

// ICECandidate carries a candidate in the form the browser serializes.
type ICECandidate struct {
	RemoteToken  string          `json:"remoteToken"`
	ICECandidate json.RawMessage `json:"iceCandidate"`
}
