"""
Property data service for ingestion and search.
"""

import logging
import hashlib
import re
import uuid
from datetime import datetime, timezone
from time import time
from typing import List, Optional, Dict, Any, Tuple

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from app.models.property import Property
from app.models.septic_permit import State, County, SepticPermit
from app.schemas.property import (
    PropertyCreate, PropertyResponse, PropertySummary,
    PropertySearchResponse, BatchPropertyResponse, PropertyStatsResponse
)

logger = logging.getLogger(__name__)


class PropertyService:
    """Service for property data operations."""

    def __init__(self, db: Session):
        self.db = db
        self._state_cache: Dict[str, int] = {}
        self._county_cache: Dict[Tuple[int, str], int] = {}

    def _get_or_create_state(self, state_code: str) -> int:
        """Get state ID from cache or database."""
        state_code = state_code.upper()

        if state_code in self._state_cache:
            return self._state_cache[state_code]

        state = self.db.query(State).filter(State.code == state_code).first()
        if state:
            self._state_cache[state_code] = state.id
            return state.id

        # State should exist from migration - log warning
        logger.warning(f"State not found: {state_code}")
        return None

    def _get_or_create_county(self, state_id: int, county_name: str) -> int:
        """Get or create county, with caching."""
        normalized_name = county_name.upper().strip()
        normalized_name = re.sub(r'\s*COUNTY\s*$', '', normalized_name, flags=re.IGNORECASE)

        cache_key = (state_id, normalized_name)
        if cache_key in self._county_cache:
            return self._county_cache[cache_key]

        county = self.db.query(County).filter(
            County.state_id == state_id,
            County.normalized_name == normalized_name
        ).first()

        if county:
            self._county_cache[cache_key] = county.id
            return county.id

        # Create new county
        county = County(
            state_id=state_id,
            name=county_name.strip().title(),
            normalized_name=normalized_name
        )
        self.db.add(county)
        self.db.flush()

        self._county_cache[cache_key] = county.id
        return county.id

    @staticmethod
    def normalize_address(address: Optional[str]) -> Optional[str]:
        """Normalize address for matching."""
        if not address:
            return None

        normalized = address.upper().strip()
        normalized = re.sub(r'\s+', ' ', normalized)

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
            r'\bHOLLOW\b': 'HOLW',
        }

        for pattern, replacement in replacements.items():
            normalized = re.sub(pattern, replacement, normalized)

        return normalized

    @staticmethod
    def normalize_address_enhanced(address: Optional[str]) -> Optional[str]:
        """
        Enhanced address normalization that strips city/state/zip suffixes.

        This handles permit addresses that include location info like:
        - "1000 Mabel DR, Franklin, TN, 37064" -> "1000 MABEL DR"
        - "9001 Haggard Ln, College Grove, TN 37046" -> "9001 HAGGARD LN"
        - "2034 Riley Park Drive, Thompsons Station, TN 37179" -> "2034 RILEY PARK DR"
        """
        if not address:
            return None

        normalized = address.upper().strip()

        # Common Tennessee cities to strip (add more as needed)
        tn_cities = [
            'FRANKLIN', 'NASHVILLE', 'BRENTWOOD', 'NOLENSVILLE', 'SPRING HILL',
            'COLLEGE GROVE', 'THOMPSONS STATION', 'FAIRVIEW', 'ARRINGTON',
            'LEIPER\'S FORK', 'LEIPERS FORK', 'BETHESDA', 'EAGLEVILLE'
        ]

        # Remove state codes and zip codes
        # Pattern: ", TN 37XXX" or ", TN, 37XXX" or "TN 37XXX"
        normalized = re.sub(r',?\s*TN\s*,?\s*3[0-9]{4}\s*$', '', normalized)

        # Remove standalone state code at end
        normalized = re.sub(r',?\s*TN\s*$', '', normalized)

        # Remove city names (with optional preceding comma)
        for city in tn_cities:
            normalized = re.sub(rf',?\s*{city}\s*$', '', normalized, flags=re.IGNORECASE)

        # Remove trailing commas
        normalized = re.sub(r',\s*$', '', normalized)

        # Remove parenthetical notes like (Lot 123), (Westhaven Jewell Lot 2504)
        # But keep the main address
        normalized = re.sub(r'\s*\([^)]*\)\s*$', '', normalized)

        # Remove pipe-separated suffixes like "| Franklin, TN 37064"
        normalized = re.sub(r'\s*\|.*$', '', normalized)

        # Now apply standard normalization
        normalized = re.sub(r'\s+', ' ', normalized).strip()

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
            r'\bHOLLOW\b': 'HOLW',
            r'\bCOVE\b': 'CV',
            r'\bHILLS?\b': 'HL',
            r'\bCREEK\b': 'CRK',
            r'\bSPRINGS?\b': 'SPG',
            r'\bMOUNTAIN\b': 'MTN',
            r'\bVALLEY\b': 'VLY',
            r'\bRIDGE\b': 'RDG',
            r'\bHAVEN\b': 'HVN',
            r'\bVIEW\b': 'VW',
            r'\bPARKWAY\b': 'PKWY',
            r'\bHIGHWAY\b': 'HWY',
            r'\bPINE\b': 'PNE',
            r'\bLAKE\b': 'LK',
            r'\bGROVE\b': 'GRV',
            r'\bSTATION\b': 'STA',
            r'\bTRACE\b': 'TRCE',
        }

        for pattern, replacement in replacements.items():
            normalized = re.sub(pattern, replacement, normalized)

        return normalized.strip()

    @staticmethod
    def compute_address_hash(address_normalized: str, county_name: str, state_code: str) -> str:
        """Compute SHA256 hash for deduplication."""
        composite = f"{address_normalized or ''}|{county_name.upper()}|{state_code.upper()}"
        return hashlib.sha256(composite.encode()).hexdigest()

    def ingest_batch(
        self,
        properties: List[PropertyCreate],
        source_portal_code: str
    ) -> BatchPropertyResponse:
        """
        Ingest a batch of properties.

        - Normalizes addresses
        - Deduplicates by address hash
        - Updates existing records if newer
        - Links to permits with matching addresses
        """
        start_time = time()
        inserted = 0
        updated = 0
        skipped = 0
        errors = 0
        error_details = []

        for i, prop_data in enumerate(properties):
            try:
                result = self._ingest_single(prop_data, source_portal_code)
                if result == 'inserted':
                    inserted += 1
                elif result == 'updated':
                    updated += 1
                else:
                    skipped += 1

                # Commit in batches
                if (i + 1) % 100 == 0:
                    self.db.commit()
                    logger.info(f"Processed {i + 1}/{len(properties)}")

            except Exception as e:
                errors += 1
                error_details.append({
                    "index": i,
                    "address": prop_data.address,
                    "error": str(e)
                })
                logger.error(f"Error processing property {i}: {e}")

        # Final commit
        self.db.commit()

        processing_time = time() - start_time
        logger.info(
            f"Batch complete: {inserted} inserted, {updated} updated, "
            f"{skipped} skipped, {errors} errors in {processing_time:.1f}s"
        )

        return BatchPropertyResponse(
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            errors=errors,
            processing_time_seconds=round(processing_time, 2),
            error_details=error_details if errors > 0 else None
        )

    def _ingest_single(self, prop_data: PropertyCreate, source_portal_code: str) -> str:
        """Ingest a single property record. Returns 'inserted', 'updated', or 'skipped'."""

        # Get state and county IDs
        state_id = self._get_or_create_state(prop_data.state_code)
        if not state_id:
            return 'skipped'

        county_id = None
        if prop_data.county_name:
            county_id = self._get_or_create_county(state_id, prop_data.county_name)

        # Normalize address
        address_normalized = prop_data.address_normalized or self.normalize_address(prop_data.address)

        # Compute dedup hash
        address_hash = None
        if address_normalized:
            address_hash = self.compute_address_hash(
                address_normalized,
                prop_data.county_name or '',
                prop_data.state_code
            )

        # Check for existing property
        existing = None
        if address_hash:
            existing = self.db.query(Property).filter(
                Property.address_hash == address_hash,
                Property.county_id == county_id,
                Property.is_active == True
            ).first()

        if existing:
            # Update if we have newer data
            needs_update = False

            # Update fields if we have new data
            update_fields = [
                'owner_name', 'owner_name_2', 'owner_mailing_address',
                'assessed_value', 'market_value', 'lot_size_acres',
                'square_footage', 'property_type', 'parcel_id', 'gis_link',
                'last_sale_date', 'last_sale_price', 'deed_book', 'deed_page'
            ]

            for field in update_fields:
                new_val = getattr(prop_data, field, None)
                if new_val is not None:
                    old_val = getattr(existing, field, None)
                    if old_val != new_val:
                        setattr(existing, field, new_val)
                        needs_update = True

            if needs_update:
                existing.updated_at = datetime.now(timezone.utc)
                existing.scraped_at = prop_data.scraped_at or datetime.now(timezone.utc)
                return 'updated'
            else:
                return 'skipped'

        # Create new property
        new_property = Property(
            id=uuid.uuid4(),
            state_id=state_id,
            county_id=county_id,

            # Address
            address=prop_data.address,
            address_normalized=address_normalized,
            address_hash=address_hash,
            street_number=prop_data.street_number,
            street_name=prop_data.street_name,
            city=prop_data.city,
            zip_code=prop_data.zip_code,
            subdivision=prop_data.subdivision,

            # Parcel
            parcel_id=prop_data.parcel_id,
            gis_link=prop_data.gis_link,
            control_map=prop_data.control_map,
            group_code=prop_data.group_code,
            parcel_number=prop_data.parcel_number,

            # Geo
            latitude=prop_data.latitude,
            longitude=prop_data.longitude,
            centroid_lat=prop_data.centroid_lat,
            centroid_lon=prop_data.centroid_lon,

            # Building
            year_built=prop_data.year_built,
            foundation_type=prop_data.foundation_type,
            square_footage=prop_data.square_footage,
            square_footage_finished=prop_data.square_footage_finished,
            bedrooms=prop_data.bedrooms,
            bathrooms=prop_data.bathrooms,
            stories=prop_data.stories,
            construction_type=prop_data.construction_type,
            roof_type=prop_data.roof_type,
            heating_cooling=prop_data.heating_cooling,

            # Lot
            lot_size_sqft=prop_data.lot_size_sqft,
            lot_size_acres=prop_data.lot_size_acres,
            calculated_acres=prop_data.calculated_acres,

            # Assessment
            assessed_value=prop_data.assessed_value,
            assessed_land=prop_data.assessed_land,
            assessed_improvement=prop_data.assessed_improvement,
            market_value=prop_data.market_value,
            market_land=prop_data.market_land,
            market_improvement=prop_data.market_improvement,
            last_assessed_date=prop_data.last_assessed_date,

            # Type
            property_type_code=prop_data.property_type_code,
            property_type=prop_data.property_type,
            parcel_type=prop_data.parcel_type,
            land_use_code=prop_data.land_use_code,
            zoning=prop_data.zoning,

            # Owner
            owner_name=prop_data.owner_name,
            owner_name_2=prop_data.owner_name_2,
            owner_mailing_address=prop_data.owner_mailing_address,
            owner_city=prop_data.owner_city,
            owner_state=prop_data.owner_state,
            owner_zip=prop_data.owner_zip,

            # Transfer
            last_sale_date=prop_data.last_sale_date,
            last_sale_price=prop_data.last_sale_price,
            deed_book=prop_data.deed_book,
            deed_page=prop_data.deed_page,

            # Source
            source_portal_code=source_portal_code,
            arcgis_object_id=prop_data.arcgis_object_id,
            scraped_at=prop_data.scraped_at or datetime.now(timezone.utc),

            # Status
            has_building_details=prop_data.year_built is not None or prop_data.bedrooms is not None,
            geocoded=prop_data.latitude is not None or prop_data.centroid_lat is not None,
            is_active=True
        )

        # Calculate quality score
        new_property.calculate_quality_score()

        self.db.add(new_property)
        self.db.flush()

        # Try to link to permits with matching address
        self._link_permits_to_property(new_property)

        return 'inserted'

    def _link_permits_to_property(self, property: Property):
        """Link permits with matching addresses to this property."""
        if not property.address_normalized or not property.county_id:
            return

        # Find permits with matching address hash
        permits = self.db.query(SepticPermit).filter(
            SepticPermit.address_hash == property.address_hash,
            SepticPermit.county_id == property.county_id,
            SepticPermit.is_active == True,
            SepticPermit.property_id == None
        ).all()

        for permit in permits:
            permit.property_id = property.id

        if permits:
            logger.debug(f"Linked {len(permits)} permits to property {property.address}")

    def search(
        self,
        query: Optional[str] = None,
        state_code: Optional[str] = None,
        county_id: Optional[int] = None,
        city: Optional[str] = None,
        property_type: Optional[str] = None,
        min_year_built: Optional[int] = None,
        max_year_built: Optional[int] = None,
        min_bedrooms: Optional[int] = None,
        min_sqft: Optional[int] = None,
        page: int = 1,
        page_size: int = 25
    ) -> PropertySearchResponse:
        """Search properties with filters."""
        base_query = self.db.query(Property).filter(Property.is_active == True)

        # Apply filters
        if query:
            search_term = f"%{query.upper()}%"
            base_query = base_query.filter(
                or_(
                    Property.address_normalized.ilike(search_term),
                    Property.owner_name.ilike(search_term),
                    Property.parcel_id.ilike(search_term)
                )
            )

        if state_code:
            state = self.db.query(State).filter(State.code == state_code.upper()).first()
            if state:
                base_query = base_query.filter(Property.state_id == state.id)

        if county_id:
            base_query = base_query.filter(Property.county_id == county_id)

        if city:
            base_query = base_query.filter(Property.city.ilike(f"%{city}%"))

        if property_type:
            base_query = base_query.filter(Property.property_type == property_type)

        if min_year_built:
            base_query = base_query.filter(Property.year_built >= min_year_built)

        if max_year_built:
            base_query = base_query.filter(Property.year_built <= max_year_built)

        if min_bedrooms:
            base_query = base_query.filter(Property.bedrooms >= min_bedrooms)

        if min_sqft:
            base_query = base_query.filter(Property.square_footage >= min_sqft)

        # Get total count
        total = base_query.count()

        # Paginate
        offset = (page - 1) * page_size
        properties = base_query.order_by(Property.address_normalized).offset(offset).limit(page_size).all()

        # Get permit counts
        property_ids = [p.id for p in properties]
        permit_counts = {}
        if property_ids:
            counts = self.db.query(
                SepticPermit.property_id,
                func.count(SepticPermit.id).label('count')
            ).filter(
                SepticPermit.property_id.in_(property_ids)
            ).group_by(SepticPermit.property_id).all()
            permit_counts = {pc[0]: pc[1] for pc in counts}

        # Build results
        results = []
        for p in properties:
            results.append(PropertySummary(
                id=p.id,
                address=p.address,
                city=p.city,
                parcel_id=p.parcel_id,
                owner_name=p.owner_name,
                year_built=p.year_built,
                square_footage=p.square_footage,
                bedrooms=p.bedrooms,
                bathrooms=p.bathrooms,
                market_value=p.market_value,
                lot_size_acres=p.lot_size_acres,
                property_type=p.property_type,
                permit_count=permit_counts.get(p.id, 0)
            ))

        total_pages = (total + page_size - 1) // page_size

        return PropertySearchResponse(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            results=results
        )

    def get_property(self, property_id: uuid.UUID) -> Optional[PropertyResponse]:
        """Get a single property by ID."""
        prop = self.db.query(Property).filter(
            Property.id == property_id,
            Property.is_active == True
        ).first()

        if not prop:
            return None

        # Get state and county info
        state = self.db.query(State).filter(State.id == prop.state_id).first()
        county = self.db.query(County).filter(County.id == prop.county_id).first() if prop.county_id else None

        # Get permit count
        permit_count = self.db.query(func.count(SepticPermit.id)).filter(
            SepticPermit.property_id == property_id
        ).scalar() or 0

        return PropertyResponse(
            id=prop.id,
            state_id=prop.state_id,
            county_id=prop.county_id,
            address=prop.address,
            address_normalized=prop.address_normalized,
            street_number=prop.street_number,
            street_name=prop.street_name,
            city=prop.city,
            zip_code=prop.zip_code,
            subdivision=prop.subdivision,
            parcel_id=prop.parcel_id,
            gis_link=prop.gis_link,
            latitude=prop.latitude,
            longitude=prop.longitude,
            centroid_lat=prop.centroid_lat,
            centroid_lon=prop.centroid_lon,
            year_built=prop.year_built,
            foundation_type=prop.foundation_type,
            square_footage=prop.square_footage,
            bedrooms=prop.bedrooms,
            bathrooms=prop.bathrooms,
            stories=prop.stories,
            construction_type=prop.construction_type,
            lot_size_acres=prop.lot_size_acres,
            calculated_acres=prop.calculated_acres,
            assessed_value=prop.assessed_value,
            market_value=prop.market_value,
            property_type=prop.property_type,
            owner_name=prop.owner_name,
            owner_name_2=prop.owner_name_2,
            last_sale_date=prop.last_sale_date,
            last_sale_price=prop.last_sale_price,
            data_quality_score=prop.data_quality_score,
            has_building_details=prop.has_building_details,
            source_portal_code=prop.source_portal_code,
            scraped_at=prop.scraped_at,
            created_at=prop.created_at,
            updated_at=prop.updated_at,
            state_code=state.code if state else None,
            county_name=county.name if county else None,
            permit_count=permit_count
        )

    def get_stats(self) -> PropertyStatsResponse:
        """Get property statistics."""
        total = self.db.query(func.count(Property.id)).filter(
            Property.is_active == True
        ).scalar() or 0

        with_building = self.db.query(func.count(Property.id)).filter(
            Property.is_active == True,
            Property.has_building_details == True
        ).scalar() or 0

        linked_permits = self.db.query(func.count(SepticPermit.id)).filter(
            SepticPermit.property_id != None
        ).scalar() or 0

        # By property type
        type_counts = self.db.query(
            Property.property_type,
            func.count(Property.id)
        ).filter(
            Property.is_active == True,
            Property.property_type != None
        ).group_by(Property.property_type).all()
        by_type = {t[0]: t[1] for t in type_counts}

        # By city
        city_counts = self.db.query(
            Property.city,
            func.count(Property.id)
        ).filter(
            Property.is_active == True,
            Property.city != None
        ).group_by(Property.city).order_by(func.count(Property.id).desc()).limit(20).all()
        by_city = {c[0]: c[1] for c in city_counts}

        # Averages
        avg_market = self.db.query(func.avg(Property.market_value)).filter(
            Property.is_active == True,
            Property.market_value != None
        ).scalar()

        avg_year = self.db.query(func.avg(Property.year_built)).filter(
            Property.is_active == True,
            Property.year_built != None
        ).scalar()

        avg_sqft = self.db.query(func.avg(Property.square_footage)).filter(
            Property.is_active == True,
            Property.square_footage != None
        ).scalar()

        return PropertyStatsResponse(
            total_properties=total,
            total_with_building_details=with_building,
            total_linked_permits=linked_permits,
            by_property_type=by_type,
            by_city=by_city,
            avg_market_value=round(avg_market, 2) if avg_market else None,
            avg_year_built=round(avg_year, 1) if avg_year else None,
            avg_square_footage=round(avg_sqft, 1) if avg_sqft else None
        )


def get_property_service(db: Session) -> PropertyService:
    """Factory function to get PropertyService instance."""
    return PropertyService(db)
