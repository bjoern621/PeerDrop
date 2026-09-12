// Package config resolves the instance a session talks to.
package config

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/pion/webrtc/v4"
)

// DefaultHost is the instance used when the invocation names none.
const DefaultHost = "https://peerdrop.de"

const envvarsPath = "/envvars.json"

const loadTimeout = 10 * time.Second

// Instance is what a session needs to reach a peer through one PeerDrop deployment.
type Instance struct {
	// Origin of the web frontend. No trailing slash.
	Host         string
	WSBackendURL string
	ICEServers   []webrtc.ICEServer
}

// ConnectURL is the page a peer opens to enter this client's token.
func (i Instance) ConnectURL() string {
	return i.Host + "/connect"
}

// Load reads the instance description the frontend publishes.
// ICE servers fall back to the built-in list when the instance names none.
func Load(ctx context.Context, host string) (Instance, error) {
	normalized, err := normalizeHost(host)
	if err != nil {
		return Instance{}, err
	}

	ctx, cancel := context.WithTimeout(ctx, loadTimeout)
	defer cancel()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, normalized+envvarsPath, nil)
	if err != nil {
		return Instance{}, err
	}

	response, err := http.DefaultClient.Do(request)
	if err != nil {
		return Instance{}, fmt.Errorf("Could not reach %s. %s", normalized, reason(err))
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return Instance{}, fmt.Errorf("%s answered %s for %s. Check the address, or name another instance with --host", normalized, response.Status, envvarsPath)
	}

	body, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return Instance{}, err
	}

	var parsed envvars
	if err := json.Unmarshal(body, &parsed); err != nil {
		return Instance{}, fmt.Errorf("could not read %s from %s: %w", envvarsPath, normalized, err)
	}

	if parsed.WSBackendURL == "" {
		return Instance{}, fmt.Errorf("%s from %s names no signaling address", envvarsPath, normalized)
	}

	instance := Instance{
		Host:         normalized,
		WSBackendURL: strings.TrimSuffix(parsed.WSBackendURL, "/"),
		ICEServers:   parsed.iceServers(),
	}

	return instance, nil
}

// reason strips the request wrapper, which repeats the address the message already names.
func reason(err error) string {
	var requestErr *url.Error
	if errors.As(err, &requestErr) {
		return requestErr.Err.Error()
	}

	return err.Error()
}

// normalizeHost accepts "peerdrop.de" as well as a full origin and returns an origin without trailing slash.
func normalizeHost(host string) (string, error) {
	host = strings.TrimSpace(host)
	if host == "" {
		host = DefaultHost
	}

	if !strings.Contains(host, "://") {
		host = "https://" + host
	}

	parsed, err := url.Parse(host)
	if err != nil {
		return "", fmt.Errorf("%q is not a valid host: %w", host, err)
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", fmt.Errorf("%q is not an http or https address", host)
	}

	if parsed.Host == "" {
		return "", fmt.Errorf("%q names no host", host)
	}

	return strings.TrimSuffix(parsed.Scheme+"://"+parsed.Host+parsed.Path, "/"), nil
}

type envvars struct {
	WSBackendURL string      `json:"wsBackendUrl"`
	ICEServers   []iceServer `json:"iceServers"`
}

func (e envvars) iceServers() []webrtc.ICEServer {
	if len(e.ICEServers) == 0 {
		return FallbackICEServers()
	}

	servers := make([]webrtc.ICEServer, 0, len(e.ICEServers))
	for _, server := range e.ICEServers {
		if len(server.URLs) == 0 {
			continue
		}
		servers = append(servers, webrtc.ICEServer{
			URLs:       server.URLs,
			Username:   server.Username,
			Credential: server.Credential,
		})
	}

	if len(servers) == 0 {
		return FallbackICEServers()
	}

	return servers
}

type iceServer struct {
	URLs       stringList `json:"urls"`
	Username   string     `json:"username"`
	Credential string     `json:"credential"`
}

// stringList accepts the single string and the array form the WebRTC configuration allows for "urls".
type stringList []string

func (l *stringList) UnmarshalJSON(data []byte) error {
	var single string
	if err := json.Unmarshal(data, &single); err == nil {
		*l = stringList{single}
		return nil
	}

	var many []string
	if err := json.Unmarshal(data, &many); err != nil {
		return err
	}

	*l = many
	return nil
}

// FallbackICEServers mirrors the list the web client carries for instances that publish none.
func FallbackICEServers() []webrtc.ICEServer {
	return []webrtc.ICEServer{
		{URLs: []string{"stun:stun.l.google.com:19302"}},
		{
			URLs:       []string{"turn:global.relay.metered.ca:443"},
			Username:   "7cfed80f2da5f327b1e8a894",
			Credential: "Uvb5QuG/FHIpdQYA",
		},
		{
			URLs:       []string{"turns:global.relay.metered.ca:443?transport=tcp"},
			Username:   "7cfed80f2da5f327b1e8a894",
			Credential: "Uvb5QuG/FHIpdQYA",
		},
	}
}
