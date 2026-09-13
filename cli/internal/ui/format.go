package ui

import (
	"fmt"
	"strings"
)

// humanBytes renders a byte count in the units the web client uses.
func humanBytes(bytes int64) string {
	const unit = 1024

	if bytes < unit {
		return fmt.Sprintf("%d B", bytes)
	}

	value := float64(bytes)
	units := []string{"KB", "MB", "GB", "TB"}
	index := -1

	for value >= unit && index < len(units)-1 {
		value /= unit
		index++
	}

	return fmt.Sprintf("%.1f %s", value, units[index])
}

// humanRate renders a transfer speed.
func humanRate(bytesPerSecond float64) string {
	if bytesPerSecond <= 0 {
		return "--"
	}

	return humanBytes(int64(bytesPerSecond)) + "/s"
}

// humanDuration renders a remaining time as minutes and seconds.
func humanDuration(seconds float64) string {
	if seconds < 0 || seconds > 99*3600 {
		return "--:--"
	}

	whole := int(seconds + 0.5)

	if whole >= 3600 {
		return fmt.Sprintf("%d:%02d:%02d", whole/3600, (whole%3600)/60, whole%60)
	}

	return fmt.Sprintf("%d:%02d", whole/60, whole%60)
}

const barWidth = 20

func bar(done, total int64) string {
	if total <= 0 {
		return strings.Repeat("-", barWidth)
	}

	filled := int(int64(barWidth) * done / total)
	if filled > barWidth {
		filled = barWidth
	}
	if filled < 0 {
		filled = 0
	}

	return strings.Repeat("#", filled) + strings.Repeat("-", barWidth-filled)
}

const nameWidth = 24

func padName(name string) string {
	runes := []rune(name)

	if len(runes) > nameWidth {
		return string(runes[:nameWidth-1]) + "…"
	}

	return name + strings.Repeat(" ", nameWidth-len(runes))
}
