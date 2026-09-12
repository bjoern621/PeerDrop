// Package transfer moves one file over one data channel.
package transfer

// SequenceHeaderBytes prefix every binary message and hold the chunk number as little-endian uint32.
const SequenceHeaderBytes = 4

// Meta is the first message on a file channel. The web client sends the same shape.
type Meta struct {
	Name       string `json:"name"`
	Size       int64  `json:"size"`
	UUID       string `json:"uuid"`
	ChunkCount int64  `json:"chunkCount"`
	// Payload bytes of a full chunk. Positions the writes of unordered chunks.
	ChunkSize int64 `json:"chunkSize"`
	// Path within a shared folder, including the folder name as first segment.
	// Empty for single-file transfers.
	RelativePath string `json:"relativePath,omitempty"`
	// Groups the files of one folder transfer. Empty for single files.
	FolderID string `json:"folderId,omitempty"`
}

// Direction of a transfer as it appears in the progress output.
type Direction string

const (
	Up   Direction = "up"
	Down Direction = "down"
)

// Reporter receives the progress of every transfer of a session.
type Reporter interface {
	// Start announces a transfer. The id is the file UUID.
	Start(id string, direction Direction, name string, size int64)
	// Progress reports the bytes moved so far.
	Progress(id string, bytes int64)
	// Finish closes a transfer. A non-nil err marks it as failed.
	Finish(id string, err error)
}

// ChunkPlan is how one file is cut into messages.
type ChunkPlan struct {
	// Payload bytes per full chunk, without the sequence header.
	PayloadSize int64
	Count       int64
}

// PlanChunks derives the chunking from the largest message the peer accepts.
func PlanChunks(size int64, maxMessageSize int) ChunkPlan {
	payloadSize := int64(maxMessageSize - SequenceHeaderBytes)
	if payloadSize < 1 {
		payloadSize = 1
	}

	count := size / payloadSize
	if size%payloadSize != 0 {
		count++
	}

	return ChunkPlan{PayloadSize: payloadSize, Count: count}
}
