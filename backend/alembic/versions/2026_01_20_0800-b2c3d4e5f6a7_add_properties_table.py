"""Add properties table for property data enrichment

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-01-20 08:00:00.000000

This migration creates:
- properties: Property records with assessment data, building specs, owner info
- Links to septic_permits via property_id FK

Property data sources:
- Williamson County ArcGIS REST API (primary)
- INIGO Property Assessor portal (building details)
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema - create properties table."""

    # ===== CREATE PROPERTIES TABLE =====
    op.create_table(
        'properties',
        # Primary key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),

        # Location references
        sa.Column('state_id', sa.Integer, nullable=False),
        sa.Column('county_id', sa.Integer, nullable=True),

        # Address (for matching to permits)
        sa.Column('address', sa.Text, nullable=True),  # Original address
        sa.Column('address_normalized', sa.Text, nullable=True),  # Normalized for matching
        sa.Column('address_hash', sa.String(64), nullable=True),  # SHA256 for deduplication
        sa.Column('street_number', sa.String(20), nullable=True),
        sa.Column('street_name', sa.String(200), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('zip_code', sa.String(20), nullable=True),
        sa.Column('subdivision', sa.String(200), nullable=True),

        # Parcel identifiers
        sa.Column('parcel_id', sa.String(100), nullable=True),  # County parcel ID
        sa.Column('gis_link', sa.String(100), nullable=True),  # GIS reference
        sa.Column('control_map', sa.String(20), nullable=True),  # TN parcel: control map
        sa.Column('group_code', sa.String(10), nullable=True),  # TN parcel: group
        sa.Column('parcel_number', sa.String(20), nullable=True),  # TN parcel: parcel number

        # Geo coordinates
        sa.Column('latitude', sa.Float, nullable=True),
        sa.Column('longitude', sa.Float, nullable=True),
        sa.Column('centroid_lat', sa.Float, nullable=True),  # Parcel centroid
        sa.Column('centroid_lon', sa.Float, nullable=True),

        # Building details (from INIGO/assessor)
        sa.Column('year_built', sa.SmallInteger, nullable=True),
        sa.Column('foundation_type', sa.String(50), nullable=True),  # slab, crawl, basement, pier_beam
        sa.Column('square_footage', sa.Integer, nullable=True),
        sa.Column('square_footage_finished', sa.Integer, nullable=True),
        sa.Column('bedrooms', sa.SmallInteger, nullable=True),
        sa.Column('bathrooms', sa.Float, nullable=True),  # 2.5 bathrooms
        sa.Column('stories', sa.SmallInteger, nullable=True),
        sa.Column('construction_type', sa.String(100), nullable=True),  # frame, brick, etc
        sa.Column('roof_type', sa.String(100), nullable=True),
        sa.Column('heating_cooling', sa.String(100), nullable=True),

        # Lot details (from ArcGIS)
        sa.Column('lot_size_sqft', sa.Integer, nullable=True),
        sa.Column('lot_size_acres', sa.Float, nullable=True),
        sa.Column('calculated_acres', sa.Float, nullable=True),

        # Assessment data (from ArcGIS)
        sa.Column('assessed_value', sa.Integer, nullable=True),  # Total assessed
        sa.Column('assessed_land', sa.Integer, nullable=True),
        sa.Column('assessed_improvement', sa.Integer, nullable=True),
        sa.Column('market_value', sa.Integer, nullable=True),  # Total market
        sa.Column('market_land', sa.Integer, nullable=True),
        sa.Column('market_improvement', sa.Integer, nullable=True),
        sa.Column('last_assessed_date', sa.Date, nullable=True),

        # Property classification
        sa.Column('property_type_code', sa.String(10), nullable=True),  # Raw code
        sa.Column('property_type', sa.String(100), nullable=True),  # single_family, mobile_home, etc
        sa.Column('parcel_type', sa.String(50), nullable=True),
        sa.Column('land_use_code', sa.String(20), nullable=True),
        sa.Column('zoning', sa.String(50), nullable=True),

        # Owner info (from ArcGIS)
        sa.Column('owner_name', sa.String(255), nullable=True),
        sa.Column('owner_name_2', sa.String(255), nullable=True),
        sa.Column('owner_mailing_address', sa.Text, nullable=True),
        sa.Column('owner_city', sa.String(100), nullable=True),
        sa.Column('owner_state', sa.String(2), nullable=True),
        sa.Column('owner_zip', sa.String(20), nullable=True),

        # Transfer/deed info
        sa.Column('last_sale_date', sa.Date, nullable=True),
        sa.Column('last_sale_price', sa.Integer, nullable=True),
        sa.Column('deed_book', sa.String(50), nullable=True),
        sa.Column('deed_page', sa.String(50), nullable=True),

        # Source tracking
        sa.Column('source_portal_code', sa.String(100), nullable=True),  # 'williamson_arcgis', 'williamson_inigo'
        sa.Column('arcgis_object_id', sa.Integer, nullable=True),  # ArcGIS OBJECTID
        sa.Column('scraped_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('building_details_scraped_at', sa.DateTime(timezone=True), nullable=True),

        # Raw data storage
        sa.Column('raw_arcgis_data', postgresql.JSON, nullable=True),
        sa.Column('raw_inigo_data', postgresql.JSON, nullable=True),

        # Data quality
        sa.Column('data_quality_score', sa.SmallInteger, nullable=True),  # 0-100
        sa.Column('has_building_details', sa.Boolean, default=False, nullable=False),
        sa.Column('geocoded', sa.Boolean, default=False, nullable=False),

        # Record status
        sa.Column('is_active', sa.Boolean, default=True, nullable=False),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),

        # Foreign keys
        sa.ForeignKeyConstraint(['state_id'], ['states.id'], name='fk_properties_state_id'),
        sa.ForeignKeyConstraint(['county_id'], ['counties.id'], name='fk_properties_county_id')
    )

    # ===== CREATE INDEXES =====
    # Primary lookup indexes
    op.create_index('idx_properties_address_hash', 'properties', ['address_hash'])
    op.create_index('idx_properties_parcel_id', 'properties', ['parcel_id'])
    op.create_index('idx_properties_gis_link', 'properties', ['gis_link'])
    op.create_index('idx_properties_state_county', 'properties', ['state_id', 'county_id'])

    # Address search
    op.create_index('idx_properties_city', 'properties', ['city'])
    op.create_index('idx_properties_zip', 'properties', ['zip_code'])
    op.create_index('idx_properties_subdivision', 'properties', ['subdivision'])

    # Filter indexes
    op.create_index('idx_properties_year_built', 'properties', ['year_built'])
    op.create_index('idx_properties_property_type', 'properties', ['property_type'])
    op.create_index('idx_properties_bedrooms', 'properties', ['bedrooms'])

    # Owner lookup
    op.create_index('idx_properties_owner', 'properties', ['owner_name'])

    # Unique constraint on address hash + county
    op.execute("""
        CREATE UNIQUE INDEX idx_properties_dedup_address
        ON properties(address_hash, county_id)
        WHERE address_hash IS NOT NULL AND is_active = TRUE
    """)

    # Trigram index for fuzzy address search
    op.execute("""
        CREATE INDEX idx_properties_address_trgm
        ON properties USING gin(address_normalized gin_trgm_ops)
        WHERE address_normalized IS NOT NULL
    """)

    # ===== ADD PROPERTY_ID TO SEPTIC_PERMITS =====
    op.add_column(
        'septic_permits',
        sa.Column('property_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_septic_permits_property_id',
        'septic_permits',
        'properties',
        ['property_id'],
        ['id']
    )
    op.create_index('idx_septic_permits_property_id', 'septic_permits', ['property_id'])


def downgrade() -> None:
    """Downgrade schema - drop properties table."""
    # Remove property_id from septic_permits first
    op.drop_index('idx_septic_permits_property_id', 'septic_permits')
    op.drop_constraint('fk_septic_permits_property_id', 'septic_permits', type_='foreignkey')
    op.drop_column('septic_permits', 'property_id')

    # Drop properties table
    op.drop_table('properties')
