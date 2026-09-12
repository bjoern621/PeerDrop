// Package ui renders session progress and reads the paths typed during a session.
package ui

import (
	"fmt"
	"io"
	"os"
	"sort"
	"sync"
	"time"

	"github.com/bjoern621/PeerDrop/cli/internal/transfer"
)

const redrawInterval = 100 * time.Millisecond

// Weight of the newest sample in the speed estimate.
const rateSmoothing = 0.3

// Display writes session output to a stream.
// On a terminal it keeps one rewritten line per running transfer.
type Display struct {
	out   io.Writer
	tty   bool
	quiet bool
	// Prompt line under the transfers. Empty when no input is read.
	prompt string

	mu      sync.Mutex
	entries map[string]*entry
	order   []string
	// Lines the block currently occupies on screen.
	drawn int
	input []rune

	stop chan struct{}
	once sync.Once
}

type entry struct {
	direction transfer.Direction
	name      string
	size      int64
	bytes     int64

	started    time.Time
	lastTime   time.Time
	lastBytes  int64
	bytesPerNs float64
}

// New builds a display on out. Progress bars appear only when out is a terminal.
func New(out *os.File, quiet bool) *Display {
	display := &Display{
		out:     out,
		tty:     isTerminal(out),
		quiet:   quiet,
		entries: make(map[string]*entry),
		stop:    make(chan struct{}),
	}

	if display.tty && !quiet {
		go display.redrawLoop()
	}

	return display
}

// SetPrompt shows a prompt under the transfers. An empty text removes it.
func (d *Display) SetPrompt(prompt string) {
	d.mu.Lock()
	d.prompt = prompt
	d.mu.Unlock()

	d.refresh()
}

// Status prints a line above the transfers.
func (d *Display) Status(format string, args ...any) {
	if d.quiet {
		return
	}

	d.print(fmt.Sprintf(format, args...))
}

// Problem prints a line above the transfers. It stays visible under --quiet.
func (d *Display) Problem(format string, args ...any) {
	d.print(fmt.Sprintf(format, args...))
}

// Start announces a transfer.
func (d *Display) Start(id string, direction transfer.Direction, name string, size int64) {
	now := time.Now()

	d.mu.Lock()
	d.entries[id] = &entry{
		direction: direction,
		name:      name,
		size:      size,
		started:   now,
		lastTime:  now,
	}
	d.order = append(d.order, id)
	d.mu.Unlock()

	if !d.tty {
		verb := "Sending"
		if direction == transfer.Down {
			verb = "Receiving"
		}
		d.Status("%s %s (%s)", verb, name, humanBytes(size))
		return
	}

	d.refresh()
}

// Progress reports the bytes moved so far.
func (d *Display) Progress(id string, bytes int64) {
	d.mu.Lock()

	current, known := d.entries[id]
	if !known {
		d.mu.Unlock()
		return
	}

	now := time.Now()
	elapsed := now.Sub(current.lastTime)
	if elapsed > 200*time.Millisecond {
		sample := float64(bytes-current.lastBytes) / float64(elapsed)
		if current.bytesPerNs == 0 {
			current.bytesPerNs = sample
		} else {
			current.bytesPerNs = rateSmoothing*sample + (1-rateSmoothing)*current.bytesPerNs
		}
		current.lastTime = now
		current.lastBytes = bytes
	}

	current.bytes = bytes
	d.mu.Unlock()
}

// Finish closes a transfer. A non-nil err marks it as failed.
func (d *Display) Finish(id string, err error) {
	d.mu.Lock()

	current, known := d.entries[id]
	if known {
		delete(d.entries, id)
		d.order = removeID(d.order, id)
	}

	d.mu.Unlock()

	if !known {
		return
	}

	if err != nil {
		d.Problem("%s %s: %s", directionWord(current.direction), current.name, err)
		return
	}

	took := time.Since(current.started)
	d.Status("%s %s (%s in %s)", directionDoneWord(current.direction), current.name,
		humanBytes(current.size), humanDuration(took.Seconds()))
}

