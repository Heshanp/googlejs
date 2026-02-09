// NZ Suburbs and Localities
// Source: LINZ - CC BY 4.0
// Total: 3176
package data

import (
	_ "embed"
	"encoding/json"
	"strings"
	"sync"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

//go:embed nz_locations.json
var nzLocationsJSON []byte

// NZLocation represents a suburb or locality in New Zealand
type NZLocation struct {
	ID         int    `json:"id"`
	Name       string `json:"name"`
	City       string `json:"city"`
	Region     string `json:"region"`
	Population int    `json:"population"`
	Type       string `json:"type"`
}

// LocationIndex provides fast lookups for location relationships
type LocationIndex struct {
	// All locations
	Locations []NZLocation

	// Lookup maps (case-insensitive, diacritic-insensitive keys using NormalizeKey)
	suburbToCity   map[string]string   // suburb name -> city
	cityToSuburbs  map[string][]string // city -> list of suburb names
	cityToRegion   map[string]string   // city -> region
	regionToCities map[string][]string // region -> list of cities
}

var (
	locationIndex *LocationIndex
	indexOnce     sync.Once
)

// NormalizeKey normalizes a string for case-insensitive and diacritic-insensitive comparisons.
func NormalizeKey(s string) string {
	return normalizeKey(s)
}

func normalizeKey(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}

	s = strings.ToLower(s)

	// Decompose (NFD) then remove combining marks, so "Ōtara" and "Otara" normalize the same.
	decomposed := norm.NFD.String(s)
	var b strings.Builder
	b.Grow(len(decomposed))
	for _, r := range decomposed {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

// GetLocationIndex returns the singleton location index
func GetLocationIndex() *LocationIndex {
	indexOnce.Do(func() {
		locationIndex = buildLocationIndex()
	})
	return locationIndex
}

func buildLocationIndex() *LocationIndex {
	var locations []NZLocation
	if err := json.Unmarshal(nzLocationsJSON, &locations); err != nil {
		panic("failed to parse embedded NZ locations data: " + err.Error())
	}

	idx := &LocationIndex{
		Locations:      locations,
		suburbToCity:   make(map[string]string),
		cityToSuburbs:  make(map[string][]string),
		cityToRegion:   make(map[string]string),
		regionToCities: make(map[string][]string),
	}

	// Track unique cities per region to avoid duplicates
	regionCitySet := make(map[string]map[string]bool)

	for _, loc := range locations {
		nameKey := normalizeKey(loc.Name)
		cityKey := normalizeKey(loc.City)
		regionKey := normalizeKey(loc.Region)

		// Suburb to city mapping
		idx.suburbToCity[nameKey] = loc.City

		// City to suburbs mapping
		idx.cityToSuburbs[cityKey] = append(idx.cityToSuburbs[cityKey], loc.Name)

		// City to region mapping
		if _, exists := idx.cityToRegion[cityKey]; !exists {
			idx.cityToRegion[cityKey] = loc.Region
		}

		// Region to cities mapping (unique cities only)
		if regionCitySet[regionKey] == nil {
			regionCitySet[regionKey] = make(map[string]bool)
		}
		if !regionCitySet[regionKey][cityKey] {
			regionCitySet[regionKey][cityKey] = true
			idx.regionToCities[regionKey] = append(idx.regionToCities[regionKey], loc.City)
		}
	}

	return idx
}

// GetCityForSuburb returns the city for a given suburb name
func (idx *LocationIndex) GetCityForSuburb(suburb string) (string, bool) {
	city, ok := idx.suburbToCity[normalizeKey(suburb)]
	return city, ok
}

// GetSuburbsInCity returns all suburbs in a given city
func (idx *LocationIndex) GetSuburbsInCity(city string) []string {
	return idx.cityToSuburbs[normalizeKey(city)]
}

// GetRegionForCity returns the region for a given city
func (idx *LocationIndex) GetRegionForCity(city string) (string, bool) {
	region, ok := idx.cityToRegion[normalizeKey(city)]
	return region, ok
}

// GetCitiesInRegion returns all cities in a given region
func (idx *LocationIndex) GetCitiesInRegion(region string) []string {
	return idx.regionToCities[normalizeKey(region)]
}

// NormalizeLocation attempts to parse a location string and return structured info
// Handles formats like: "Ponsonby", "Ponsonby, Auckland", "Auckland"
func (idx *LocationIndex) NormalizeLocation(location string) (suburb, city, region string) {
	location = strings.TrimSpace(location)
	if location == "" {
		return "", "", ""
	}

	// Split by comma if present
	parts := strings.Split(location, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}

	// Try first part as suburb
	firstPartKey := normalizeKey(parts[0])
	if foundCity, ok := idx.suburbToCity[firstPartKey]; ok {
		suburb = parts[0]
		city = foundCity
		if foundRegion, ok := idx.cityToRegion[normalizeKey(foundCity)]; ok {
			region = foundRegion
		}
		return suburb, city, region
	}

	// Try first part as city
	if suburbs := idx.cityToSuburbs[firstPartKey]; len(suburbs) > 0 {
		city = parts[0]
		if foundRegion, ok := idx.cityToRegion[firstPartKey]; ok {
			region = foundRegion
		}
		return "", city, region
	}

	// Try first part as region
	if cities := idx.regionToCities[firstPartKey]; len(cities) > 0 {
		region = parts[0]
		return "", "", region
	}

	// Couldn't normalize - return as-is in city field (most common storage format)
	return "", location, ""
}

// GetNearbyLocations returns a list of location strings that are "nearby"
// the given location based on city/region hierarchy
func (idx *LocationIndex) GetNearbyLocations(location string) []string {
	suburb, city, _ := idx.NormalizeLocation(location)

	var nearby []string
	seen := make(map[string]bool)

	// Add the original location
	if location != "" {
		seen[strings.ToLower(location)] = true
		nearby = append(nearby, location)
	}

	// Add all suburbs in the same city
	if city != "" {
		cityLower := strings.ToLower(city)
		for _, s := range idx.cityToSuburbs[normalizeKey(city)] {
			sLower := strings.ToLower(s)
			if !seen[sLower] {
				seen[sLower] = true
				nearby = append(nearby, s)
			}
		}
		// Add the city itself if not the suburb
		if !seen[cityLower] && suburb != city {
			seen[cityLower] = true
			nearby = append(nearby, city)
		}
	}

	// Optionally: Add suburbs from nearby cities in the same region
	// This is commented out as it may return too many results
	// Uncomment if broader matching is desired
	/*
		if region != "" {
			for _, nearbyCity := range idx.regionToCities[strings.ToLower(region)] {
				nearbyCityLower := strings.ToLower(nearbyCity)
				if !seen[nearbyCityLower] {
					for _, s := range idx.cityToSuburbs[nearbyCityLower] {
						sLower := strings.ToLower(s)
						if !seen[sLower] {
							seen[sLower] = true
							nearby = append(nearby, s)
						}
					}
				}
			}
		}
	*/

	return nearby
}
