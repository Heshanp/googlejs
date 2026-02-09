package data

import (
	"testing"
)

func TestGetLocationIndex(t *testing.T) {
	idx := GetLocationIndex()

	if idx == nil {
		t.Fatal("GetLocationIndex returned nil")
	}

	if len(idx.Locations) == 0 {
		t.Error("Expected locations to be loaded, got empty slice")
	}

	// Should have 3176 locations based on the source data
	if len(idx.Locations) != 3176 {
		t.Errorf("Expected 3176 locations, got %d", len(idx.Locations))
	}
}

func TestGetCityForSuburb(t *testing.T) {
	idx := GetLocationIndex()

	tests := []struct {
		suburb       string
		expectedCity string
		shouldFind   bool
	}{
		{"Ponsonby", "Auckland", true},
		{"Grey Lynn", "Auckland", true},
		{"Newtown", "Wellington", true},
		{"Riccarton", "Christchurch", true},
		{"NonExistentSuburb", "", false},
		{"ponsonby", "Auckland", true}, // case insensitive
		{"PONSONBY", "Auckland", true}, // case insensitive
	}

	for _, tt := range tests {
		t.Run(tt.suburb, func(t *testing.T) {
			city, found := idx.GetCityForSuburb(tt.suburb)
			if found != tt.shouldFind {
				t.Errorf("GetCityForSuburb(%q): expected found=%v, got %v", tt.suburb, tt.shouldFind, found)
			}
			if found && city != tt.expectedCity {
				t.Errorf("GetCityForSuburb(%q): expected city=%q, got %q", tt.suburb, tt.expectedCity, city)
			}
		})
	}
}

func TestGetSuburbsInCity(t *testing.T) {
	idx := GetLocationIndex()

	// Auckland should have many suburbs
	aucklandSuburbs := idx.GetSuburbsInCity("Auckland")
	if len(aucklandSuburbs) < 50 {
		t.Errorf("Expected Auckland to have at least 50 suburbs, got %d", len(aucklandSuburbs))
	}

	// Check some known Auckland suburbs are present
	knownSuburbs := []string{"Ponsonby", "Grey Lynn", "Parnell", "Newmarket"}
	suburbSet := make(map[string]bool)
	for _, s := range aucklandSuburbs {
		suburbSet[s] = true
	}

	for _, known := range knownSuburbs {
		if !suburbSet[known] {
			t.Errorf("Expected %q to be in Auckland suburbs", known)
		}
	}

	// Case insensitive
	aucklandSuburbs2 := idx.GetSuburbsInCity("auckland")
	if len(aucklandSuburbs2) != len(aucklandSuburbs) {
		t.Error("GetSuburbsInCity should be case insensitive")
	}

	// Non-existent city
	noSuburbs := idx.GetSuburbsInCity("NonExistentCity")
	if len(noSuburbs) != 0 {
		t.Errorf("Expected no suburbs for non-existent city, got %d", len(noSuburbs))
	}
}

func TestGetRegionForCity(t *testing.T) {
	idx := GetLocationIndex()

	tests := []struct {
		city           string
		expectedRegion string
		shouldFind     bool
	}{
		{"Auckland", "Auckland", true},
		{"Wellington", "Wellington City", true},
		{"Christchurch", "Christchurch City, Selwyn District", true},
		{"NonExistentCity", "", false},
	}

	for _, tt := range tests {
		t.Run(tt.city, func(t *testing.T) {
			region, found := idx.GetRegionForCity(tt.city)
			if found != tt.shouldFind {
				t.Errorf("GetRegionForCity(%q): expected found=%v, got %v", tt.city, tt.shouldFind, found)
			}
			if found && region != tt.expectedRegion {
				t.Errorf("GetRegionForCity(%q): expected region=%q, got %q", tt.city, tt.expectedRegion, region)
			}
		})
	}
}

