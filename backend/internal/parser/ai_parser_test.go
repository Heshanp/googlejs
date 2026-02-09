package parser

import (
	"strings"
	"testing"
)

// ============================================================================
// Tests for buildParserPrompt
// ============================================================================

func TestBuildParserPrompt_ContainsQuery(t *testing.T) {
	query := "Toyota Corolla under 50k in Auckland"
	prompt := buildParserPrompt(query)

	if !strings.Contains(prompt, query) {
		t.Error("Prompt should contain the original query")
	}
}

func TestBuildParserPrompt_ContainsJSONSchema(t *testing.T) {
	query := "cheap car"
	prompt := buildParserPrompt(query)

	expectedFields := []string{
		"query",
		"category",
		"make",
		"model",
		"yearMin",
		"yearMax",
		"priceMin",
		"priceMax",
		"odometerMin",
		"odometerMax",
		"location",
		"color",
		"condition",
		"interpretation",
	}

	for _, field := range expectedFields {
		if !strings.Contains(prompt, `"`+field+`"`) {
			t.Errorf("Prompt should contain field %q", field)
		}
	}
}

func TestBuildParserPrompt_ContainsNZContext(t *testing.T) {
	query := "car in wellington"
	prompt := buildParserPrompt(query)

	// Should mention NZ-specific context
	if !strings.Contains(prompt, "New Zealand") {
		t.Error("Prompt should mention New Zealand")
	}
	if !strings.Contains(prompt, "NZD") {
		t.Error("Prompt should mention NZD currency")
	}

	// Should list NZ cities/regions
	nzLocations := []string{"Auckland", "Wellington", "Christchurch", "Canterbury"}
	foundLocations := 0
	for _, loc := range nzLocations {
		if strings.Contains(prompt, loc) {
			foundLocations++
		}
	}
	if foundLocations < 2 {
		t.Error("Prompt should mention multiple NZ locations")
	}
}

func TestBuildParserPrompt_ContainsPriceGuidelines(t *testing.T) {
	query := "affordable laptop"
	prompt := buildParserPrompt(query)

	// Should provide context for price terms
	if !strings.Contains(prompt, "cheap") || !strings.Contains(prompt, "affordable") {
		t.Error("Prompt should explain price terms like 'cheap' and 'affordable'")
	}
}

func TestBuildParserPrompt_ContainsCategoryList(t *testing.T) {
	query := "gaming console"
	prompt := buildParserPrompt(query)

	// These are the actual categories defined in the parser prompt
	expectedCategories := []string{
		"vehicles",
		"phones",
		"computers",
		"gaming",
		"fashion",
		"furniture",
		"sports",
	}

	for _, cat := range expectedCategories {
		if !strings.Contains(prompt, cat) {
			t.Errorf("Prompt should contain category %q", cat)
		}
	}
}

func TestBuildParserPrompt_ContainsConditionOptions(t *testing.T) {
	query := "good condition phone"
	prompt := buildParserPrompt(query)

	conditions := []string{"New", "Like New", "Good", "Fair"}
	for _, cond := range conditions {
		if !strings.Contains(prompt, cond) {
			t.Errorf("Prompt should contain condition option %q", cond)
		}
	}
}

func TestBuildParserPrompt_ContainsYearRangeInstructions(t *testing.T) {
	query := "2015-2020 car"
	prompt := buildParserPrompt(query)

	if !strings.Contains(prompt, "yearMin") || !strings.Contains(prompt, "yearMax") {
		t.Error("Prompt should explain year range fields")
	}
}

func TestBuildParserPrompt_ContainsOdometerInstructions(t *testing.T) {
	query := "low km car"
	prompt := buildParserPrompt(query)

	if !strings.Contains(prompt, "low kms") || !strings.Contains(prompt, "low mileage") {
		t.Error("Prompt should explain odometer/mileage terms")
	}
}

func TestBuildParserPrompt_ContainsJSONOnlyInstruction(t *testing.T) {
	query := "test query"
	prompt := buildParserPrompt(query)

	if !strings.Contains(prompt, "valid JSON") {
		t.Error("Prompt should instruct to return valid JSON only")
	}
}

func TestBuildParserPrompt_ContainsInterpretationField(t *testing.T) {
	query := "blue honda civic"
	prompt := buildParserPrompt(query)

	if !strings.Contains(prompt, "interpretation") {
		t.Error("Prompt should mention interpretation field")
	}
	if !strings.Contains(prompt, "Human-readable") || !strings.Contains(prompt, "summary") {
		t.Error("Prompt should explain interpretation as human-readable summary")
	}
}

func TestBuildParserPrompt_SpecialCharactersInQuery(t *testing.T) {
	// Test that special characters in query don't break the prompt
	queries := []string{
		`car with "good" condition`,
		"price < $5000",
		"2020's best cars",
		"car & motorcycle",
		"50% off items",
	}

	for _, query := range queries {
		prompt := buildParserPrompt(query)
		if !strings.Contains(prompt, "USER QUERY") {
			t.Errorf("Prompt should still contain USER QUERY section for: %q", query)
		}
	}
}

func TestBuildParserPrompt_EmptyQuery(t *testing.T) {
	prompt := buildParserPrompt("")

	// Should still produce a valid prompt
	if !strings.Contains(prompt, "USER QUERY") {
		t.Error("Prompt should still be valid with empty query")
	}
}

func TestBuildParserPrompt_LongQuery(t *testing.T) {
	longQuery := strings.Repeat("toyota camry ", 100)
	prompt := buildParserPrompt(longQuery)

	// Should handle long queries
	if !strings.Contains(prompt, "toyota camry") {
		t.Error("Prompt should contain the query content")
	}
}

// ============================================================================
// Tests for prompt structure
// ============================================================================

func TestBuildParserPrompt_StructureOrder(t *testing.T) {
	query := "test query"
	prompt := buildParserPrompt(query)

	// Verify key sections appear in logical order
	userQueryPos := strings.Index(prompt, "USER QUERY")
	jsonSchemaPos := strings.Index(prompt, `"query"`)
	rulesPos := strings.Index(prompt, "RULES")

	if userQueryPos == -1 || jsonSchemaPos == -1 || rulesPos == -1 {
		t.Fatal("Prompt missing expected sections")
	}

	if userQueryPos > jsonSchemaPos {
		t.Error("USER QUERY should appear before JSON schema")
	}
	if jsonSchemaPos > rulesPos {
		t.Error("JSON schema should appear before RULES")
	}
}
