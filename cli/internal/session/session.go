// Package session runs one PeerDrop session from a terminal.
package session

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/pion/webrtc/v4"

	"github.com/bjoern621/PeerDrop/cli/internal/config"
	"github.com/bjoern621/PeerDrop/cli/internal/peer"
	"github.com/bjoern621/PeerDrop/cli/internal/signaling"
	"github.com/bjoern621/PeerDrop/cli/internal/transfer"
	"github.com/bjoern621/PeerDrop/cli/internal/ui"
)

// Exit codes of a run.
const (
	ExitSuccess        = 0
	ExitTransferFailed = 1
	ExitUsage          = 2
	ExitNoConnection   = 3
)

// StdinName is the file name used for data read from standard input.
const StdinName = "stdin"

const tokenTimeout = 15 * time.Second

const prompt = "> "

// Options are one invocation of the client.
type Options struct {
	// Token of the peer to connect to. Empty waits for an incoming connection.
	Token         string
	Files         []string
	Dir           string
	Name          string
	Stdout        bool
	ExitAfterSend bool
	Overwrite     bool
	Host          string
	Quiet         bool
	Version       string
}

// Run carries out one session and returns the exit code of the process.
func Run(ctx context.Context, options Options) int {
	display := ui.New(os.Stderr, options.Quiet)
	defer display.Close()

	current := &session{
		options:   options,
		display:   display,
		report:    &countingReporter{inner: display},
		queue:     newSendQueue(),
		quit:      make(chan struct{}),
		sendsDone: make(chan struct{}),
	}

	return current.run(ctx)
}

type session struct {
	options  Options
	display  *ui.Display
	report   *countingReporter
	instance config.Instance
	client   *signaling.Client
	queue    *sendQueue

	localToken  string
	remoteToken string
	peer        *peer.Peer
	// Directory the received files land in. A temporary one under --stdout.
	receiveDir string

	quit      chan struct{}
	quitOnce  sync.Once
	sendsDone chan struct{}
	sendsOnce sync.Once
}

func (s *session) run(ctx context.Context) int {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	instance, err := config.Load(ctx, s.options.Host)
	if err != nil {
		s.display.Problem("%s", err)
		return ExitNoConnection
	}
	s.instance = instance

	userAgent := fmt.Sprintf("peerdrop-cli/%s (%s; %s)", s.options.Version, runtime.GOOS, runtime.GOARCH)

	client, err := signaling.Dial(ctx, instance.WSBackendURL, userAgent)
	if err != nil {
		s.display.Problem("%s", err)
		return ExitNoConnection
	}
	s.client = client
	defer client.Close()

	if err := s.awaitToken(ctx); err != nil {
		s.display.Problem("%s", err)
		return ExitNoConnection
	}

	if err := s.prepareReceiveDir(); err != nil {
		s.display.Problem("%s", err)
		return ExitUsage
	}

	interrupts := make(chan os.Signal, 1)
	signal.Notify(interrupts, os.Interrupt)
	defer signal.Stop(interrupts)

	input := s.startInput()
	if input != nil {
		defer input.Close()
	}

	var lines <-chan string
	var typedInterrupt <-chan struct{}
	if input != nil {
		lines = input.Lines
		typedInterrupt = input.Interrupt
	}

	if err := s.announce(ctx); err != nil {
		s.display.Problem("%s", err)
		return ExitNoConnection
	}

	go s.sendLoop(ctx)

	for {
		select {
		case <-ctx.Done():
			return s.close(ctx)
		case <-interrupts:
			return s.close(ctx)
		case <-typedInterrupt:
			return s.close(ctx)
		case <-s.quit:
			return s.close(ctx)
		case <-s.sendsDone:
			return s.close(ctx)
		case line, open := <-lines:
			if !open {
				lines = nil
				continue
			}
			s.handleLine(line)
		case envelope, open := <-s.client.Messages():
			if !open {
				if s.peer == nil {
					s.display.Problem("The signaling connection ended before a peer joined.")
				}
				return s.close(ctx)
			}
			s.handleMessage(ctx, envelope)
		}
	}
}

// awaitToken reads the token the server assigns to this connection.
func (s *session) awaitToken(ctx context.Context) error {
	timeout := time.NewTimer(tokenTimeout)
	defer timeout.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-timeout.C:
			return fmt.Errorf("the signaling server sent no token within %s", tokenTimeout)
		case envelope, open := <-s.client.Messages():
			if !open {
				return fmt.Errorf("the signaling connection ended before a token arrived")
			}

			if envelope.Type != signaling.TypeClientToken {
				continue
			}

			var message signaling.ClientToken
			if err := json.Unmarshal(envelope.Msg, &message); err != nil {
				return err
			}

			s.localToken = strings.ToLower(message.Token)
			return nil
		}
	}
}

