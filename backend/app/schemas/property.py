"""
Pydantic schemas for Property API.
"""

from datetime import date, datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field


# ===== REQUEST SCHEMAS =====

class PropertyCreate(BaseModel):
    """Schema for creating a property record."""
    # Location
    state_code: str = Field(..., min_length=2, max_length=2, description="State code (e.g., TN)")
    county_name: str = Field(..., min_length=1, description="County name")

    # Address
    address: Optional[str] = None
    address_normalized: Optional[str] = None
    street_number: Optional[str] = None
    street_name: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    subdivision: Optional[str] = None

    # Parcel identifiers
    parcel_id: Optional[str] = None
    gis_link: Optional[str] = None
    control_map: Optional[str] = None
    group_code: Optional[str] = None
    parcel_number: Optional[str] = None

    # Geo
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None

    # Building details
    year_built: Optional[int] = Field(None, ge=1700, le=2100)
    foundation_type: Optional[str] = None
    square_footage: Optional[int] = Field(None, ge=0)
    square_footage_finished: Optional[int] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0, le=50)
    bathrooms: Optional[float] = Field(None, ge=0, le=50)
    stories: Optional[int] = Field(None, ge=0, le=20)
    construction_type: Optional[str] = None
    roof_type: Optional[str] = None
    heating_cooling: Optional[str] = None

    # Lot details
    lot_size_sqft: Optional[int] = Field(None, ge=0)
    lot_size_acres: Optional[float] = Field(None, ge=0)
    calculated_acres: Optional[float] = Field(None, ge=0)

    # Assessment data
    assessed_value: Optional[int] = Field(None, ge=0)
    assessed_land: Optional[int] = Field(None, ge=0)
    assessed_improvement: Optional[int] = Field(None, ge=0)
    market_value: Optional[int] = Field(None, ge=0)
    market_land: Optional[int] = Field(None, ge=0)
    market_improvement: Optional[int] = Field(None, ge=0)
    last_assessed_date: Optional[date] = None

    # Property classification
    property_type_code: Optional[str] = None
    property_type: Optional[str] = None
    parcel_type: Optional[str] = None
    land_use_code: Optional[str] = None
    zoning: Optional[str] = None

    # Owner info
    owner_name: Optional[str] = None
    owner_name_2: Optional[str] = None
    owner_mailing_address: Optional[str] = None
    owner_city: Optional[str] = None
    owner_state: Optional[str] = None
    owner_zip: Optional[str] = None

    # Transfer info
    last_sale_date: Optional[date] = None
    last_sale_price: Optional[int] = Field(None, ge=0)
    deed_book: Optional[str] = None
    deed_page: Optional[str] = None

    # Source tracking
    source_portal_code: Optional[str] = None
    arcgis_object_id: Optional[int] = None
    scraped_at: Optional[datetime] = None


class BatchPropertyRequest(BaseModel):
    """Request for batch property ingestion."""
    properties: List[PropertyCreate]
    source_portal_code: str = "williamson_arcgis"


# ===== RESPONSE SCHEMAS =====

class PropertyResponse(BaseModel):
    """Full property response."""
    id: UUID
    state_id: int
    county_id: Optional[int] = None

    # Address
    address: Optional[str] = None
    address_normalized: Optional[str] = None
    street_number: Optional[str] = None
    street_name: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    subdivision: Optional[str] = None

    # Parcel
    parcel_id: Optional[str] = None
    gis_link: Optional[str] = None

    # Geo
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    centroid_lat: Optional[float] = None
    centroid_lon: Optional[float] = None

    # Building
    year_built: Optional[int] = None
    foundation_type: Optional[str] = None
    square_footage: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    stories: Optional[int] = None
    construction_type: Optional[str] = None

    # Lot
    lot_size_acres: Optional[float] = None
    calculated_acres: Optional[float] = None

    # Assessment
    assessed_value: Optional[int] = None
    market_value: Optional[int] = None

    # Type
    property_type: Optional[str] = None

    # Owner
    owner_name: Optional[str] = None
    owner_name_2: Optional[str] = None

    # Transfer
    last_sale_date: Optional[date] = None
    last_sale_price: Optional[int] = None

    # Metadata
    data_quality_score: Optional[int] = None
    has_building_details: bool = False
    source_portal_code: Optional[str] = None
    scraped_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Relationships
    state_code: Optional[str] = None
    county_name: Optional[str] = None
    permit_count: int = 0

    class Config:
        from_attributes = True


class PropertySummary(BaseModel):
    """Brief property summary for lists."""
    id: UUID
    address: Optional[str] = None
    city: Optional[str] = None
    parcel_id: Optional[str] = None
    owner_name: Optional[str] = None
    year_built: Optional[int] = None
    square_footage: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    market_value: Optional[int] = None
    lot_size_acres: Optional[float] = None
    property_type: Optional[str] = None
    permit_count: int = 0

    class Config:
        from_attributes = True


class PropertySearchResponse(BaseModel):
    """Paginated property search results."""
    total: int
    page: int
    page_size: int
    total_pages: int
    results: List[PropertySummary]


class BatchPropertyResponse(BaseModel):
    """Response from batch property ingestion."""
    inserted: int
    updated: int
    skipped: int
    errors: int
    processing_time_seconds: float
    error_details: Optional[List[dict]] = None


class PropertyStatsResponse(BaseModel):
    """Property statistics."""
    total_properties: int
    total_with_building_details: int
    total_linked_permits: int
    by_property_type: dict
    by_city: dict
    avg_market_value: Optional[float] = None
    avg_year_built: Optional[float] = None
    avg_square_footage: Optional[float] = None
