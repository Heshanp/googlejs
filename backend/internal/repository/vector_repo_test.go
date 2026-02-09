package repository

import "testing"

func TestBuildKeywordQuery(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "drops filler words and keeps intent token",
			input:    "find me an iphone",
			expected: "iphone",
		},
		{
			name:     "deduplicates and normalizes tokens",
			input:    "Toyota toyota Camry camry",
			expected: "toyota camry",
		},
		{
			name:     "keeps numeric model tokens",
			input:    "iphone 15 pro",
			expected: "iphone 15 pro",
		},
		{
			name:     "falls back to raw when all are stop words",
			input:    "find me the one",
			expected: "one",
		},
		{
			name:     "empty stays empty",
			input:    "   ",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildKeywordQuery(tt.input)
			if got != tt.expected {
				t.Fatalf("buildKeywordQuery(%q) = %q, want %q", tt.input, got, tt.expected)
			}
		})
	}
}

func TestBuildKeywordPlan(t *testing.T) {
	tests := []struct {
		name              string
		input             string
		wantStrict        string
		wantRelaxed       string
		wantSpecific      bool
		wantAnchorMin     int
		mustContainTokens []string
	}{
		{
			name:              "soft modifiers are optional",
			input:             "cheap used iphone",
			wantStrict:        "iphone",
			wantRelaxed:       "cheap OR used OR iphone",
			wantSpecific:      false,
			wantAnchorMin:     1,
			mustContainTokens: []string{"iphone"},
		},
		{
			name:              "mobile synonyms expand to phone",
			input:             "mobile phone",
			wantStrict:        "mobile phone",
			wantRelaxed:       "mobile OR phone",
			wantSpecific:      false,
			wantAnchorMin:     0,
			mustContainTokens: []string{"mobile", "phone"},
		},
		{
			name:              "ios expands to apple and iphone",
			input:             "ios device",
			wantStrict:        "ios device",
			wantRelaxed:       "ios OR iphone OR apple OR device OR phone",
			wantSpecific:      false,
			wantAnchorMin:     2,
			mustContainTokens: []string{"ios", "iphone", "apple", "phone"},
		},
		{
			name:              "numeric model query is specific intent",
			input:             "iphone 16",
			wantStrict:        "iphone 16",
			wantRelaxed:       "iphone OR 16",
			wantSpecific:      true,
			wantAnchorMin:     1,
			mustContainTokens: []string{"iphone", "16"},
		},
		{
			name:              "model qualifier query is specific intent",
			input:             "s24 ultra",
			wantStrict:        "s24 ultra",
			wantRelaxed:       "s24 OR ultra",
			wantSpecific:      true,
			wantAnchorMin:     0,
			mustContainTokens: []string{"s24", "ultra"},
		},
		{
			name:              "plural query gets singular fallback token",
			input:             "show me phones",
			wantStrict:        "phones",
			wantRelaxed:       "phones",
			wantSpecific:      false,
			wantAnchorMin:     0,
			mustContainTokens: []string{"phones", "phone"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			plan := buildKeywordPlan(tt.input)
			if plan.StrictQueryText != tt.wantStrict {
				t.Fatalf("StrictQueryText = %q, want %q", plan.StrictQueryText, tt.wantStrict)
			}
			if plan.RelaxedOrQueryText != tt.wantRelaxed {
				t.Fatalf("RelaxedOrQueryText = %q, want %q", plan.RelaxedOrQueryText, tt.wantRelaxed)
			}
			if plan.SpecificIntent != tt.wantSpecific {
				t.Fatalf("SpecificIntent = %v, want %v", plan.SpecificIntent, tt.wantSpecific)
			}
			if plan.AnchorMinMatch != tt.wantAnchorMin {
				t.Fatalf("AnchorMinMatch = %d, want %d (anchors=%v)", plan.AnchorMinMatch, tt.wantAnchorMin, plan.AnchorTokens)
			}
			for _, token := range tt.mustContainTokens {
				if !containsToken(plan.LikeTokens, token) {
					t.Fatalf("LikeTokens = %v, missing token %q", plan.LikeTokens, token)
				}
			}
		})
	}
}

func TestBuildKeywordPlan_IntegratedDescriptorIsNotStrictAnchor(t *testing.T) {
	plan := buildKeywordPlan("Breville Barista Espresso Machine with Integrated Grinder")

	if containsToken(plan.AnchorTokens, "integrated") {
		t.Fatalf("AnchorTokens must not include descriptor token 'integrated': %v", plan.AnchorTokens)
	}
	if containsToken(plan.RequiredAllTokens, "integrated") {
		t.Fatalf("RequiredAllTokens must not include descriptor token 'integrated': %v", plan.RequiredAllTokens)
	}
	if plan.AnchorMinMatch != 3 {
		t.Fatalf("AnchorMinMatch = %d, want 3 for anchors=%v", plan.AnchorMinMatch, plan.AnchorTokens)
	}
}

func TestBuildKeywordPlanWithRatio_ComputesAnchorMinMatch(t *testing.T) {
	plan := buildKeywordPlanWithRatio("breville barista espresso machine grinder", 0.40)

	if len(plan.AnchorTokens) != 5 {
		t.Fatalf("AnchorTokens length = %d, want 5", len(plan.AnchorTokens))
	}
	if plan.AnchorMinMatch != 2 {
		t.Fatalf("AnchorMinMatch = %d, want 2 for ratio 0.40 with anchors=%v", plan.AnchorMinMatch, plan.AnchorTokens)
	}
}

func containsToken(tokens []string, want string) bool {
	for _, token := range tokens {
		if token == want {
			return true
		}
	}
	return false
}
