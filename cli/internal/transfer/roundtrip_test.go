package transfer_test

import (
	"bytes"
	"context"
	"crypto/rand"
	"os"
	"path/filepath"
	"sync"
	"testing"

	"github.com/bjoern621/PeerDrop/cli/internal/peer"
	"github.com/bjoern621/PeerDrop/cli/internal/peertest"
	"github.com/bjoern621/PeerDrop/cli/internal/transfer"
)

func TestFileSurvivesTheRoundTrip(t *testing.T) {
	pair := peertest.Connect(t)

	content := make([]byte, 3<<20)
	if _, err := rand.Read(content); err != nil {
		t.Fatal(err)
	}

	targetDir := t.TempDir()
	received := make(chan string, 1)

	receiverReport := &recordingReporter{}
	receiver := &transfer.Receiver{
		Dir:      targetDir,
		Reporter: receiverReport,
		Complete: func(path string, _ transfer.Meta) { received <- path },
	}
	pair.Right.OnFileChannel(receiver.Handle)

	sendFile(t, pair.Left, "report.pdf", content)

	path := <-received

	stored, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	if !bytes.Equal(stored, content) {
		t.Fatalf("received %d bytes, sent %d", len(stored), len(content))
	}

	if filepath.Base(path) != "report.pdf" {
		t.Errorf("stored as %s, want report.pdf", filepath.Base(path))
	}

	if leftovers := partFiles(t, targetDir); len(leftovers) > 0 {
		t.Errorf("the target directory still holds %v", leftovers)
	}
}

func TestSecondFileOfTheSameNameGetsASuffix(t *testing.T) {
	pair := peertest.Connect(t)

	targetDir := t.TempDir()
	received := make(chan string, 2)

	receiver := &transfer.Receiver{
		Dir:      targetDir,
		Reporter: &recordingReporter{},
		Complete: func(path string, _ transfer.Meta) { received <- path },
	}
	pair.Right.OnFileChannel(receiver.Handle)

	sendFile(t, pair.Left, "notes.txt", []byte("first"))
	sendFile(t, pair.Left, "notes.txt", []byte("second"))

	names := map[string]bool{}
	for i := 0; i < 2; i++ {
		names[filepath.Base(<-received)] = true
	}

	for _, want := range []string{"notes.txt", "notes-1.txt"} {
		if !names[want] {
			t.Errorf("no file named %s among %v", want, names)
		}
	}
}

func TestEmptyFileArrives(t *testing.T) {
	pair := peertest.Connect(t)

	targetDir := t.TempDir()
	received := make(chan string, 1)

	receiver := &transfer.Receiver{
		Dir:      targetDir,
		Reporter: &recordingReporter{},
		Complete: func(path string, _ transfer.Meta) { received <- path },
	}
	pair.Right.OnFileChannel(receiver.Handle)

	sendFile(t, pair.Left, "empty.bin", nil)

	path := <-received

	info, err := os.Stat(path)
	if err != nil {
		t.Fatal(err)
	}

	if info.Size() != 0 {
		t.Errorf("stored %d bytes, want 0", info.Size())
	}
}

func sendFile(t *testing.T, sender *peer.Peer, name string, content []byte) {
	t.Helper()

	plan := transfer.PlanChunks(int64(len(content)), sender.MaxMessageSize())

	meta := transfer.Meta{
		Name:       name,
		Size:       int64(len(content)),
		UUID:       name + "-" + randomLabel(t),
		ChunkCount: plan.Count,
		ChunkSize:  plan.PayloadSize,
	}

	channel, err := sender.NewFileChannel(meta.UUID)
	if err != nil {
		t.Fatalf("could not open a channel for %s: %v", name, err)
	}

	if err := transfer.Send(context.Background(), channel, bytes.NewReader(content), meta, &recordingReporter{}); err != nil {
		t.Fatalf("could not send %s: %v", name, err)
	}
}

func randomLabel(t *testing.T) string {
	t.Helper()

	raw := make([]byte, 8)
	if _, err := rand.Read(raw); err != nil {
		t.Fatal(err)
	}

	const alphabet = "abcdefghijklmnopqrstuvwxyz"
	label := make([]byte, len(raw))
	for index, value := range raw {
		label[index] = alphabet[int(value)%len(alphabet)]
	}

	return string(label)
}

func partFiles(t *testing.T, dir string) []string {
	t.Helper()

	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}

	var parts []string
	for _, entry := range entries {
		if filepath.Ext(entry.Name()) == transfer.PartSuffix {
			parts = append(parts, entry.Name())
		}
	}

	return parts
}

// recordingReporter accepts progress without rendering it.
type recordingReporter struct {
	mu       sync.Mutex
	finished map[string]error
}

func (r *recordingReporter) Start(string, transfer.Direction, string, int64) {}

func (r *recordingReporter) Progress(string, int64) {}

func (r *recordingReporter) Finish(id string, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.finished == nil {
		r.finished = map[string]error{}
	}

	r.finished[id] = err
}
