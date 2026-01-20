"""
Database model for Property records.

Stores property assessment data, building details, and owner information.
Links to septic_permits (one property → many permits over time).
"""

import uuid
import hashlib
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Column, DateTime, Date, Float, Integer, SmallInteger,
    String, Text, JSON, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database.base_class import Base


class Property(Base):
    """
    Property records with assessment data and building details.

    Data sources:
    - Williamson County ArcGIS REST API (parcels, assessment values)
    - INIGO Property Assessor portal (building details via Playwright)
    """
    __tablename__ = "properties"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Location references
    state_id = Column(Integer, ForeignKey("states.id"), nullable=False, index=True)
    county_id = Column(Integer, ForeignKey("counties.id"), nullable=True, index=True)

    # Address (for matching to permits)
    address = Column(Text, nullable=True)  # Original address
    address_normalized = Column(Text, nullable=True)  # Normalized for matching
    address_hash = Column(String(64), nullable=True, index=True)  # SHA256 for deduplication
    street_number = Column(String(20), nullable=True)
    street_name = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True, index=True)
    zip_code = Column(String(20), nullable=True, index=True)
    subdivision = Column(String(200), nullable=True, index=True)

    # Parcel identifiers
    parcel_id = Column(String(100), nullable=True, index=True)  # County parcel ID
    gis_link = Column(String(100), nullable=True, index=True)  # GIS reference
    control_map = Column(String(20), nullable=True)  # TN parcel: control map
    group_code = Column(String(10), nullable=True)  # TN parcel: group
    parcel_number = Column(String(20), nullable=True)  # TN parcel: parcel number

    # Geo coordinates
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    centroid_lat = Column(Float, nullable=True)  # Parcel centroid
    centroid_lon = Column(Float, nullable=True)

    # Building details (from INIGO/assessor)
    year_built = Column(SmallInteger, nullable=True)
    foundation_type = Column(String(50), nullable=True)  # slab, crawl, basement, pier_beam
    square_footage = Column(Integer, nullable=True)
    square_footage_finished = Column(Integer, nullable=True)
    bedrooms = Column(SmallInteger, nullable=True)
    bathrooms = Column(Float, nullable=True)  # 2.5 bathrooms
    stories = Column(SmallInteger, nullable=True)
    construction_type = Column(String(100), nullable=True)  # frame, brick, etc
    roof_type = Column(String(100), nullable=True)
    heating_cooling = Column(String(100), nullable=True)

    # Lot details (from ArcGIS)
    lot_size_sqft = Column(Integer, nullable=True)
    lot_size_acres = Column(Float, nullable=True)
    calculated_acres = Column(Float, nullable=True)

    # Assessment data (from ArcGIS)
    assessed_value = Column(Integer, nullable=True)  # Total assessed
    assessed_land = Column(Integer, nullable=True)
    assessed_improvement = Column(Integer, nullable=True)
    market_value = Column(Integer, nullable=True)  # Total market
    market_land = Column(Integer, nullable=True)
    market_improvement = Column(Integer, nullable=True)
    last_assessed_date = Column(Date, nullable=True)

    # Property classification
    property_type_code = Column(String(10), nullable=True)  # Raw code
    property_type = Column(String(100), nullable=True)  # single_family, mobile_home, etc
    parcel_type = Column(String(50), nullable=True)
    land_use_code = Column(String(20), nullable=True)
    zoning = Column(String(50), nullable=True)

    # Owner info (from ArcGIS)
    owner_name = Column(String(255), nullable=True, index=True)
    owner_name_2 = Column(String(255), nullable=True)
    owner_mailing_address = Column(Text, nullable=True)
    owner_city = Column(String(100), nullable=True)
    owner_state = Column(String(2), nullable=True)
    owner_zip = Column(String(20), nullable=True)

    # Transfer/deed info
    last_sale_date = Column(Date, nullable=True)
    last_sale_price = Column(Integer, nullable=True)
    deed_book = Column(String(50), nullable=True)
    deed_page = Column(String(50), nullable=True)

    # Source tracking
    source_portal_code = Column(String(100), nullable=True)  # 'williamson_arcgis', 'williamson_inigo'
    arcgis_object_id = Column(Integer, nullable=True)  # ArcGIS OBJECTID
    scraped_at = Column(DateTime(timezone=True), nullable=True)
    building_details_scraped_at = Column(DateTime(timezone=True), nullable=True)

    # Raw data storage
    raw_arcgis_data = Column(JSON, nullable=True)
    raw_inigo_data = Column(JSON, nullable=True)

    # Data quality
    data_quality_score = Column(SmallInteger, nullable=True)  # 0-100
    has_building_details = Column(Boolean, default=False, nullable=False)
    geocoded = Column(Boolean, default=False, nullable=False)

    # Record status
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    state = relationship("State")
    county = relationship("County")
    permits = relationship("SepticPermit", back_populates="property")

    __table_args__ = (
        Index('idx_properties_state_county', 'state_id', 'county_id'),
    )

    def __repr__(self):
        return f"<Property(id={self.id}, address={self.address}, parcel={self.parcel_id})>"

    @staticmethod
    def normalize_address(address: str) -> Optional[str]:
        """
        Normalize address for matching.
        Uppercase, remove extra spaces, standardize abbreviations.
        """
        if not address:
            return None

        import re

        # Uppercase
        normalized = address.upper().strip()

        # Remove multiple spaces
        normalized = re.sub(r'\s+', ' ', normalized)

        # Standardize common abbreviations
        replacements = {
            r'\bSTREET\b': 'ST',
            r'\bROAD\b': 'RD',
            r'\bDRIVE\b': 'DR',
            r'\bAVENUE\b': 'AVE',
            r'\bBOULEVARD\b': 'BLVD',
            r'\bLANE\b': 'LN',
            r'\bCOURT\b': 'CT',
            r'\bCIRCLE\b': 'CIR',
            r'\bPLACE\b': 'PL',
            r'\bTERRACE\b': 'TER',
            r'\bNORTH\b': 'N',
            r'\bSOUTH\b': 'S',
            r'\bEAST\b': 'E',
            r'\bWEST\b': 'W',
            r'\bAPARTMENT\b': 'APT',
            r'\bSUITE\b': 'STE',
            r'\bUNIT\b': 'UNIT',
            r'\bHOLLOW\b': 'HOLW',
        }

        for pattern, replacement in replacements.items():
            normalized = re.sub(pattern, replacement, normalized)

        return normalized

    @staticmethod
    def compute_address_hash(
        normalized_address: Optional[str],
        county_name: Optional[str],
        state_code: Optional[str]
    ) -> Optional[str]:
        """
        Compute SHA256 hash of normalized address + county + state.
        Used for deduplication unique constraint.
        """
        if not normalized_address:
            return None

        components = [
            normalized_address or '',
            (county_name or '').upper(),
            (state_code or '').upper()
        ]
        composite_key = '|'.join(components)
        return hashlib.sha256(composite_key.encode('utf-8')).hexdigest()

    def calculate_quality_score(self) -> int:
        """
        Calculate data quality score (0-100) based on completeness.
        """
        score = 0
        max_score = 100

        # Core fields (40 points)
        if self.address:
            score += 10
        if self.parcel_id:
            score += 10
        if self.owner_name:
            score += 10
        if self.city:
            score += 5
        if self.zip_code:
            score += 5

        # Assessment data (20 points)
        if self.assessed_value:
            score += 10
        if self.market_value:
            score += 10

        # Lot details (10 points)
        if self.lot_size_acres or self.lot_size_sqft:
            score += 10

        # Building details (30 points)
        if self.year_built:
            score += 10
        if self.square_footage:
            score += 10
        if self.bedrooms:
            score += 5
        if self.bathrooms:
            score += 5

        self.data_quality_score = min(score, max_score)
        return self.data_quality_score
