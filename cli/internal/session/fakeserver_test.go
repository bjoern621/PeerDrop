package session_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/coder/websocket"
)

// The signaling server reads a frame of this size in one piece and closes the connection above it.
const frameLimit = 1024

// fakeServer answers /envvars.json and /connect the way a PeerDrop instance does.
// It routes messages between clients without looking into the descriptions it carries.
type fakeServer struct {
	*httptest.Server

	mu      sync.Mutex
	clients map[string]*fakeClient
	issued  chan string
}

type fakeClient struct {
	token string
	conn  *websocket.Conn
	// Token of the client that asked this one to connect.
	requester string
}

func startFakeServer(t *testing.T) *fakeServer {
	t.Helper()

	server := &fakeServer{
		clients: map[string]*fakeClient{},
		issued:  make(chan string, 8),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/envvars.json", server.serveEnvvars)
	mux.HandleFunc("/connect", server.serveConnect)

	server.Server = httptest.NewServer(mux)
	t.Cleanup(server.Close)

	return server
}

func (s *fakeServer) serveEnvvars(writer http.ResponseWriter, _ *http.Request) {
	address := "ws" + strings.TrimPrefix(s.URL, "http")

	writer.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(writer).Encode(map[string]any{
		"wsBackendUrl":   address,
		"backendUrl":     s.URL,
		"frontendDomain": strings.TrimPrefix(s.URL, "http://"),
		// A STUN server that answers nothing. The peers pair over host
		// candidates, and the test reaches no outside address.
		"iceServers": []map[string]any{{"urls": "stun:127.0.0.1:3478"}},
	})
}

func (s *fakeServer) serveConnect(writer http.ResponseWriter, request *http.Request) {
	conn, err := websocket.Accept(writer, request, nil)
	if err != nil {
		return
	}

	conn.SetReadLimit(frameLimit)

	client := &fakeClient{token: s.nextToken(), conn: conn}

	s.mu.Lock()
	s.clients[client.token] = client
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.clients, client.token)
		s.mu.Unlock()

		_ = conn.Close(websocket.StatusNormalClosure, "")
	}()

	s.send(client, "client-token", map[string]any{"token": client.token})
	s.issued <- client.token

	for {
		_, data, err := conn.Read(request.Context())
		if err != nil {
			return
		}

		var envelope struct {
			Type string          `json:"type"`
			Msg  json.RawMessage `json:"msg"`
		}
		if err := json.Unmarshal(data, &envelope); err != nil {
			return
		}

		s.route(client, envelope.Type, envelope.Msg)
	}
}

func (s *fakeServer) route(sender *fakeClient, messageType string, raw json.RawMessage) {
	var msg map[string]any
	if err := json.Unmarshal(raw, &msg); err != nil {
		return
	}

	target, _ := msg["remoteToken"].(string)

	switch messageType {
	case "connection-request":
		peer := s.client(target)
		if peer == nil {
			s.send(sender, "connection-response", map[string]any{"accepted": false, "remoteToken": target})
			return
		}

		peer.requester = sender.token
		s.send(peer, "connection-request", map[string]any{"remoteToken": sender.token})

	case "connection-response":
		requester := s.client(target)
		if requester == nil {
			return
		}

		accepted, _ := msg["accepted"].(bool)
		s.send(requester, "connection-response", map[string]any{"accepted": accepted, "remoteToken": sender.token})

		if accepted {
			s.send(requester, "establish-connection", map[string]any{"remoteToken": sender.token})
			s.send(sender, "establish-connection", map[string]any{"remoteToken": requester.token})
		}

	case "sdp", "ice-candidate", "close-connection":
		peer := s.client(target)
		if peer == nil {
			return
		}

		msg["remoteToken"] = sender.token
		s.send(peer, messageType, msg)
	}
}

func (s *fakeServer) send(client *fakeClient, messageType string, msg any) {
	frame, err := json.Marshal(map[string]any{"type": messageType, "msg": msg})
	if err != nil {
		return
	}

	_ = client.conn.Write(context.Background(), websocket.MessageText, frame)
}

func (s *fakeServer) client(token string) *fakeClient {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.clients[strings.ToLower(token)]
}

// Tokens handed out in order, in the proquint shape the backend generates.
var fakeTokens = []string{"babab", "kuzok", "lusab", "nizom"}

func (s *fakeServer) nextToken() string {
	s.mu.Lock()
	defer s.mu.Unlock()

	return fakeTokens[len(s.clients)%len(fakeTokens)]
}
