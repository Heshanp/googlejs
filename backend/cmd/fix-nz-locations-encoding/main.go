package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"unicode/utf8"
)

type Location struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	City       string `json:"city"`
	Region     string `json:"region"`
	Population int    `json:"population"`
	Type       string `json:"type"`
}

func repairLatin1ToUTF8(s string) (string, bool) {
	// If the string already contains non-Latin-1 runes, assume it's valid Unicode and leave it.
	for _, r := range s {
		if r > 255 {
			return s, false
		}
	}

	// Interpret each rune as a single byte (latin-1), then decode as UTF-8 if valid.
	b := make([]byte, 0, len(s))
	for _, r := range s {
		b = append(b, byte(r))
	}

	if !utf8.Valid(b) {
		return s, false
	}
	return string(b), true
}

func main() {
	const path = "internal/data/nz_locations.json"

	input, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read %s: %v\n", path, err)
		os.Exit(1)
	}

	var locations []Location
	if err := json.Unmarshal(input, &locations); err != nil {
		fmt.Fprintf(os.Stderr, "failed to parse %s: %v\n", path, err)
		os.Exit(1)
	}

	fixedFields := 0
	for i := range locations {
		if v, ok := repairLatin1ToUTF8(locations[i].Name); ok {
			locations[i].Name = v
			fixedFields++
		}
		if v, ok := repairLatin1ToUTF8(locations[i].City); ok {
			locations[i].City = v
			fixedFields++
		}
		if v, ok := repairLatin1ToUTF8(locations[i].Region); ok {
			locations[i].Region = v
			fixedFields++
		}
	}

	var out bytes.Buffer
	enc := json.NewEncoder(&out)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(locations); err != nil {
		fmt.Fprintf(os.Stderr, "failed to encode JSON: %v\n", err)
		os.Exit(1)
	}

	if fixedFields == 0 {
		return
	}

	info, err := os.Stat(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to stat %s: %v\n", path, err)
		os.Exit(1)
	}

	if err := os.WriteFile(path, out.Bytes(), info.Mode().Perm()); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write %s: %v\n", path, err)
		os.Exit(1)
	}

}