func (s *session) prepareReceiveDir() error {
	if s.options.Stdout {
		// Chunks arrive unordered, so the file is spooled and written out complete.
		directory, err := os.MkdirTemp("", "peerdrop-")
		if err != nil {
			return err
		}
		s.receiveDir = directory
		return nil
	}

	directory := s.options.Dir
	if directory == "" {
		directory = "."
	}

	info, err := os.Stat(directory)
	if err != nil {
		return fmt.Errorf("could not use %s as the target directory: %w", directory, err)
	}
	if !info.IsDir() {
		return fmt.Errorf("%s is not a directory", directory)
	}

	s.receiveDir = directory
	return nil
}

// startInput reads paths typed during the session.
// Standard input carrying file data is left alone.
func (s *session) startInput() *ui.Input {
	for _, file := range s.options.Files {
		if file == StdinPath {
			return nil
		}
	}

	input, err := ui.ReadStdin(s.display, prompt)
	if err != nil {
		return nil
	}

	return input
}

// announce asks for the peer named on the command line, or shows how to reach this client.
func (s *session) announce(ctx context.Context) error {
	if s.options.Token != "" {
		s.display.Status("Asking %s to connect.", strings.ToUpper(s.options.Token))

		return s.send(signaling.TypeConnectionRequest, signaling.ConnectionRequest{
			RemoteToken: strings.ToLower(s.options.Token),
		})
	}

	s.display.Status("Your token: %s", strings.ToUpper(s.localToken))
	s.display.Status("Open %s in a browser and enter it.", s.instance.ConnectURL())
	s.display.Status("From another terminal: curl -fsSL %s/cli | sh -s -- %s", s.instance.Host, s.localToken)

	return nil
}

func (s *session) handleMessage(ctx context.Context, envelope signaling.Envelope) {
	switch envelope.Type {
	case signaling.TypeConnectionRequest:
		var message signaling.ConnectionRequest
		if err := json.Unmarshal(envelope.Msg, &message); err != nil {
			return
		}
		s.handleConnectionRequest(message.RemoteToken)

	case signaling.TypeConnectionResponse:
		var message signaling.ConnectionResponse
		if err := json.Unmarshal(envelope.Msg, &message); err != nil {
			return
		}
		if !message.Accepted && s.peer == nil {
			s.display.Problem("%s is not available.", strings.ToUpper(message.RemoteToken))
			s.stop()
		}

	case signaling.TypeEstablishConnection:
		var message signaling.EstablishConnection
		if err := json.Unmarshal(envelope.Msg, &message); err != nil {
			return
		}
		s.startPeer(message.RemoteToken)

	case signaling.TypeSDP:
		var message signaling.SDP
		if err := json.Unmarshal(envelope.Msg, &message); err != nil || s.peer == nil {
			return
		}
		if err := s.peer.HandleSDP(message.Description); err != nil {
			s.display.Problem("%s", err)
		}

	case signaling.TypeICECandidate:
		var message signaling.ICECandidate
		if err := json.Unmarshal(envelope.Msg, &message); err != nil || s.peer == nil {
			return
		}
		if err := s.peer.HandleICECandidate(message.ICECandidate); err != nil {
			s.display.Problem("%s", err)
		}

	case signaling.TypeCloseConnection:
		if s.peer != nil {
			s.display.Status("%s left.", strings.ToUpper(s.remoteToken))
		}
		s.stop()
	}
}

// handleConnectionRequest accepts the first peer and turns every later one away.
func (s *session) handleConnectionRequest(requester string) {
	accepted := s.peer == nil && s.options.Token == ""

	_ = s.send(signaling.TypeConnectionResponse, signaling.ConnectionResponse{
		Accepted:    accepted,
		RemoteToken: requester,
	})

	if !accepted {
		s.display.Status("Turned away %s. A session is already running.", strings.ToUpper(requester))
	}
}

func (s *session) startPeer(remoteToken string) {
	if s.peer != nil {
		return
	}

	s.remoteToken = strings.ToLower(remoteToken)

	connection, err := peer.New(s.instance.ICEServers, s.localToken, s.remoteToken)
	if err != nil {
		s.display.Problem("%s", err)
		s.stop()
		return
	}

	receiver := &transfer.Receiver{
		Dir:       s.receiveDir,
		Overwrite: s.options.Overwrite,
		Reporter:  s.report,
		Complete:  s.handleReceivedFile,
	}

	connection.OnFileChannel(receiver.Handle)
	connection.OnConnectionState(func(state webrtc.PeerConnectionState) {
		if state == webrtc.PeerConnectionStateFailed || state == webrtc.PeerConnectionStateClosed {
			s.stop()
		}
	})

	s.peer = connection

	if err := connection.Start(s.send); err != nil {
		s.display.Problem("%s", err)
		s.stop()
		return
	}

	s.display.Status("Connected to %s.", strings.ToUpper(s.remoteToken))

	s.queue.add(s.options.Files...)

	if s.options.ExitAfterSend && len(s.options.Files) == 0 {
		s.finishSending()
	}
}

