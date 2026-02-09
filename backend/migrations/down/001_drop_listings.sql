-- Drop trigger
DROP TRIGGER IF EXISTS update_listings_updated_at ON listings;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_listings_status;
DROP INDEX IF EXISTS idx_listings_year;
DROP INDEX IF EXISTS idx_listings_price;
DROP INDEX IF EXISTS idx_listings_location;
DROP INDEX IF EXISTS idx_listings_category;
DROP INDEX IF EXISTS idx_listings_search;

-- Drop table
DROP TABLE IF EXISTS listings;
