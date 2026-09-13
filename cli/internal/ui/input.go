package ui

import (
	"bufio"
	"os"
	"sync"
	"unicode"

	"golang.org/x/term"
)

func isTerminal(file *os.File) bool {
	return term.IsTerminal(int(file.Fd()))
}

// Control bytes a terminal delivers in raw mode, where the line discipline handles none of them.
const (
	keyInterrupt = 0x03
	keyEndOfFile = 0x04
	keyBackspace = 0x7f
	keyEscape    = 0x1b
)

// Input reads the lines typed during a session.
type Input struct {
	Lines     chan string
	Interrupt chan struct{}

	restore func()
	once    sync.Once
}

// ReadStdin starts reading standard input.
// On a terminal the typed text stays visible under the transfers,
// and Ctrl+C reaches Interrupt instead of the process.
func ReadStdin(display *Display, prompt string) (*Input, error) {
	input := &Input{
		Lines:     make(chan string),
		Interrupt: make(chan struct{}),
	}

	if !isTerminal(os.Stdin) {
		go input.readLines()
		return input, nil
	}

	previous, err := term.MakeRaw(int(os.Stdin.Fd()))
	if err != nil {
		go input.readLines()
		return input, nil
	}

	input.restore = func() { _ = term.Restore(int(os.Stdin.Fd()), previous) }

	display.SetPrompt(prompt)

	go input.readKeys(display)

	return input, nil
}

// Close restores the terminal.
func (i *Input) Close() {
	i.once.Do(func() {
		if i.restore != nil {
			i.restore()
		}
	})
}

func (i *Input) readLines() {
	defer close(i.Lines)

	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		i.Lines <- scanner.Text()
	}
}

func (i *Input) readKeys(display *Display) {
	defer close(i.Lines)

	reader := bufio.NewReader(os.Stdin)
	var line []rune

	for {
		key, _, err := reader.ReadRune()
		if err != nil {
			return
		}

		switch key {
		case keyInterrupt:
			i.signalInterrupt()
			return
		case keyEndOfFile:
			if len(line) == 0 {
				i.signalInterrupt()
				return
			}
		case '\r', '\n':
			entered := string(line)
			line = line[:0]
			display.SetInput(line)
			i.Lines <- entered
		case keyBackspace, '\b':
			if len(line) > 0 {
				line = line[:len(line)-1]
				display.SetInput(line)
			}
		case keyEscape:
			discardEscapeSequence(reader)
		default:
			if unicode.IsPrint(key) {
				line = append(line, key)
				display.SetInput(line)
			}
		}
	}
}

func (i *Input) signalInterrupt() {
	select {
	case <-i.Interrupt:
	default:
		close(i.Interrupt)
	}
}

// discardEscapeSequence drops an arrow key or any other CSI sequence.
func discardEscapeSequence(reader *bufio.Reader) {
	next, _, err := reader.ReadRune()
	if err != nil {
		return
	}

	if next != '[' && next != 'O' {
		return
	}

	for {
		final, _, err := reader.ReadRune()
		if err != nil {
			return
		}

		if final >= '@' && final <= '~' {
			return
		}
	}
}
