package transfer

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/pion/webrtc/v4"
)

// PartSuffix marks a file that is still arriving.
const PartSuffix = ".part"

// Receiver writes the files a peer sends into one directory.
type Receiver struct {
	// Directory the received files land in.
	Dir string
	// Overwrite replaces an existing name instead of adding a numeric suffix.
	Overwrite bool
	Reporter  Reporter
	// Complete runs after a file is fully written and renamed. Optional.
	Complete func(path string, meta Meta)
}

// Handle takes over one incoming file channel.
func (r *Receiver) Handle(channel *webrtc.DataChannel) {
	state := &incoming{receiver: r, channel: channel}

	channel.OnMessage(state.handleMessage)
	channel.OnClose(state.handleClose)
}

type incoming struct {
	receiver *Receiver
	channel  *webrtc.DataChannel

	mu        sync.Mutex
	meta      *Meta
	file      *os.File
	partPath  string
	finalPath string
	// Chunks that arrived before the metadata. The channel is unordered.
	early     [][]byte
	chunks    int64
	bytes     int64
	completed bool
	failed    bool
}

func (i *incoming) handleMessage(msg webrtc.DataChannelMessage) {
	i.mu.Lock()
	defer i.mu.Unlock()

	if i.completed || i.failed {
		return
	}

	if msg.IsString && i.meta == nil {
		if err := i.begin(msg.Data); err != nil {
			i.fail(err)
		}
		return
	}

	if msg.IsString {
		return
	}

	if len(msg.Data) < SequenceHeaderBytes {
		return
	}

	if i.meta == nil {
		chunk := make([]byte, len(msg.Data))
		copy(chunk, msg.Data)
		i.early = append(i.early, chunk)
		return
	}

	if err := i.write(msg.Data); err != nil {
		i.fail(err)
	}
}

func (i *incoming) handleClose() {
	i.mu.Lock()
	defer i.mu.Unlock()

	if i.completed || i.failed {
		return
	}

	i.fail(fmt.Errorf("the peer stopped after %d of %d chunks", i.chunks, chunkCountOf(i.meta)))
}

// begin opens the target file and replays the chunks that outran the metadata.
func (i *incoming) begin(announcement []byte) error {
	var meta Meta
	if err := json.Unmarshal(announcement, &meta); err != nil {
		return fmt.Errorf("could not read the file description from the peer: %w", err)
	}

	if meta.ChunkSize < 1 {
		return fmt.Errorf("the peer announced a chunk size of %d bytes", meta.ChunkSize)
	}

	if meta.UUID == "" {
		meta.UUID = i.channel.Label()
	}

	finalPath, err := FreePath(i.receiver.Dir, SafeName(meta.Name), i.receiver.Overwrite)
	if err != nil {
		return err
	}

	file, err := os.Create(finalPath + PartSuffix)
	if err != nil {
		return err
	}

	i.meta = &meta
	i.file = file
	i.finalPath = finalPath
	i.partPath = finalPath + PartSuffix

	i.receiver.Reporter.Start(meta.UUID, Down, filepath.Base(finalPath), meta.Size)

	early := i.early
	i.early = nil

	for _, chunk := range early {
		if err := i.write(chunk); err != nil {
			return err
		}
	}

	if meta.ChunkCount == 0 {
		return i.finish()
	}

	return nil
}

func (i *incoming) write(message []byte) error {
	sequence := int64(binary.LittleEndian.Uint32(message[:SequenceHeaderBytes]))
	payload := message[SequenceHeaderBytes:]

	if _, err := i.file.WriteAt(payload, sequence*i.meta.ChunkSize); err != nil {
		return err
	}

	i.chunks++
	i.bytes += int64(len(payload))
	i.receiver.Reporter.Progress(i.meta.UUID, i.bytes)

	if i.chunks == i.meta.ChunkCount {
		return i.finish()
	}

	return nil
}

func (i *incoming) finish() error {
	if err := i.file.Close(); err != nil {
		return err
	}

	if err := os.Rename(i.partPath, i.finalPath); err != nil {
		return err
	}

	i.completed = true
	i.receiver.Reporter.Finish(i.meta.UUID, nil)

	if i.receiver.Complete != nil {
		i.receiver.Complete(i.finalPath, *i.meta)
	}

	return nil
}

// fail drops the partial file and closes the channel.
func (i *incoming) fail(cause error) {
	i.failed = true

	if i.file != nil {
		_ = i.file.Close()
		_ = os.Remove(i.partPath)
	}

	id := i.channel.Label()
	if i.meta != nil {
		id = i.meta.UUID
	}

	i.receiver.Reporter.Finish(id, cause)

	_ = i.channel.Close()
}

func chunkCountOf(meta *Meta) int64 {
	if meta == nil {
		return 0
	}

	return meta.ChunkCount
}
