// Command peerdrop runs a PeerDrop session from a terminal.
package main

import (
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/bjoern621/PeerDrop/cli/internal/session"
)

// Version is the release the binary was built from. The release job sets it.
var Version = "dev"

const usage = `peerdrop sends and receives files over a direct connection.

Usage:
  peerdrop [TOKEN] [FILE...] [options]

Without a token the client waits for an incoming connection and shows its own.
With a token it connects to that peer. Files are sent once the peer joins.
Use - as a file to read the data from standard input.

Options:
  --dir DIR          Write received files to DIR. Defaults to the current directory.
  --name NAME        Name the file read from standard input.
  --stdout           Write the first received file to standard output and end the session.
  --exit-after-send  End the session once the last file is sent.
  --overwrite        Replace a file of the same name instead of adding a numeric suffix.
  --host URL         Use another PeerDrop instance.
  --quiet            Show problems only.
  --version          Show the version.
  --help             Show this text.
`

func main() {
	options, err := parseArgs(os.Args[1:])
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		fmt.Fprint(os.Stderr, "\n"+usage)
		os.Exit(session.ExitUsage)
	}

	options.Version = Version

	os.Exit(session.Run(context.Background(), options))
}

// parseArgs reads the invocation. Options may stand anywhere among the paths.
func parseArgs(args []string) (session.Options, error) {
	var options session.Options
	var positional []string
	onlyPositional := false

	for index := 0; index < len(args); index++ {
		argument := args[index]

		if onlyPositional || argument == "-" || !strings.HasPrefix(argument, "--") {
			positional = append(positional, argument)
			continue
		}

		if argument == "--" {
			onlyPositional = true
			continue
		}

		name, inlineValue, hasInlineValue := strings.Cut(argument, "=")

		value := func() (string, error) {
			if hasInlineValue {
				return inlineValue, nil
			}
			if index+1 >= len(args) {
				return "", fmt.Errorf("%s needs a value", name)
			}
			index++
			return args[index], nil
		}

		var err error

		switch name {
		case "--dir":
			options.Dir, err = value()
		case "--name":
			options.Name, err = value()
		case "--host":
			options.Host, err = value()
		case "--stdout":
			options.Stdout = true
		case "--exit-after-send":
			options.ExitAfterSend = true
		case "--overwrite":
			options.Overwrite = true
		case "--quiet":
			options.Quiet = true
		case "--version":
			fmt.Println(Version)
			os.Exit(session.ExitSuccess)
		case "--help":
			fmt.Print(usage)
			os.Exit(session.ExitSuccess)
		default:
			return options, fmt.Errorf("%s is not a known option", name)
		}

		if err != nil {
			return options, err
		}
	}

	if len(positional) > 0 && isToken(positional[0]) {
		options.Token = strings.ToLower(positional[0])
		positional = positional[1:]
	}

	options.Files = positional

	if options.Name != "" && len(options.Files) != 1 {
		return options, fmt.Errorf("--name applies to a single file")
	}

	return options, nil
}

// Proquint alphabet of a client token, five letters in consonant-vowel order.
const (
	tokenConsonants = "bdfghjklmnprstvz"
	tokenVowels     = "aiou"
)

// isToken reports whether an argument is a peer token rather than a path.
// An existing path of the same spelling wins.
func isToken(argument string) bool {
	if len(argument) != 5 {
		return false
	}

	lower := strings.ToLower(argument)

	for position, letter := range lower {
		alphabet := tokenConsonants
		if position%2 == 1 {
			alphabet = tokenVowels
		}

		if !strings.ContainsRune(alphabet, letter) {
			return false
		}
	}

	if _, err := os.Stat(argument); err == nil {
		return false
	}

	return true
}
