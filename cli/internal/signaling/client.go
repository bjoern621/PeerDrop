// Package signaling speaks the WebSocket protocol that pairs two peers.
package signaling

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/coder/websocket"
)

// MaxFrameBytes is the largest frame the server reads in one piece.
// A longer message closes the connection, so every send is measured first.
const MaxFrameBytes = 1024

const readLimitBytes = 64 * 1024

// Client is one WebSocket connection to the signaling server.
type Client struct {
	conn     *websocket.Conn
	messages chan Envelope
	readErr  chan error
}

// Dial opens the signaling connection. The userAgent identifies the client to the instance.
func Dial(ctx context.Context, wsBackendURL, userAgent string) (*Client, error) {
	header := http.Header{}
	header.Set("User-Agent", userAgent)

	conn, _, err := websocket.Dial(ctx, wsBackendURL+"/connect", &websocket.DialOptions{
		HTTPHeader: header,
	})
	if err != nil {
		return nil, fmt.Errorf("could not reach the signaling server at %s: %w", wsBackendURL, err)
	}

	conn.SetReadLimit(readLimitBytes)

	client := &Client{
		conn:     conn,
		messages: make(chan Envelope, 16),
		readErr:  make(chan error, 1),
	}

	go client.read()

	return client, nil
}

// Messages yields every received message until the connection ends.
func (c *Client) Messages() <-chan Envelope {
	return c.messages
}

// Err reports why the read loop ended. It has a value once Messages is closed.
func (c *Client) Err() error {
	select {
	case err := <-c.readErr:
		return err
	default:
		return nil
	}
}

// Send writes one typed message.
func (c *Client) Send(ctx context.Context, messageType string, msg any) error {
	payload, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	frame, err := json.Marshal(Envelope{Type: messageType, Msg: payload})
	if err != nil {
		return err
	}

	if len(frame) > MaxFrameBytes {
		return fmt.Errorf("a %s message of %d bytes exceeds the %d byte frame limit", messageType, len(frame), MaxFrameBytes)
	}

	return c.conn.Write(ctx, websocket.MessageText, frame)
}

// Close ends the connection.
func (c *Client) Close() error {
	return c.conn.Close(websocket.StatusNormalClosure, "")
}

func (c *Client) read() {
	defer close(c.messages)

	for {
		_, data, err := c.conn.Read(context.Background())
		if err != nil {
			c.readErr <- err
			return
		}

		var envelope Envelope
		if err := json.Unmarshal(data, &envelope); err != nil {
			continue
		}

		c.messages <- envelope
	}
}
