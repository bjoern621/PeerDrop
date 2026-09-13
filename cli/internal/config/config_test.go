package config

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNormalizeHostFillsInTheScheme(t *testing.T) {
	cases := map[string]string{
		"peerdrop.de":           "https://peerdrop.de",
		"https://peerdrop.de/":  "https://peerdrop.de",
		"http://localhost:8080": "http://localhost:8080",
		"":                      DefaultHost,
	}

	for host, want := range cases {
		got, err := normalizeHost(host)
		if err != nil {
			t.Errorf("normalizeHost(%q): %v", host, err)
			continue
		}

		if got != want {
			t.Errorf("normalizeHost(%q) = %q, want %q", host, got, want)
		}
	}
}

func TestNormalizeHostRefusesAnotherScheme(t *testing.T) {
	if _, err := normalizeHost("ftp://peerdrop.de"); err == nil {
		t.Error("an ftp address was accepted")
	}
}

func TestLoadReadsTheSignalingAddressAndICEServers(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = writer.Write([]byte(`{
			"wsBackendUrl": "ws://localhost:8080",
			"iceServers": [
				{"urls": "stun:stun.example:19302"},
				{"urls": ["turn:turn.example:443"], "username": "peer", "credential": "secret"}
			]
		}`))
	}))
	defer server.Close()

	instance, err := Load(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}

	if instance.WSBackendURL != "ws://localhost:8080" {
		t.Errorf("signaling address %q", instance.WSBackendURL)
	}

	if len(instance.ICEServers) != 2 {
		t.Fatalf("%d ICE servers, want 2", len(instance.ICEServers))
	}

	if instance.ICEServers[0].URLs[0] != "stun:stun.example:19302" {
		t.Errorf("first server %v", instance.ICEServers[0].URLs)
	}

	if instance.ICEServers[1].Username != "peer" {
		t.Errorf("second server has no credentials: %v", instance.ICEServers[1])
	}
}

func TestLoadFallsBackToTheBuiltInICEServers(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = writer.Write([]byte(`{"wsBackendUrl": "ws://localhost:8080"}`))
	}))
	defer server.Close()

	instance, err := Load(context.Background(), server.URL)
	if err != nil {
		t.Fatal(err)
	}

	if len(instance.ICEServers) != len(FallbackICEServers()) {
		t.Errorf("%d ICE servers, want the built-in list", len(instance.ICEServers))
	}
}

func TestLoadRefusesAnInstanceWithoutASignalingAddress(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		_, _ = writer.Write([]byte(`{}`))
	}))
	defer server.Close()

	if _, err := Load(context.Background(), server.URL); err == nil {
		t.Error("an instance without a signaling address was accepted")
	}
}
