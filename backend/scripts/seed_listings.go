package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/pgvector/pgvector-go"
)

// Sample listings with realistic data for semantic search testing
type SeedListing struct {
	Title          string
	Description    string
	Price          float64
	Category       string
	Location       string
	Make           string
	Model          string
	Year           int
	ImageFilename  string
	CategoryFields map[string]interface{}
}

var sampleListings = []SeedListing{
	// Vehicles
	{
		Title:         "2019 Toyota Camry SE - Red, Low Miles",
		Description:   "Beautiful red Toyota Camry SE in excellent condition. Only 45,000 km on the clock. Features include leather seats, Apple CarPlay, backup camera, and lane departure warning. Regular service history, drives like new. Perfect family sedan that's fuel efficient and reliable.",
		Price:         28500,
		Category:      "cat_cars",
		Location:      "Auckland",
		Make:          "Toyota",
		Model:         "Camry",
		Year:          2019,
		ImageFilename: "red_toyota_car_1767609299009.png",
		CategoryFields: map[string]interface{}{
			"make": "Toyota", "model": "Camry", "year": 2019, "mileage": 45000,
			"transmission": "Automatic", "fuelType": "Petrol", "bodyStyle": "Sedan", "color": "Red",
		},
	},
	{
		Title:         "Tesla Model 3 Long Range - White, Full Self-Driving",
		Description:   "2023 Tesla Model 3 Long Range in pristine white. Includes Full Self-Driving capability, premium interior, 19-inch sport wheels. Range of 560km on a single charge. Only 15,000 km, still under warranty. Autopilot works flawlessly.",
		Price:         65000,
		Category:      "cat_cars",
		Location:      "Wellington",
		Make:          "Tesla",
		Model:         "Model 3",
		Year:          2023,
		ImageFilename: "tesla_model3_white_1767609315853.png",
		CategoryFields: map[string]interface{}{
			"make": "Tesla", "model": "Model 3", "year": 2023, "mileage": 15000,
			"transmission": "Automatic", "fuelType": "Electric", "bodyStyle": "Sedan", "color": "White",
		},
	},
	{
		Title:         "Harley Davidson Street Glide - Matte Black",
		Description:   "2021 Harley Davidson Street Glide Special in stunning matte black finish. Milwaukee-Eight 114 engine with 1,868cc of pure power. Boom Box GTS infotainment, heated grips, cruise control. Only 8,000 km, always garaged.",
		Price:         42000,
		Category:      "cat_moto",
		Location:      "Christchurch",
		Make:          "Harley-Davidson",
		Model:         "Street Glide",
		Year:          2021,
		ImageFilename: "harley_motorcycle_1767609331919.png",
		CategoryFields: map[string]interface{}{
			"make": "Harley-Davidson", "model": "Street Glide", "year": 2021,
			"mileage": 8000, "style": "Cruiser", "engineSize": "1868cc", "color": "Black",
		},
	},
	// Phones
	{
		Title:         "iPhone 15 Pro 256GB - Natural Titanium",
		Description:   "Apple iPhone 15 Pro 256GB in Natural Titanium. Like new condition, used for only 3 months. Features A17 Pro chip, 48MP camera system, Action button, and USB-C port. Battery health at 99%. Comes with original box and case.",
		Price:         1699,
		Category:      "cat_phones",
		Location:      "Auckland",
		ImageFilename: "iphone_15_pro_1767609354596.png",
		CategoryFields: map[string]interface{}{
			"brand": "Apple", "model": "iPhone 15 Pro", "storage": "256GB",
			"batteryHealth": 99, "color": "Natural Titanium", "condition": "Like New",
		},
	},
	{
		Title:         "Samsung Galaxy S24 Ultra 512GB - Titanium Black",
		Description:   "Samsung Galaxy S24 Ultra with 512GB storage in Titanium Black. Features 200MP camera, S Pen included, AI-powered features for photo editing and translation. Excellent condition with screen protector since day one.",
		Price:         1499,
		Category:      "cat_phones",
		Location:      "Hamilton",
		ImageFilename: "samsung_s24_phone_1767609399005.png",
		CategoryFields: map[string]interface{}{
			"brand": "Samsung", "model": "Galaxy S24 Ultra", "storage": "512GB",
			"batteryHealth": 97, "color": "Titanium Black", "condition": "Excellent",
		},
	},
	// Computers
	{
		Title:         "MacBook Pro 14-inch M3 Pro - Space Black",
		Description:   "2023 MacBook Pro 14-inch with M3 Pro chip, 18GB unified memory, 512GB SSD. The new Space Black color that resists fingerprints. 120Hz ProMotion display is incredible for video editing. AppleCare+ until 2026.",
		Price:         3299,
		Category:      "cat_computers",
		Location:      "Auckland",
		ImageFilename: "macbook_pro_laptop_1767609381793.png",
		CategoryFields: map[string]interface{}{
			"brand": "Apple", "model": "MacBook Pro 14-inch", "processor": "M3 Pro",
			"ram": "18GB", "storage": "512GB SSD", "color": "Space Black", "condition": "Like New",
		},
	},
	// Audio
	{
		Title:         "Sony WH-1000XM5 Wireless Headphones - Black",
		Description:   "Sony WH-1000XM5 industry-leading noise cancelling headphones. Premium sound quality with 30 hours battery life. Multipoint connection for two devices. Includes carry case, charging cable, and airplane adapter.",
		Price:         449,
		Category:      "cat_audio",
		Location:      "Wellington",
		ImageFilename: "wireless_headphones_1767609515159.png",
		CategoryFields: map[string]interface{}{
			"brand": "Sony", "model": "WH-1000XM5", "type": "Over-ear",
			"wireless": true, "color": "Black", "condition": "Like New",
		},
	},
	// Furniture
	{
		Title:         "Modern Grey Fabric 3-Seater Sofa",
		Description:   "Beautiful modern 3-seater sofa in elegant grey fabric. Scandinavian design with solid oak legs. Super comfortable with high-density foam cushions. Dimensions: 220cm x 90cm x 85cm. Selling due to moving overseas.",
		Price:         1200,
		Category:      "cat_furniture",
		Location:      "Auckland",
		ImageFilename: "modern_sofa_grey_1767609416486.png",
		CategoryFields: map[string]interface{}{
			"material": "Fabric", "color": "Grey", "style": "Modern Scandinavian",
			"condition": "Excellent", "width": "220cm", "depth": "90cm",
		},
	},
	{
		Title:         "Electric Standing Desk - Oak Top, Dual Motor",
		Description:   "Premium electric standing desk with beautiful solid oak top. Dual motor system for smooth and quiet height adjustment from 65cm to 130cm. Memory presets for 4 positions. Desktop size: 150cm x 75cm. Cable management tray included.",
		Price:         850,
		Category:      "cat_furniture",
		Location:      "Wellington",
		ImageFilename: "standing_desk_oak_1767609465495.png",
		CategoryFields: map[string]interface{}{
			"material": "Oak Wood", "type": "Standing Desk", "electric": true,
			"condition": "Excellent", "width": "150cm", "depth": "75cm",
		},
	},
	// Sports
	{
		Title:         "Trek Domane SL5 Road Bike - Carbon Frame, Size 56",
		Description:   "Trek Domane SL5 carbon fiber road bike, size 56cm. Shimano 105 groupset with hydraulic disc brakes. IsoSpeed decoupler for smooth ride on rough roads. Only 2,500km ridden. Perfect for endurance riding.",
		Price:         4500,
		Category:      "cat_bikes",
		Location:      "Christchurch",
		ImageFilename: "road_bike_trek_1767609436041.png",
		CategoryFields: map[string]interface{}{
			"brand": "Trek", "model": "Domane SL5", "type": "Road Bike",
			"frameSize": "56cm", "material": "Carbon Fiber", "condition": "Excellent",
		},
	},
	{
		Title:         "4-Person Camping Tent - Waterproof, Easy Setup",
		Description:   "Quality 4-person dome tent perfect for family camping. Waterproof rating of 3000mm, keeps you dry in heavy rain. Quick setup in under 5 minutes with color-coded poles. Two doors with mesh windows for ventilation. Used only twice.",
		Price:         189,
		Category:      "cat_camping",
		Location:      "Tauranga",
		ImageFilename: "camping_tent_1767609499995.png",
		CategoryFields: map[string]interface{}{
			"brand": "Outdoor Master", "capacity": "4 Person", "type": "Dome Tent",
			"waterproof": true, "condition": "Like New", "seasonRated": "3 Season",
		},
	},
	// Musical Instruments
	{
		Title:         "Vintage Yamaha FG-180 Acoustic Guitar - Sunburst",
		Description:   "Classic 1970s Yamaha FG-180 acoustic guitar in beautiful sunburst finish. The legendary 'red label' model known for its warm, rich tone. Solid spruce top with mahogany back and sides. Includes hardshell case.",
		Price:         750,
		Category:      "Musical Instruments",
		Location:      "Auckland",
		ImageFilename: "vintage_guitar_1767609482875.png",
		CategoryFields: map[string]interface{}{
			"brand": "Yamaha", "model": "FG-180", "type": "Acoustic Guitar",
			"year": 1975, "finish": "Sunburst", "condition": "Good - Vintage",
		},
	},
}

