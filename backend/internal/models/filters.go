package models

// Filters represents search filters
type Filters struct {
	Query         string `json:"query"`
	Category      string `json:"category,omitempty"`
	Subcategory   string `json:"subcategory,omitempty"`
	Make          string `json:"make,omitempty"`
	Model         string `json:"model,omitempty"`
	BodyStyle     string `json:"bodyStyle,omitempty"`
	FuelType      string `json:"fuelType,omitempty"`
	Transmission  string `json:"transmission,omitempty"`
	EngineSizeMin *int   `json:"engineSizeMin,omitempty"`
	EngineSizeMax *int   `json:"engineSizeMax,omitempty"`
	Style         string `json:"style,omitempty"`
	Layout        string `json:"layout,omitempty"`
	HullType      string `json:"hullType,omitempty"`
	EngineType    string `json:"engineType,omitempty"`
	SelfContained *bool  `json:"selfContained,omitempty"`
	YearMin       *int   `json:"yearMin,omitempty"`
	YearMax       *int   `json:"yearMax,omitempty"`
	PriceMin      *int   `json:"priceMin,omitempty"`
	PriceMax      *int   `json:"priceMax,omitempty"`
	OdometerMin   *int   `json:"odometerMin,omitempty"`
	OdometerMax   *int   `json:"odometerMax,omitempty"`
	Location      string `json:"location,omitempty"`
	Color         string `json:"color,omitempty"`
	Condition     string `json:"condition,omitempty"`
	Keywords      string `json:"keywords,omitempty"`
}
