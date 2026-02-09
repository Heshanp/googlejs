package service

import (
	"strings"
	"testing"
)

func TestNewLocationService(t *testing.T) {
	svc := NewLocationService()

	if svc == nil {
		t.Fatal("NewLocationService returned nil")
	}

	if svc.index == nil {
		t.Error("LocationService index should not be nil")
	}
}

func TestGetProximityLevel(t *testing.T) {
	svc := NewLocationService()

	tests := []struct {
		name     string
		loc1     string
		loc2     string
		expected ProximityLevel
	}{
		// Same suburb
		{"exact match", "Ponsonby", "Ponsonby", ProximitySameSuburb},
		{"exact match case insensitive", "Ponsonby", "ponsonby", ProximitySameSuburb},
		{"exact match upper", "PONSONBY", "ponsonby", ProximitySameSuburb},

		// Same city (different suburbs in Auckland)
		{"same city different suburb", "Ponsonby", "Grey Lynn", ProximitySameCity},
		{"same city different suburb 2", "Parnell", "Newmarket", ProximitySameCity},
		{"same city Mt Eden Remuera", "Mount Eden", "Remuera", ProximitySameCity},

		// Same region (different cities in same region)
		// Note: This depends on the actual data structure

		// Different regions
		{"different regions Auckland Wellington", "Ponsonby", "Newtown", ProximityDifferent},
		{"different regions Auckland Christchurch", "Grey Lynn", "Riccarton", ProximityDifferent},

		// Empty strings
		{"empty first", "", "Ponsonby", ProximityDifferent},
		{"empty second", "Ponsonby", "", ProximityDifferent},
		{"both empty", "", "", ProximityDifferent},

		// Unknown locations
		{"unknown locations", "UnknownPlace1", "UnknownPlace2", ProximityDifferent},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			level := svc.GetProximityLevel(tt.loc1, tt.loc2)
			if level != tt.expected {
				t.Errorf("GetProximityLevel(%q, %q): expected %q, got %q",
					tt.loc1, tt.loc2, tt.expected, level)
			}
		})
	}
}

func TestGetProximityScore(t *testing.T) {
	svc := NewLocationService()

	tests := []struct {
		name     string
		loc1     string
		loc2     string
		expected float64
	}{
		// Same suburb = 1.0
		{"same suburb", "Ponsonby", "Ponsonby", 1.0},
		{"same suburb case insensitive", "ponsonby", "PONSONBY", 1.0},

		// Same city = 0.8
		{"same city", "Ponsonby", "Grey Lynn", 0.8},
		{"same city 2", "Parnell", "Remuera", 0.8},

		// Same region = 0.5 (if applicable)

		// Different = 0.0
		{"different regions", "Ponsonby", "Newtown", 0.0},
		{"empty", "", "", 0.0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := svc.GetProximityScore(tt.loc1, tt.loc2)
			if score != tt.expected {
				t.Errorf("GetProximityScore(%q, %q): expected %.2f, got %.2f",
					tt.loc1, tt.loc2, tt.expected, score)
			}
		})
	}
}

func TestProximityLevelScore(t *testing.T) {
	tests := []struct {
		level    ProximityLevel
		expected float64
	}{
		{ProximitySameSuburb, 1.0},
		{ProximitySameCity, 0.8},
		{ProximitySameRegion, 0.5},
		{ProximityDifferent, 0.0},
	}

	for _, tt := range tests {
		t.Run(string(tt.level), func(t *testing.T) {
			score := tt.level.Score()
			if score != tt.expected {
				t.Errorf("ProximityLevel(%q).Score(): expected %.2f, got %.2f",
					tt.level, tt.expected, score)
			}
		})
	}
}

func TestGetNearbyLocations(t *testing.T) {
	svc := NewLocationService()

	t.Run("Ponsonby returns Auckland suburbs", func(t *testing.T) {
		nearby := svc.GetNearbyLocations("Ponsonby")

		if len(nearby) < 10 {
			t.Errorf("Expected at least 10 nearby locations, got %d", len(nearby))
		}

		// Should include known Auckland suburbs
		nearbySet := make(map[string]bool)
		for _, loc := range nearby {
			nearbySet[loc] = true
		}

		expected := []string{"Ponsonby", "Grey Lynn", "Parnell"}
		for _, e := range expected {
			if !nearbySet[e] {
				t.Errorf("Expected %q to be in nearby locations", e)
			}
		}
	})

	t.Run("empty location returns empty slice", func(t *testing.T) {
		nearby := svc.GetNearbyLocations("")
		if len(nearby) != 0 {
			t.Errorf("Expected empty slice, got %d items", len(nearby))
		}
	})
}

