#!/usr/bin/env python3
"""
Export MGO data by trade/service type

Creates separate CSV files for each trade:
- electrical.csv
- plumbing.csv
- hvac.csv
- roofing.csv
- septic.csv
- solar.csv
- pool.csv
- gas.csv
"""

import sqlite3
import csv
import os
from datetime import datetime

DB_PATH = os.path.expanduser("~/mgo_extraction/processed/mgo_permits.db")
OUTPUT_DIR = os.path.expanduser("~/mgo_extraction/processed/by_trade")

# Trade keyword mappings
TRADES = {
    'electrical': [
        'Electrical', 'Electric', 'Generator', 'EV Charging',
        'Panel', 'Wiring', 'Outlet', 'Circuit'
    ],
    'plumbing': [
        'Plumbing', 'Plumber', 'Water Heater', 'Sewer',
        'Drain', 'Pipe', 'Fixture', 'Backflow'
    ],
    'hvac': [
        'Mechanical', 'HVAC', 'Air Condition', 'Heating',
        'Furnace', 'Duct', 'Ventilation', 'Heat Pump'
    ],
    'roofing': [
        'Roof', 'Roofing', 'Re-Roof', 'Shingle'
    ],
    'septic': [
        'Septic', 'OSSF', 'On-Site Sewage', 'Sewage Facility',
        'Aerobic', 'Conventional System', 'Drainfield'
    ],
    'solar': [
        'Solar', 'Photovoltaic', 'PV System', 'Panel Installation'
    ],
    'pool': [
        'Pool', 'Spa', 'Hot Tub', 'Swimming'
    ],
    'gas': [
        'Gas', 'Propane', 'Natural Gas', 'LP Gas'
    ],
    'general_building': [
        'Building', 'Construction', 'Addition', 'Renovation',
        'Remodel', 'New Home', 'Single Family'
    ]
}

def export_trade(conn, trade_name, keywords):
    """Export all records matching trade keywords"""
    cursor = conn.cursor()

    # Build WHERE clause
    conditions = []
    for kw in keywords:
        conditions.append(f"work_type LIKE '%{kw}%'")
        conditions.append(f"project_type LIKE '%{kw}%'")
        conditions.append(f"description LIKE '%{kw}%'")
        conditions.append(f"project_name LIKE '%{kw}%'")

    where_clause = " OR ".join(conditions)

    query = f'''
        SELECT
            permit_number,
            address,
            city,
            state,
            zip,
            jurisdiction as county,
            project_type,
            work_type,
            project_name,
            description,
            status,
            date_created,
            lat,
            lng,
            parcel_number
        FROM permits
        WHERE {where_clause}
        ORDER BY state, city, date_created DESC
    '''

    cursor.execute(query)
    rows = cursor.fetchall()

    # Export to CSV
    output_file = f"{OUTPUT_DIR}/{trade_name}.csv"
    headers = [
        'permit_number', 'address', 'city', 'state', 'zip', 'county',
        'project_type', 'work_type', 'project_name', 'description',
        'status', 'date_created', 'lat', 'lng', 'parcel_number'
    ]

    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)

    return len(rows)

def main():
    print("=" * 60)
    print("EXPORT BY TRADE")
    print("=" * 60)
    print(f"Started: {datetime.now().isoformat()}")
    print()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    conn = sqlite3.connect(DB_PATH)

    print("Exporting by trade...")
    print()

    results = []
    for trade_name, keywords in TRADES.items():
        count = export_trade(conn, trade_name, keywords)
        results.append((trade_name, count))
        print(f"  {trade_name}: {count:,} records")

    conn.close()

    print()
    print("=" * 60)
    print("EXPORT COMPLETE")
    print("=" * 60)
    print(f"Output: {OUTPUT_DIR}/")
    print()
    print("Files created:")
    for trade, count in sorted(results, key=lambda x: -x[1]):
        print(f"  {trade}.csv - {count:,} records")

if __name__ == '__main__':
    main()
