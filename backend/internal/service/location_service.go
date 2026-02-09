package service

import (
	"sort"
	"strings"

	"github.com/yourusername/justsell/backend/internal/data"
)

// LocationService handles location proximity calculations
type LocationService struct {
	index *data.LocationIndex
}

// MajorCity represents an aggregated city summary derived from the location index.
type MajorCity struct {
	Name       string `json:"name"`
	Region     string `json:"region"`
	Population int    `json:"population"`
}

// NewLocationService creates a new location service
func NewLocationService() *LocationService {
	return &LocationService{
		index: data.GetLocationIndex(),
	}
}

// ProximityLevel indicates how close two locations are
type ProximityLevel string

const (
	ProximitySameSuburb ProximityLevel = "same_suburb"
	ProximitySameCity   ProximityLevel = "same_city"
	ProximitySameRegion ProximityLevel = "same_region"
	ProximityDifferent  ProximityLevel = "different"
)

// ProximityScore returns a numeric score based on proximity level
func (p ProximityLevel) Score() float64 {
	switch p {
	case ProximitySameSuburb:
		return 1.0
	case ProximitySameCity:
		return 0.8
	case ProximitySameRegion:
		return 0.5
	default:
		return 0.0
	}
}

// GetNearbyLocations returns a list of locations that are "nearby" the given location
// based on the city/region hierarchy. This includes all suburbs in the same city.
func (s *LocationService) GetNearbyLocations(location string) []string {
	return s.index.GetNearbyLocations(location)
}

// SearchLocations returns a list of locations matching the query.
// Matching is case-insensitive and diacritic-insensitive, and checks name, city, and region.
func (s *LocationService) SearchLocations(query string, limit int) []data.NZLocation {
	q := strings.TrimSpace(query)
	if len([]rune(q)) < 2 {
		return []data.NZLocation{}
	}

	if limit <= 0 {
		limit = 20
	} else if limit > 50 {
		limit = 50
	}

	qKey := data.NormalizeKey(q)
	if qKey == "" {
		return []data.NZLocation{}
	}

	results := make([]data.NZLocation, 0, limit)
	for _, loc := range s.index.Locations {
		if len(results) >= limit {
			break
		}

		if strings.Contains(data.NormalizeKey(loc.Name), qKey) ||
			strings.Contains(data.NormalizeKey(loc.City), qKey) ||
			strings.Contains(data.NormalizeKey(loc.Region), qKey) {
			results = append(results, loc)
		}
	}

	return results
}

// GetMajorCities returns unique NZ cities ranked by aggregated population.
func (s *LocationService) GetMajorCities(limit int) []MajorCity {
	if limit <= 0 {
		limit = 80
	} else if limit > 200 {
		limit = 200
	}

	cityTotals := make(map[string]MajorCity)

	for _, loc := range s.index.Locations {
		cityName := strings.TrimSpace(loc.City)
		if cityName == "" {
			continue
		}

		cityKey := data.NormalizeKey(cityName)
		current := cityTotals[cityKey]
		if current.Name == "" {
			current.Name = cityName
		}
		if current.Region == "" {
			current.Region = strings.TrimSpace(loc.Region)
		}
		current.Population += loc.Population
		cityTotals[cityKey] = current
	}

	cities := make([]MajorCity, 0, len(cityTotals))
	for _, city := range cityTotals {
		if city.Name == "" {
			continue
		}
		cities = append(cities, city)
	}

	sort.Slice(cities, func(i, j int) bool {
		if cities[i].Population == cities[j].Population {
			return strings.ToLower(cities[i].Name) < strings.ToLower(cities[j].Name)
		}
		return cities[i].Population > cities[j].Population
	})

	if len(cities) > limit {
		cities = cities[:limit]
	}

	return cities
}

// GetSuburbsByCity returns suburbs/localities for a specific city.
// Results are de-duplicated by suburb name and ranked by population.
func (s *LocationService) GetSuburbsByCity(city string, limit int) []data.NZLocation {
	cityKey := data.NormalizeKey(city)
	if cityKey == "" {
		return []data.NZLocation{}
	}

	if limit <= 0 {
		limit = 500
	} else if limit > 2000 {
		limit = 2000
	}

	suburbByKey := make(map[string]data.NZLocation)

	for _, loc := range s.index.Locations {
		if data.NormalizeKey(loc.City) != cityKey {
			continue
		}

		suburbName := strings.TrimSpace(loc.Name)
		if suburbName == "" {
			continue
		}

		suburbKey := data.NormalizeKey(suburbName)
		existing, exists := suburbByKey[suburbKey]
		if !exists || loc.Population > existing.Population {
			suburbByKey[suburbKey] = loc
		}
	}

	results := make([]data.NZLocation, 0, len(suburbByKey))
	for _, loc := range suburbByKey {
		results = append(results, loc)
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].Population == results[j].Population {
			return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
		}
		return results[i].Population > results[j].Population
	})

	if len(results) > limit {
		results = results[:limit]
	}

	return results
}

// GetProximityLevel determines how close two locations are to each other
func (s *LocationService) GetProximityLevel(loc1, loc2 string) ProximityLevel {
	if loc1 == "" || loc2 == "" {
		return ProximityDifferent
	}

	// Normalize both locations
	suburb1, city1, region1 := s.index.NormalizeLocation(loc1)
	suburb2, city2, region2 := s.index.NormalizeLocation(loc2)

	// Check for exact match (case-insensitive)
	if strings.EqualFold(loc1, loc2) {
		return ProximitySameSuburb
	}

	// Check suburb match
	if suburb1 != "" && suburb2 != "" && strings.EqualFold(suburb1, suburb2) {
		return ProximitySameSuburb
	}

	// Check city match
	if city1 != "" && city2 != "" && strings.EqualFold(city1, city2) {
		return ProximitySameCity
	}

	// Check region match
	if region1 != "" && region2 != "" && strings.EqualFold(region1, region2) {
		return ProximitySameRegion
	}

	return ProximityDifferent
}

// GetProximityScore returns a numeric proximity score between two locations
// Score ranges from 0.0 (different regions) to 1.0 (same suburb)
func (s *LocationService) GetProximityScore(loc1, loc2 string) float64 {
	return s.GetProximityLevel(loc1, loc2).Score()
}

// NormalizeLocation parses a location string and returns structured components
func (s *LocationService) NormalizeLocation(location string) (suburb, city, region string) {
	return s.index.NormalizeLocation(location)
}

// GetCityForLocation returns the city that a location belongs to
func (s *LocationService) GetCityForLocation(location string) string {
	_, city, _ := s.index.NormalizeLocation(location)
	return city
}

// GetRegionForLocation returns the region that a location belongs to
func (s *LocationService) GetRegionForLocation(location string) string {
	_, _, region := s.index.NormalizeLocation(location)
	return region
}
