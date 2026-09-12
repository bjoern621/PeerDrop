package session_test

import (
	"bytes"
	"context"
	"crypto/rand"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/bjoern621/PeerDrop/cli/internal/session"
)

func TestTerminalSendsToTerminal(t *testing.T) {
	server := startFakeServer(t)

	content := make([]byte, 512<<10)
	if _, err := rand.Read(content); err != nil {
		t.Fatal(err)
	}

	source := filepath.Join(t.TempDir(), "report.pdf")
	if err := os.WriteFile(source, content, 0o644); err != nil {
		t.Fatal(err)
	}

	targetDir := t.TempDir()

	receiverCode := make(chan int, 1)
	go func() {
		receiverCode <- session.Run(context.Background(), session.Options{
			Host:    server.URL,
			Dir:     targetDir,
			Quiet:   true,
			Version: "test",
		})
	}()

	receiverToken := awaitToken(t, server)

	senderCode := session.Run(context.Background(), session.Options{
		Host:          server.URL,
		Token:         receiverToken,
		Files:         []string{source},
		ExitAfterSend: true,
		Quiet:         true,
		Version:       "test",
	})

	if senderCode != session.ExitSuccess {
		t.Errorf("the sender exited with %d, want %d", senderCode, session.ExitSuccess)
	}

	select {
	case code := <-receiverCode:
		if code != session.ExitSuccess {
			t.Errorf("the receiver exited with %d, want %d", code, session.ExitSuccess)
		}
	case <-time.After(30 * time.Second):
		t.Fatal("the receiver did not end after the sender left")
	}

	stored, err := os.ReadFile(filepath.Join(targetDir, "report.pdf"))
	if err != nil {
		t.Fatal(err)
	}

	if !bytes.Equal(stored, content) {
		t.Errorf("received %d bytes, sent %d", len(stored), len(content))
	}
}

func TestConnectingToAnUnknownTokenReportsNoConnection(t *testing.T) {
	server := startFakeServer(t)

	code := session.Run(context.Background(), session.Options{
		Host:    server.URL,
		Token:   "zzzzz",
		Quiet:   true,
		Version: "test",
	})

	if code != session.ExitNoConnection {
		t.Errorf("exited with %d, want %d", code, session.ExitNoConnection)
	}
}

func TestSendingAFolderFails(t *testing.T) {
	server := startFakeServer(t)

	receiverCode := make(chan int, 1)
	go func() {
		receiverCode <- session.Run(context.Background(), session.Options{
			Host:    server.URL,
			Dir:     t.TempDir(),
			Quiet:   true,
			Version: "test",
		})
	}()

	receiverToken := awaitToken(t, server)

	code := session.Run(context.Background(), session.Options{
		Host:          server.URL,
		Token:         receiverToken,
		Files:         []string{t.TempDir()},
		ExitAfterSend: true,
		Quiet:         true,
		Version:       "test",
	})

	if code != session.ExitTransferFailed {
		t.Errorf("exited with %d, want %d", code, session.ExitTransferFailed)
	}

	<-receiverCode
}

func awaitToken(t *testing.T, server *fakeServer) string {
	t.Helper()

	select {
	case token := <-server.issued:
		return token
	case <-time.After(15 * time.Second):
		t.Fatal("the server issued no token")
		return ""
	}
}
