-- Include location text in search_vector so natural-language queries with
-- location terms (for example "in Auckland") remain searchable in keyword rank.
-- This replaces the previous generated expression.

DROP INDEX IF EXISTS idx_listings_search;

ALTER TABLE listings DROP COLUMN IF EXISTS search_vector;

ALTER TABLE listings
ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
	setweight(
		to_tsvector(
			'english',
			COALESCE(title, '') || ' ' ||
			COALESCE(category_fields->>'make', '') || ' ' ||
			COALESCE(category_fields->>'model', '')
		),
		'A'
	) ||
	setweight(
		to_tsvector(
			'english',
			COALESCE(description, '') || ' ' ||
			COALESCE(location, '') || ' ' ||
			replace(regexp_replace(COALESCE(category, ''), '^cat_', ''), '_', ' ')
		),
		'B'
	) ||
	setweight(
		to_tsvector(
			'english',
			COALESCE(category_fields->>'storage', '') || ' ' ||
			COALESCE(category_fields->>'color', '') || ' ' ||
			COALESCE(category_fields->>'condition', '') || ' ' ||
			CASE
				WHEN category = 'cat_phones' THEN 'phone smartphone mobile cell device ios iphone'
				ELSE ''
			END
		),
		'C'
	)
) STORED;

CREATE INDEX IF NOT EXISTS idx_listings_search ON listings USING GIN(search_vector);
