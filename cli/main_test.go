package main

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

func TestParseArgsReadsTokenFilesAndOptions(t *testing.T) {
	options, err := parseArgs([]string{"BABAB", "report.pdf", "--dir", "out", "--overwrite"})
	if err != nil {
		t.Fatal(err)
	}

	if options.Token != "babab" {
		t.Errorf("token %q, want babab", options.Token)
	}

	if !reflect.DeepEqual(options.Files, []string{"report.pdf"}) {
		t.Errorf("files %v, want [report.pdf]", options.Files)
	}

	if options.Dir != "out" {
		t.Errorf("dir %q, want out", options.Dir)
	}

	if !options.Overwrite {
		t.Error("overwrite is off")
	}
}

func TestParseArgsTakesAValueAfterAnEqualsSign(t *testing.T) {
	options, err := parseArgs([]string{"--host=https://peerdrop.example"})
	if err != nil {
		t.Fatal(err)
	}

	if options.Host != "https://peerdrop.example" {
		t.Errorf("host %q, want https://peerdrop.example", options.Host)
	}
}

func TestParseArgsTreatsADashAsAFile(t *testing.T) {
	options, err := parseArgs([]string{"-", "--name", "archive.tgz"})
	if err != nil {
		t.Fatal(err)
	}

	if !reflect.DeepEqual(options.Files, []string{"-"}) {
		t.Errorf("files %v, want [-]", options.Files)
	}

	if options.Name != "archive.tgz" {
		t.Errorf("name %q, want archive.tgz", options.Name)
	}
}

func TestParseArgsRefusesAnUnknownOption(t *testing.T) {
	if _, err := parseArgs([]string{"--send-everything"}); err == nil {
		t.Error("an unknown option was accepted")
	}
}

func TestParseArgsRefusesNameForSeveralFiles(t *testing.T) {
	if _, err := parseArgs([]string{"one.txt", "two.txt", "--name", "single"}); err == nil {
		t.Error("--name was accepted for two files")
	}
}

func TestParseArgsPrefersAnExistingPathOverATokenShape(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "kuzok")

	if err := os.WriteFile(path, nil, 0o644); err != nil {
		t.Fatal(err)
	}

	previous, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	if err := os.Chdir(dir); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chdir(previous) })

	options, err := parseArgs([]string{"kuzok"})
	if err != nil {
		t.Fatal(err)
	}

	if options.Token != "" {
		t.Errorf("token %q, want the argument to stay a file", options.Token)
	}

	if !reflect.DeepEqual(options.Files, []string{"kuzok"}) {
		t.Errorf("files %v, want [kuzok]", options.Files)
	}
}

func TestIsTokenChecksTheProquintShape(t *testing.T) {
	valid := []string{"babab", "kuzok", "LUSAB"}
	invalid := []string{"report", "aaaaa", "bab", "babaz1", "bxbab"}

	for _, token := range valid {
		if !isToken(token) {
			t.Errorf("%q was not read as a token", token)
		}
	}

	for _, token := range invalid {
		if isToken(token) {
			t.Errorf("%q was read as a token", token)
		}
	}
}