func TestNormalizeLocation(t *testing.T) {
	idx := GetLocationIndex()

	tests := []struct {
		location       string
		expectedSuburb string
		expectedCity   string
		expectedRegion string
	}{
		// Suburb name only
		{"Ponsonby", "Ponsonby", "Auckland", "Auckland"},
		{"Grey Lynn", "Grey Lynn", "Auckland", "Auckland"},
		{"Newtown", "Newtown", "Wellington", "Wellington City"},

		// City name only
		{"Auckland", "", "Auckland", "Auckland"},
		{"Wellington", "", "Wellington", "Wellington City"},

		// Unknown location - returned as city
		{"SomeRandomPlace", "", "SomeRandomPlace", ""},

		// Empty string
		{"", "", "", ""},

		// Case insensitive
		{"ponsonby", "ponsonby", "Auckland", "Auckland"},
	}

	for _, tt := range tests {
		t.Run(tt.location, func(t *testing.T) {
			suburb, city, region := idx.NormalizeLocation(tt.location)
			if suburb != tt.expectedSuburb {
				t.Errorf("NormalizeLocation(%q): expected suburb=%q, got %q", tt.location, tt.expectedSuburb, suburb)
			}
			if city != tt.expectedCity {
				t.Errorf("NormalizeLocation(%q): expected city=%q, got %q", tt.location, tt.expectedCity, city)
			}
			if region != tt.expectedRegion {
				t.Errorf("NormalizeLocation(%q): expected region=%q, got %q", tt.location, tt.expectedRegion, region)
			}
		})
	}
}

func TestGetNearbyLocations(t *testing.T) {
	idx := GetLocationIndex()

	t.Run("suburb returns same city suburbs", func(t *testing.T) {
		nearby := idx.GetNearbyLocations("Ponsonby")

		if len(nearby) < 10 {
			t.Errorf("Expected at least 10 nearby locations for Ponsonby, got %d", len(nearby))
		}

		// Should include the original location
		found := false
		for _, loc := range nearby {
			if loc == "Ponsonby" {
				found = true
				break
			}
		}
		if !found {
			t.Error("Expected nearby locations to include the original location")
		}

		// Should include other Auckland suburbs
		nearbySet := make(map[string]bool)
		for _, loc := range nearby {
			nearbySet[loc] = true
		}

		aucklandSuburbs := []string{"Grey Lynn", "Parnell", "Newmarket", "Remuera"}
		for _, s := range aucklandSuburbs {
			if !nearbySet[s] {
				t.Errorf("Expected %q to be in nearby locations for Ponsonby", s)
			}
		}
	})

	t.Run("city name returns suburbs", func(t *testing.T) {
		nearby := idx.GetNearbyLocations("Auckland")

		if len(nearby) < 50 {
			t.Errorf("Expected at least 50 nearby locations for Auckland city, got %d", len(nearby))
		}
	})

	t.Run("empty location returns empty slice", func(t *testing.T) {
		nearby := idx.GetNearbyLocations("")

		if len(nearby) != 0 {
			t.Errorf("Expected empty slice for empty location, got %d items", len(nearby))
		}
	})

	t.Run("unknown location returns only itself", func(t *testing.T) {
		nearby := idx.GetNearbyLocations("UnknownPlace")

		if len(nearby) != 1 {
			t.Errorf("Expected 1 location for unknown place, got %d", len(nearby))
		}
		if nearby[0] != "UnknownPlace" {
			t.Errorf("Expected %q, got %q", "UnknownPlace", nearby[0])
		}
	})

	t.Run("no duplicate locations", func(t *testing.T) {
		nearby := idx.GetNearbyLocations("Ponsonby")

		seen := make(map[string]bool)
		for _, loc := range nearby {
			lower := loc
			if seen[lower] {
				t.Errorf("Duplicate location found: %q", loc)
			}
			seen[lower] = true
		}
	})
}

func TestLocationIndexSingleton(t *testing.T) {
	// Should return the same instance
	idx1 := GetLocationIndex()
	idx2 := GetLocationIndex()

	if idx1 != idx2 {
		t.Error("GetLocationIndex should return the same singleton instance")
	}
}

func BenchmarkGetNearbyLocations(b *testing.B) {
	idx := GetLocationIndex()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		idx.GetNearbyLocations("Ponsonby")
	}
}

func BenchmarkNormalizeLocation(b *testing.B) {
	idx := GetLocationIndex()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		idx.NormalizeLocation("Ponsonby")
	}
}
