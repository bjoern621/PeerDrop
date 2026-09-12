package transfer

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// PlaceholderName replaces a name that carries nothing usable.
const PlaceholderName = "received-file"

// SafeName reduces a name announced by a peer to a plain file name.
// Directory parts are dropped,
// so a transfer never writes outside the target directory.
func SafeName(announced string) string {
	name := strings.ReplaceAll(announced, "\\", "/")
	name = strings.TrimSpace(name)

	if index := strings.LastIndex(name, "/"); index >= 0 {
		name = name[index+1:]
	}

	name = strings.TrimSpace(name)
	name = strings.Map(func(r rune) rune {
		if r == 0 {
			return -1
		}
		return r
	}, name)

	if name == "" || strings.Trim(name, ".") == "" {
		return PlaceholderName
	}

	return name
}

// FreePath returns the path a received file is written to.
// An existing name gains a numeric suffix unless overwrite is set.
func FreePath(dir, name string, overwrite bool) (string, error) {
	candidate := filepath.Join(dir, name)
	if overwrite {
		return candidate, nil
	}

	extension := filepath.Ext(name)
	stem := strings.TrimSuffix(name, extension)

	for suffix := 0; suffix < 10000; suffix++ {
		if suffix > 0 {
			candidate = filepath.Join(dir, fmt.Sprintf("%s-%d%s", stem, suffix, extension))
		}

		_, err := os.Lstat(candidate)
		if os.IsNotExist(err) {
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
	}

	return "", fmt.Errorf("%s already exists in %s, and so does every numbered variant", name, dir)
}
