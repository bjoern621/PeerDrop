package session

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// StdinPath is the argument that reads the file data from standard input.
const StdinPath = "-"

// FolderHint tells a caller how to send a directory, which a transfer cannot carry.
const FolderHint = "%s is a folder. Pack it first: tar cz %s | peerdrop - --name %s.tgz"

// expandPath resolves a leading ~ and a glob pattern into the paths it matches.
// A pattern matching nothing is returned unchanged,
// so the failure names what was typed.
func expandPath(entry string) []string {
	entry = strings.TrimSpace(entry)
	if entry == "" {
		return nil
	}

	if entry == StdinPath {
		return []string{entry}
	}

	if entry == "~" || strings.HasPrefix(entry, "~/") {
		if home, err := os.UserHomeDir(); err == nil {
			entry = filepath.Join(home, strings.TrimPrefix(entry, "~"))
		}
	}

	if !strings.ContainsAny(entry, "*?[") {
		return []string{entry}
	}

	matches, err := filepath.Glob(entry)
	if err != nil || len(matches) == 0 {
		return []string{entry}
	}

	return matches
}

// checkSendable reports why a path cannot be sent.
func checkSendable(path string) error {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return fmt.Errorf("%s does not exist", path)
	}
	if err != nil {
		return err
	}

	if info.IsDir() {
		base := filepath.Base(path)
		return fmt.Errorf(FolderHint, path, path, base)
	}

	if !info.Mode().IsRegular() {
		return fmt.Errorf("%s is not a regular file", path)
	}

	return nil
}
