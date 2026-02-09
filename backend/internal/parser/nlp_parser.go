package parser

import "github.com/yourusername/justsell/backend/internal/models"

// ParseNaturalQuery parses a natural language query into structured filters
func ParseNaturalQuery(query string) models.Filters {
	// TODO: Implement pattern-based NLP parsing
	return models.Filters{
		Query: query,
	}
}