// EmbeddingRequest for Gemini API
type EmbeddingRequest struct {
	Model                string `json:"model"`
	OutputDimensionality int    `json:"outputDimensionality,omitempty"`
	Content              struct {
		Parts []struct {
			Text string `json:"text"`
		} `json:"parts"`
	} `json:"content"`
}

// EmbeddingResponse from Gemini API
type EmbeddingResponse struct {
	Embedding struct {
		Values []float32 `json:"values"`
	} `json:"embedding"`
}

func main() {
	ctx := context.Background()

	// Database connection
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "postgres://postgres:postgres@localhost:5432/justsell?sslmode=disable"
	}

	conn, err := pgx.Connect(ctx, connStr)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer conn.Close(ctx)
	log.Println("✓ Connected to database")

	// Get Gemini API key for embeddings
	geminiAPIKey := os.Getenv("GEMINI_API_KEY")
	if geminiAPIKey == "" {
		log.Println("⚠ GEMINI_API_KEY not set - embeddings will not be generated")
	}

	for i, listing := range sampleListings {
		log.Printf("Creating listing %d/%d: %s", i+1, len(sampleListings), listing.Title)

		// Convert category fields to JSON
		categoryFieldsJSON, err := json.Marshal(listing.CategoryFields)
		if err != nil {
			log.Printf("Error marshaling category fields: %v", err)
			continue
		}

		// Insert listing
		var listingID int
		userID := "26f0cf95-d5e3-4190-a8a5-778f488b2e8b" // Use existing user
		err = conn.QueryRow(ctx, `
			INSERT INTO listings (user_id, title, description, price, category, location, category_fields, status, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), NOW())
			RETURNING id
		`, userID, listing.Title, listing.Description, listing.Price, listing.Category, listing.Location, categoryFieldsJSON).Scan(&listingID)

		if err != nil {
			log.Printf("Error inserting listing: %v", err)
			continue
		}
		log.Printf("  ✓ Created listing ID: %d", listingID)

		// Insert image reference
		imageURL := "/uploads/" + listing.ImageFilename
		_, err = conn.Exec(ctx, `
			INSERT INTO listing_images (listing_id, url, filename, display_order, created_at)
			VALUES ($1, $2, $3, 0, NOW())
		`, listingID, imageURL, listing.ImageFilename)

		if err != nil {
			log.Printf("  ⚠ Error inserting image: %v", err)
		} else {
			log.Printf("  ✓ Added image: %s", listing.ImageFilename)
		}

		// Generate embedding if API key is available
		if geminiAPIKey != "" {
			embedding, err := generateEmbedding(geminiAPIKey, listing.Title, listing.Description)
			if err != nil {
				log.Printf("  ⚠ Error generating embedding: %v", err)
			} else {
				// Store embedding using pgvector
				vec := pgvector.NewVector(embedding)
				_, err = conn.Exec(ctx, `UPDATE listings SET embedding = $1, embedding_model = $2 WHERE id = $3`, vec, "models/gemini-embedding-001", listingID)
				if err != nil {
					log.Printf("  ⚠ Error storing embedding: %v", err)
				} else {
					log.Printf("  ✓ Generated and stored embedding (%d dimensions)", len(embedding))
				}
			}
			// Rate limit to avoid API quota issues
			time.Sleep(500 * time.Millisecond)
		}

		log.Println()
	}

	log.Printf("✓ Seed complete! Created %d listings", len(sampleListings))
}

func generateEmbedding(apiKey, title, description string) ([]float32, error) {
	text := fmt.Sprintf("%s. %s", title, description)

	reqBody := EmbeddingRequest{
		Model:                "models/gemini-embedding-001",
		OutputDimensionality: 768,
	}
	reqBody.Content.Parts = []struct {
		Text string `json:"text"`
	}{{Text: text}}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=%s", apiKey)
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	var embResp EmbeddingResponse
	if err := json.NewDecoder(resp.Body).Decode(&embResp); err != nil {
		return nil, err
	}

	if len(embResp.Embedding.Values) == 0 {
		return nil, fmt.Errorf("no embedding returned")
	}

	return embResp.Embedding.Values, nil
}