func TestSearchLocations(t *testing.T) {
	svc := NewLocationService()

	t.Run("short query returns empty", func(t *testing.T) {
		results := svc.SearchLocations("a", 20)
		if len(results) != 0 {
			t.Errorf("Expected empty results for short query, got %d", len(results))
		}
	})

	t.Run("matches without macrons", func(t *testing.T) {
		results := svc.SearchLocations("te atatu", 20)
		if len(results) == 0 {
			t.Fatal("Expected results for query 'te atatu', got none")
		}

		found := false
		for _, loc := range results {
			if strings.Contains(loc.Name, "Te Atatū") {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected at least one result containing %q", "Te Atatū")
		}
	})

	t.Run("diacritic-insensitive match", func(t *testing.T) {
		results := svc.SearchLocations("otara", 50)
		if len(results) == 0 {
			t.Fatal("Expected results for query 'otara', got none")
		}

		found := false
		for _, loc := range results {
			if loc.Name == "Ōtara" {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected to find suburb %q in results", "Ōtara")
		}
	})

	t.Run("limit defaults to 20", func(t *testing.T) {
		results := svc.SearchLocations("auckland", 0)
		if len(results) != 20 {
			t.Errorf("Expected 20 results by default, got %d", len(results))
		}
	})

	t.Run("limit clamps to 50", func(t *testing.T) {
		results := svc.SearchLocations("auckland", 1000)
		if len(results) != 50 {
			t.Errorf("Expected 50 results when clamped, got %d", len(results))
		}
	})
}

func TestGetMajorCities(t *testing.T) {
	svc := NewLocationService()

	t.Run("returns ranked cities", func(t *testing.T) {
		cities := svc.GetMajorCities(20)
		if len(cities) == 0 {
			t.Fatal("Expected major cities, got none")
		}
		if len(cities) > 20 {
			t.Fatalf("Expected at most 20 cities, got %d", len(cities))
		}

		foundAuckland := false
		for _, city := range cities {
			if city.Name == "Auckland" {
				foundAuckland = true
				break
			}
		}
		if !foundAuckland {
			t.Fatal("Expected Auckland to be present in major city results")
		}

		for i := 1; i < len(cities); i++ {
			if cities[i].Population > cities[i-1].Population {
				t.Fatalf("Expected cities sorted by descending population at index %d", i)
			}
		}
	})

	t.Run("default limit is 80", func(t *testing.T) {
		cities := svc.GetMajorCities(0)
		if len(cities) != 80 {
			t.Fatalf("Expected default limit of 80 cities, got %d", len(cities))
		}
	})

	t.Run("limit clamps to 200", func(t *testing.T) {
		cities := svc.GetMajorCities(1000)
		if len(cities) != 200 {
			t.Fatalf("Expected clamped limit of 200 cities, got %d", len(cities))
		}
	})
}

func TestGetSuburbsByCity(t *testing.T) {
	svc := NewLocationService()

	t.Run("returns suburbs for known city", func(t *testing.T) {
		suburbs := svc.GetSuburbsByCity("Wellington", 100)
		if len(suburbs) == 0 {
			t.Fatal("Expected suburbs for Wellington, got none")
		}

		foundExpected := false
		for _, suburb := range suburbs {
			if !strings.EqualFold(suburb.City, "Wellington") {
				t.Fatalf("Expected all suburbs to belong to Wellington, got city %q", suburb.City)
			}
			if strings.EqualFold(suburb.Name, "Te Aro") || strings.EqualFold(suburb.Name, "Karori") {
				foundExpected = true
			}
		}

		if !foundExpected {
			t.Fatal("Expected at least one known Wellington suburb in results")
		}
	})

	t.Run("empty city returns empty", func(t *testing.T) {
		suburbs := svc.GetSuburbsByCity("", 50)
		if len(suburbs) != 0 {
			t.Fatalf("Expected empty suburbs for empty city, got %d", len(suburbs))
		}
	})

	t.Run("limit is respected", func(t *testing.T) {
		suburbs := svc.GetSuburbsByCity("Auckland", 5)
		if len(suburbs) > 5 {
			t.Fatalf("Expected at most 5 suburbs, got %d", len(suburbs))
		}
	})
}

func TestNormalizeLocation(t *testing.T) {
	svc := NewLocationService()

	suburb, city, region := svc.NormalizeLocation("Ponsonby")

	if suburb != "Ponsonby" {
		t.Errorf("Expected suburb=Ponsonby, got %q", suburb)
	}
	if city != "Auckland" {
		t.Errorf("Expected city=Auckland, got %q", city)
	}
	if region != "Auckland" {
		t.Errorf("Expected region=Auckland, got %q", region)
	}
}

func TestGetCityForLocation(t *testing.T) {
	svc := NewLocationService()

	tests := []struct {
		location string
		expected string
	}{
		{"Ponsonby", "Auckland"},
		{"Grey Lynn", "Auckland"},
		{"Newtown", "Wellington"},
		{"UnknownPlace", "UnknownPlace"}, // Unknown returns itself
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.location, func(t *testing.T) {
			city := svc.GetCityForLocation(tt.location)
			if city != tt.expected {
				t.Errorf("GetCityForLocation(%q): expected %q, got %q",
					tt.location, tt.expected, city)
			}
		})
	}
}

func TestGetRegionForLocation(t *testing.T) {
	svc := NewLocationService()

	tests := []struct {
		location string
		expected string
	}{
		{"Ponsonby", "Auckland"},
		{"Grey Lynn", "Auckland"},
		{"Newtown", "Wellington City"},
		{"UnknownPlace", ""}, // Unknown returns empty
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.location, func(t *testing.T) {
			region := svc.GetRegionForLocation(tt.location)
			if region != tt.expected {
				t.Errorf("GetRegionForLocation(%q): expected %q, got %q",
					tt.location, tt.expected, region)
			}
		})
	}
}