// Active reports how many transfers are running.
func (d *Display) Active() int {
	d.mu.Lock()
	defer d.mu.Unlock()

	return len(d.entries)
}

// SetInput hands the display the text typed so far, so a redraw keeps it visible.
func (d *Display) SetInput(input []rune) {
	d.mu.Lock()
	d.input = append(d.input[:0], input...)
	d.mu.Unlock()

	d.refresh()
}

// Close stops redrawing and erases the block.
func (d *Display) Close() {
	d.once.Do(func() {
		close(d.stop)
	})

	d.mu.Lock()
	defer d.mu.Unlock()

	d.erase()
}

func (d *Display) redrawLoop() {
	ticker := time.NewTicker(redrawInterval)
	defer ticker.Stop()

	for {
		select {
		case <-d.stop:
			return
		case <-ticker.C:
			d.refresh()
		}
	}
}

func (d *Display) refresh() {
	if !d.tty || d.quiet {
		return
	}

	d.mu.Lock()
	defer d.mu.Unlock()

	d.draw()
}

// print writes a permanent line above the block.
func (d *Display) print(line string) {
	d.mu.Lock()
	defer d.mu.Unlock()

	if !d.tty {
		fmt.Fprint(d.out, line+"\n")
		return
	}

	d.erase()
	fmt.Fprint(d.out, "\r\x1b[2K"+line+"\r\n")

	if !d.quiet {
		d.draw()
	}
}

// erase blanks the block and leaves the cursor where it starts.
func (d *Display) erase() {
	if d.drawn == 0 {
		return
	}

	fmt.Fprintf(d.out, "\x1b[%dA", d.drawn)
	for i := 0; i < d.drawn; i++ {
		fmt.Fprint(d.out, "\r\x1b[2K\r\n")
	}
	fmt.Fprintf(d.out, "\x1b[%dA", d.drawn)

	d.drawn = 0
}

func (d *Display) draw() {
	lines := d.blockLines()

	if d.drawn > 0 {
		fmt.Fprintf(d.out, "\x1b[%dA", d.drawn)
	}

	for _, line := range lines {
		fmt.Fprint(d.out, "\r\x1b[2K"+line+"\r\n")
	}

	if extra := d.drawn - len(lines); extra > 0 {
		for i := 0; i < extra; i++ {
			fmt.Fprint(d.out, "\r\x1b[2K\r\n")
		}
		fmt.Fprintf(d.out, "\x1b[%dA", extra)
	}

	d.drawn = len(lines)
}

func (d *Display) blockLines() []string {
	ids := append([]string(nil), d.order...)
	sort.SliceStable(ids, func(a, b int) bool {
		return d.entries[ids[a]].started.Before(d.entries[ids[b]].started)
	})

	lines := make([]string, 0, len(ids)+1)

	for _, id := range ids {
		current, known := d.entries[id]
		if !known {
			continue
		}
		lines = append(lines, progressLine(current))
	}

	if d.prompt != "" {
		lines = append(lines, d.prompt+string(d.input))
	}

	return lines
}

func progressLine(current *entry) string {
	percent := 0
	if current.size > 0 {
		percent = int(100 * current.bytes / current.size)
	}

	rate := current.bytesPerNs * float64(time.Second)

	eta := -1.0
	if rate > 0 && current.size > current.bytes {
		eta = float64(current.size-current.bytes) / rate
	}

	return fmt.Sprintf("%-5s %s [%s] %3d%%  %10s  %s",
		current.direction, padName(current.name), bar(current.bytes, current.size),
		percent, humanRate(rate), humanDuration(eta))
}

func directionWord(direction transfer.Direction) string {
	if direction == transfer.Down {
		return "Could not receive"
	}

	return "Could not send"
}

func directionDoneWord(direction transfer.Direction) string {
	if direction == transfer.Down {
		return "Received"
	}

	return "Sent"
}

func removeID(ids []string, id string) []string {
	for index, candidate := range ids {
		if candidate == id {
			return append(ids[:index], ids[index+1:]...)
		}
	}

	return ids
}
