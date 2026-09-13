package session

import (
	"context"
	"sync"
)

// sendQueue holds the paths waiting to go out. Outgoing files run one after the other.
type sendQueue struct {
	mu     sync.Mutex
	items  []string
	wake   chan struct{}
	closed bool
}

func newSendQueue() *sendQueue {
	return &sendQueue{wake: make(chan struct{}, 1)}
}

func (q *sendQueue) add(paths ...string) {
	q.mu.Lock()
	q.items = append(q.items, paths...)
	q.mu.Unlock()

	select {
	case q.wake <- struct{}{}:
	default:
	}
}

// next blocks until a path is queued, the queue closes or the context ends.
func (q *sendQueue) next(ctx context.Context) (string, bool) {
	for {
		q.mu.Lock()
		if len(q.items) > 0 {
			item := q.items[0]
			q.items = q.items[1:]
			q.mu.Unlock()
			return item, true
		}
		closed := q.closed
		q.mu.Unlock()

		if closed {
			return "", false
		}

		select {
		case <-q.wake:
		case <-ctx.Done():
			return "", false
		}
	}
}

func (q *sendQueue) empty() bool {
	q.mu.Lock()
	defer q.mu.Unlock()

	return len(q.items) == 0
}

func (q *sendQueue) close() {
	q.mu.Lock()
	q.closed = true
	q.mu.Unlock()

	select {
	case q.wake <- struct{}{}:
	default:
	}
}