// Test proximity is symmetric
func TestProximitySymmetry(t *testing.T) {
	svc := NewLocationService()

	pairs := [][2]string{
		{"Ponsonby", "Grey Lynn"},
		{"Ponsonby", "Newtown"},
		{"Auckland", "Wellington"},
		{"Parnell", "Remuera"},
	}

	for _, pair := range pairs {
		t.Run(pair[0]+"_"+pair[1], func(t *testing.T) {
			score1 := svc.GetProximityScore(pair[0], pair[1])
			score2 := svc.GetProximityScore(pair[1], pair[0])

			if score1 != score2 {
				t.Errorf("Proximity should be symmetric: %q<->%q = %.2f, %q<->%q = %.2f",
					pair[0], pair[1], score1, pair[1], pair[0], score2)
			}

			level1 := svc.GetProximityLevel(pair[0], pair[1])
			level2 := svc.GetProximityLevel(pair[1], pair[0])

			if level1 != level2 {
				t.Errorf("ProximityLevel should be symmetric: %q<->%q = %q, %q<->%q = %q",
					pair[0], pair[1], level1, pair[1], pair[0], level2)
			}
		})
	}
}

// Test real-world scenarios
func TestRealWorldScenarios(t *testing.T) {
	svc := NewLocationService()

	t.Run("Auckland suburbs are nearby each other", func(t *testing.T) {
		aucklandSuburbs := []string{
			"Ponsonby", "Grey Lynn", "Parnell", "Newmarket",
			"Remuera", "Mount Eden", "Epsom", "Grafton",
		}

		for i, s1 := range aucklandSuburbs {
			for j, s2 := range aucklandSuburbs {
				if i == j {
					continue
				}
				score := svc.GetProximityScore(s1, s2)
				if score < 0.8 {
					t.Errorf("Auckland suburbs %q and %q should have score >= 0.8, got %.2f",
						s1, s2, score)
				}
			}
		}
	})

	t.Run("Wellington suburbs are not near Auckland suburbs", func(t *testing.T) {
		wellingtonSuburbs := []string{"Newtown", "Te Aro", "Kelburn", "Karori"}
		aucklandSuburbs := []string{"Ponsonby", "Grey Lynn", "Parnell"}

		for _, w := range wellingtonSuburbs {
			for _, a := range aucklandSuburbs {
				score := svc.GetProximityScore(w, a)
				if score > 0.0 {
					t.Errorf("Wellington suburb %q and Auckland suburb %q should have score 0, got %.2f",
						w, a, score)
				}
			}
		}
	})
}

func BenchmarkGetProximityScore(b *testing.B) {
	svc := NewLocationService()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.GetProximityScore("Ponsonby", "Grey Lynn")
	}
}

func BenchmarkGetNearbyLocations(b *testing.B) {
	svc := NewLocationService()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.GetNearbyLocations("Ponsonby")
	}
}
