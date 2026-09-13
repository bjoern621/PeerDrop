package transfer

import (
	"context"
	"encoding/binary"
	"encoding/json"
	"errors"
	"io"
	"sync"
	"time"

	"github.com/pion/webrtc/v4"
)

// Bounds of the send buffer. Sending pauses above the high mark and resumes at the low mark.
const (
	highWaterMark = 8 << 20
	lowWaterMark  = 2 << 20
)

const drainPollInterval = 50 * time.Millisecond

var errChannelClosed = errors.New("the peer closed the transfer")

// Send moves one file over its own channel and closes the channel once the peer has taken every byte.
// The reporter sees the whole transfer, including its outcome.
func Send(ctx context.Context, channel *webrtc.DataChannel, source io.Reader, meta Meta, reporter Reporter) error {
	err := send(ctx, channel, source, meta, reporter)
	reporter.Finish(meta.UUID, err)

	return err
}

func send(ctx context.Context, channel *webrtc.DataChannel, source io.Reader, meta Meta, reporter Reporter) error {
	opened := make(chan struct{})
	channel.OnOpen(func() { close(opened) })

	closed := make(chan struct{})
	var closeOnce sync.Once
	channel.OnClose(func() { closeOnce.Do(func() { close(closed) }) })

	drained := make(chan struct{}, 1)
	channel.SetBufferedAmountLowThreshold(lowWaterMark)
	channel.OnBufferedAmountLow(func() {
		select {
		case drained <- struct{}{}:
		default:
		}
	})

	select {
	case <-opened:
	case <-closed:
		return errChannelClosed
	case <-ctx.Done():
		return ctx.Err()
	}

	reporter.Start(meta.UUID, Up, meta.Name, meta.Size)

	announcement, err := json.Marshal(meta)
	if err != nil {
		return err
	}

	if err := channel.SendText(string(announcement)); err != nil {
		return err
	}

	message := make([]byte, SequenceHeaderBytes+meta.ChunkSize)
	var handed int64

	for sequence := int64(0); sequence < meta.ChunkCount; sequence++ {
		read, err := io.ReadFull(source, message[SequenceHeaderBytes:])
		if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
			return err
		}
		if read == 0 {
			return io.ErrUnexpectedEOF
		}

		binary.LittleEndian.PutUint32(message[:SequenceHeaderBytes], uint32(sequence))

		if err := waitForCapacity(ctx, channel, drained, closed); err != nil {
			return err
		}

		if err := channel.Send(message[:SequenceHeaderBytes+read]); err != nil {
			return err
		}

		handed += int64(read)
		reporter.Progress(meta.UUID, acknowledged(handed, channel.BufferedAmount()))
	}

	if err := waitForDrain(ctx, channel, closed); err != nil {
		return err
	}

	reporter.Progress(meta.UUID, meta.Size)

	// GracefulClose returns once SCTP has acknowledged the buffered data.
	// Close would discard it.
	return channel.GracefulClose()
}

func waitForCapacity(ctx context.Context, channel *webrtc.DataChannel, drained, closed <-chan struct{}) error {
	for channel.BufferedAmount() > highWaterMark {
		select {
		case <-drained:
		case <-closed:
			return errChannelClosed
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(drainPollInterval):
		}
	}

	return nil
}

// waitForDrain blocks until the channel holds nothing.
// The low water mark fires above zero, so the remainder is polled.
func waitForDrain(ctx context.Context, channel *webrtc.DataChannel, closed <-chan struct{}) error {
	for channel.BufferedAmount() > 0 {
		select {
		case <-closed:
			return errChannelClosed
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(drainPollInterval):
		}
	}

	return nil
}

// acknowledged is what the peer has taken: everything handed to the channel minus what is still buffered.
func acknowledged(handed int64, buffered uint64) int64 {
	sent := handed - int64(buffered)
	if sent < 0 {
		return 0
	}

	return sent
}
