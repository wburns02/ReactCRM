-- Migration: Add properties table for property data enrichment
-- Revision ID: b2c3d4e5f6a7

-- ===== CREATE PROPERTIES TABLE =====
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY NOT NULL,
    state_id INTEGER NOT NULL,
    county_id INTEGER,
    address TEXT,
    address_normalized TEXT,
    address_hash VARCHAR(64),
    street_number VARCHAR(20),
    street_name VARCHAR(200),
    city VARCHAR(100),
    zip_code VARCHAR(20),
    subdivision VARCHAR(200),
    parcel_id VARCHAR(100),
    gis_link VARCHAR(100),
    control_map VARCHAR(20),
    group_code VARCHAR(10),
    parcel_number VARCHAR(20),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    centroid_lat DOUBLE PRECISION,
    centroid_lon DOUBLE PRECISION,
    year_built SMALLINT,
    foundation_type VARCHAR(50),
    square_footage INTEGER,
    square_footage_finished INTEGER,
    bedrooms SMALLINT,
    bathrooms DOUBLE PRECISION,
    stories SMALLINT,
    construction_type VARCHAR(100),
    roof_type VARCHAR(100),
    heating_cooling VARCHAR(100),
    lot_size_sqft INTEGER,
    lot_size_acres DOUBLE PRECISION,
    calculated_acres DOUBLE PRECISION,
    assessed_value INTEGER,
    assessed_land INTEGER,
    assessed_improvement INTEGER,
    market_value INTEGER,
    market_land INTEGER,
    market_improvement INTEGER,
    last_assessed_date DATE,
    property_type_code VARCHAR(10),
    property_type VARCHAR(100),
    parcel_type VARCHAR(50),
    land_use_code VARCHAR(20),
    zoning VARCHAR(50),
    owner_name VARCHAR(255),
    owner_name_2 VARCHAR(255),
    owner_mailing_address TEXT,
    owner_city VARCHAR(100),
    owner_state VARCHAR(2),
    owner_zip VARCHAR(20),
    last_sale_date DATE,
    last_sale_price INTEGER,
    deed_book VARCHAR(50),
    deed_page VARCHAR(50),
    source_portal_code VARCHAR(100),
    arcgis_object_id INTEGER,
    scraped_at TIMESTAMP WITH TIME ZONE,
    building_details_scraped_at TIMESTAMP WITH TIME ZONE,
    raw_arcgis_data JSON,
    raw_inigo_data JSON,
    data_quality_score SMALLINT,
    has_building_details BOOLEAN NOT NULL DEFAULT FALSE,
    geocoded BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_properties_state_id FOREIGN KEY (state_id) REFERENCES states(id),
    CONSTRAINT fk_properties_county_id FOREIGN KEY (county_id) REFERENCES counties(id)
);

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_properties_address_hash ON properties(address_hash);
CREATE INDEX IF NOT EXISTS idx_properties_parcel_id ON properties(parcel_id);
CREATE INDEX IF NOT EXISTS idx_properties_gis_link ON properties(gis_link);
CREATE INDEX IF NOT EXISTS idx_properties_state_county ON properties(state_id, county_id);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_zip ON properties(zip_code);
CREATE INDEX IF NOT EXISTS idx_properties_subdivision ON properties(subdivision);
CREATE INDEX IF NOT EXISTS idx_properties_year_built ON properties(year_built);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_name);

-- Unique constraint on address hash + county
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_dedup_address
ON properties(address_hash, county_id)
WHERE address_hash IS NOT NULL AND is_active = TRUE;

-- Trigram index for fuzzy address search (requires pg_trgm extension)
CREATE INDEX IF NOT EXISTS idx_properties_address_trgm
ON properties USING gin(address_normalized gin_trgm_ops)
WHERE address_normalized IS NOT NULL;

-- ===== ADD PROPERTY_ID TO SEPTIC_PERMITS =====
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'septic_permits' AND column_name = 'property_id'
    ) THEN
        ALTER TABLE septic_permits ADD COLUMN property_id UUID;
    END IF;
END $$;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_septic_permits_property_id'
    ) THEN
        ALTER TABLE septic_permits
        ADD CONSTRAINT fk_septic_permits_property_id
        FOREIGN KEY (property_id) REFERENCES properties(id);
    END IF;
END $$;

-- Create index for property_id
CREATE INDEX IF NOT EXISTS idx_septic_permits_property_id ON septic_permits(property_id);

-- Record the migration in alembic_version
INSERT INTO alembic_version (version_num)
SELECT 'b2c3d4e5f6a7'
WHERE NOT EXISTS (SELECT 1 FROM alembic_version WHERE version_num = 'b2c3d4e5f6a7');
