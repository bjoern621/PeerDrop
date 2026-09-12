package transfer

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSafeNameKeepsTheTransferInsideTheTargetDirectory(t *testing.T) {
	cases := map[string]string{
		"report.pdf":              "report.pdf",
		"../../etc/passwd":        "passwd",
		"/etc/passwd":             "passwd",
		`C:\Users\peer\notes.txt`: "notes.txt",
		"photos/summer/beach.jpg": "beach.jpg",
		"":                        PlaceholderName,
		"   ":                     PlaceholderName,
		"..":                      PlaceholderName,
		".":                       PlaceholderName,
		"/":                       PlaceholderName,
	}

	for announced, want := range cases {
		if got := SafeName(announced); got != want {
			t.Errorf("SafeName(%q) = %q, want %q", announced, got, want)
		}
	}
}

func TestFreePathNumbersAnExistingName(t *testing.T) {
	dir := t.TempDir()

	first, err := FreePath(dir, "report.pdf", false)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(first) != "report.pdf" {
		t.Fatalf("got %s, want report.pdf", filepath.Base(first))
	}

	if err := os.WriteFile(first, nil, 0o644); err != nil {
		t.Fatal(err)
	}

	second, err := FreePath(dir, "report.pdf", false)
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(second) != "report-1.pdf" {
		t.Errorf("got %s, want report-1.pdf", filepath.Base(second))
	}
}

func TestFreePathReusesTheNameWhenOverwriting(t *testing.T) {
	dir := t.TempDir()
	existing := filepath.Join(dir, "report.pdf")

	if err := os.WriteFile(existing, nil, 0o644); err != nil {
		t.Fatal(err)
	}

	path, err := FreePath(dir, "report.pdf", true)
	if err != nil {
		t.Fatal(err)
	}

	if path != existing {
		t.Errorf("got %s, want %s", path, existing)
	}
}

func TestPlanChunksCoversTheWholeFile(t *testing.T) {
	cases := []struct {
		size       int64
		maxMessage int
		count      int64
	}{
		{size: 0, maxMessage: 65536, count: 0},
		{size: 1, maxMessage: 65536, count: 1},
		{size: 65532, maxMessage: 65536, count: 1},
		{size: 65533, maxMessage: 65536, count: 2},
		{size: 1 << 20, maxMessage: 262144, count: 5},
	}

	for _, current := range cases {
		plan := PlanChunks(current.size, current.maxMessage)

		if plan.PayloadSize != int64(current.maxMessage-SequenceHeaderBytes) {
			t.Errorf("payload size %d for a %d byte message", plan.PayloadSize, current.maxMessage)
		}

		if plan.Count != current.count {
			t.Errorf("PlanChunks(%d, %d).Count = %d, want %d",
				current.size, current.maxMessage, plan.Count, current.count)
		}
	}
}