// handleReceivedFile writes the first file to standard output under --stdout and ends the session.
func (s *session) handleReceivedFile(path string, meta transfer.Meta) {
	if !s.options.Stdout {
		return
	}

	file, err := os.Open(path)
	if err != nil {
		s.report.problem(s.display, err)
		s.stop()
		return
	}
	defer file.Close()

	if _, err := io.Copy(os.Stdout, file); err != nil {
		s.report.problem(s.display, err)
	}

	s.stop()
}

func (s *session) handleLine(line string) {
	line = strings.TrimSpace(line)

	switch line {
	case "":
		return
	case "quit", "exit":
		s.stop()
		return
	}

	if s.peer == nil {
		s.display.Problem("No peer is connected. The paths are sent once one joins.")
	}

	s.queue.add(expandPath(line)...)
}

// sendLoop hands the queued files to the peer one after the other.
func (s *session) sendLoop(ctx context.Context) {
	for {
		path, open := s.queue.next(ctx)
		if !open {
			return
		}

		if s.peer == nil {
			// The queue only fills once a peer joins, so this is a stale entry.
			continue
		}

		s.sendOne(ctx, path)

		if s.options.ExitAfterSend && s.queue.empty() {
			s.finishSending()
			return
		}
	}
}

func (s *session) sendOne(ctx context.Context, path string) {
	source, size, name, cleanup, err := openSource(path, s.options.Name)
	if err != nil {
		s.report.problem(s.display, err)
		return
	}
	defer cleanup()

	plan := transfer.PlanChunks(size, s.peer.MaxMessageSize())

	meta := transfer.Meta{
		Name:       name,
		Size:       size,
		UUID:       uuid.NewString(),
		ChunkCount: plan.Count,
		ChunkSize:  plan.PayloadSize,
	}

	channel, err := s.peer.NewFileChannel(meta.UUID)
	if err != nil {
		s.report.problem(s.display, err)
		return
	}

	_ = transfer.Send(ctx, channel, source, meta, s.report)
}

// openSource opens one file to send. Standard input is spooled,
// because the description announces the size before the first byte.
func openSource(path, nameOverride string) (io.Reader, int64, string, func(), error) {
	if path == StdinPath {
		spooled, err := os.CreateTemp("", "peerdrop-stdin-")
		if err != nil {
			return nil, 0, "", func() {}, err
		}

		size, err := io.Copy(spooled, os.Stdin)
		if err != nil {
			spooled.Close()
			os.Remove(spooled.Name())
			return nil, 0, "", func() {}, err
		}

		if _, err := spooled.Seek(0, io.SeekStart); err != nil {
			spooled.Close()
			os.Remove(spooled.Name())
			return nil, 0, "", func() {}, err
		}

		name := nameOverride
		if name == "" {
			name = StdinName
		}

		return spooled, size, name, func() {
			spooled.Close()
			os.Remove(spooled.Name())
		}, nil
	}

	if err := checkSendable(path); err != nil {
		return nil, 0, "", func() {}, err
	}

	file, err := os.Open(path)
	if err != nil {
		return nil, 0, "", func() {}, err
	}

	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, 0, "", func() {}, err
	}

	name := nameOverride
	if name == "" {
		name = filepath.Base(path)
	}

	return file, info.Size(), name, func() { file.Close() }, nil
}

func (s *session) send(messageType string, msg any) error {
	return s.client.Send(context.Background(), messageType, msg)
}

func (s *session) stop() {
	s.quitOnce.Do(func() { close(s.quit) })
}

func (s *session) finishSending() {
	s.sendsOnce.Do(func() { close(s.sendsDone) })
}

// close ends the session and reports the exit code.
func (s *session) close(ctx context.Context) int {
	s.queue.close()

	if s.peer != nil {
		_ = s.send(signaling.TypeCloseConnection, signaling.CloseConnection{RemoteToken: s.remoteToken})
		_ = s.peer.Close()
	}

	if s.options.Stdout && s.receiveDir != "" {
		_ = os.RemoveAll(s.receiveDir)
	}

	if s.peer == nil {
		return ExitNoConnection
	}

	if s.report.failures() > 0 {
		return ExitTransferFailed
	}

	return ExitSuccess
}

// countingReporter counts failed transfers on the way to the display.
type countingReporter struct {
	inner transfer.Reporter

	mu     sync.Mutex
	failed int
}

func (r *countingReporter) Start(id string, direction transfer.Direction, name string, size int64) {
	r.inner.Start(id, direction, name, size)
}

func (r *countingReporter) Progress(id string, bytes int64) {
	r.inner.Progress(id, bytes)
}

func (r *countingReporter) Finish(id string, err error) {
	if err != nil {
		r.mu.Lock()
		r.failed++
		r.mu.Unlock()
	}

	r.inner.Finish(id, err)
}

// problem counts a transfer that failed before it reached a channel.
func (r *countingReporter) problem(display *ui.Display, err error) {
	r.mu.Lock()
	r.failed++
	r.mu.Unlock()

	display.Problem("%s", err)
}

func (r *countingReporter) failures() int {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.failed
}
