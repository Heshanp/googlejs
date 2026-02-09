# AI-Directed Fields System

Eliminate categories entirely. AI determines which fields are relevant for each item.

## Architecture

```
Old: Image → AI → Category → Lookup fields → Show form
New: Image → AI → Relevant field IDs → Show form
```

---

## Master Field Registry

A flat pool of ~35 fields. AI picks which are relevant.

| ID | Label | Type | For Items Like |
|----|-------|------|----------------|
| `make` | Make | SELECT | Vehicles |
| `model` | Model | TEXT | Vehicles, Electronics |
| `year` | Year | SELECT | Vehicles, Guitars |
| `mileage` | Mileage (km) | NUMBER | Vehicles |
| `transmission` | Transmission | SELECT | Vehicles |
| `fuel_type` | Fuel Type | SELECT | Vehicles |
| `body_type` | Body Type | SELECT | Vehicles |
| `brand` | Brand | TEXT | Electronics, Fashion, Sports |
| `storage_capacity` | Storage | SELECT | Phones, Computers |
| `battery_health` | Battery Health | SELECT | Phones, Laptops |
| `screen_condition` | Screen Condition | SELECT | Phones, Laptops |
| `processor` | Processor | TEXT | Computers |
| `ram` | RAM | SELECT | Computers |
| `size` | Size | SELECT | Fashion, Sports |
| `color` | Color | TEXT | Any |
| `material` | Material | SELECT | Furniture, Fashion |
| `dimensions` | Dimensions | TEXT | Furniture |
| `breed` | Breed | TEXT | Pets |
| `age` | Age | TEXT | Pets |
| `vaccinated` | Vaccinated | SELECT | Pets |
| `instrument_type` | Instrument Type | SELECT | Instruments |
| `condition` | Condition | SELECT | Any |

---

## Proposed Changes

### Backend

#### [MODIFY] [vision_service.go](file:///Users/heshanpathirana/Documents/Dev/Justsell/justsell/backend/internal/service/vision_service.go)

**Update `AnalysisResult` struct:**
```go
type AnalysisResult struct {
    Title          string                 `json:"title"`
    Description    string                 `json:"description"`
    Condition      string                 `json:"condition"`
    Confidence     float64                `json:"confidence"`
    
    // NEW: AI-determined relevant fields
    RelevantFields []string               `json:"relevantFields"` // ["make", "model", "year"]
    FieldValues    map[string]interface{} `json:"fieldValues"`    // {"make": "Toyota"}
    
    // Keep for backward compat, can deprecate later
    Category       CategoryDetection      `json:"category,omitempty"`
}
```

**Update AI prompt** to ask: "Which fields from this list are relevant?" instead of "What category?"

---

### Frontend

#### [NEW] `config/field-registry.ts`
Master registry of all possible fields with their schemas.

#### [MODIFY] Listing form wizard
- Remove category selector step
- Use `relevantFields` from AI response to build form

#### [DELETE/DEPRECATE] Category-related components
- `CategorySelector.tsx` - no longer needed
- `category-fields/` configs - replaced by field registry

---

## Verification

1. Upload car image → Should show make, model, year, mileage fields
2. Upload phone image → Should show brand, storage, battery, screen fields
3. Upload random item → Should show minimal generic fields
4. Fallback: If AI fails, show manual field selector

---

## Questions

1. Keep category internally for database organization?
2. Fallback UI when AI can't determine fields?
