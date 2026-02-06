# Commissions Best Practices 2026 - Field Service Industry

## Research Sources
- [ServiceTitan vs Housecall Pro 2025 Comparison](https://www.servicetitan.com/comparison/servicetitan-vs-housecall-pro)
- [HVAC Sales Commission Rates & Processes](https://www.servicetitan.com/blog/hvac-sales-commission)
- [HVAC Commission Pay Design](https://www.sharewillow.com/blog/hvac-commission-pay)
- [Top HVAC Sales Commission Structure Examples 2025](https://www.everstage.com/sales-commission/hvac-sales-commission-structure)
- [Septic Tank Pumping Cost Understanding](https://www.wilsonplumbingandheating.com/post/septic-tank-pumping-cost)
- [Septic Pumping Business Salary](https://servicecore.com/blog/owning-a-septic-pumping-business-salary/)

---

## Industry Standard Commission Rates

### By Job Type
| Job Type | Commission Rate | Notes |
|----------|----------------|-------|
| **Pumpout/Pumping** | 15-20% | After dump fee deduction |
| **Service/Repair** | 10-15% | On job total |
| **Installation** | 5-10% | Larger ticket, lower % |
| **Emergency** | 15-25% | Premium for on-call |
| **Maintenance Agreements** | Flat $50-100 | Per agreement sold |
| **Upsells** | 10-20% | On upsell amount |

### Septic-Specific Considerations
- **Dump fees typically range**: $0.055 to $0.137 per gallon
- **Average 1,000-gallon job dump cost**: $55-$137
- **Average pumpout job revenue**: $400-$500
- **Net commissionable after dump fee**: $263-$445

---

## Best Practice: Commission Calculation Formula

### For Pumpout Jobs (20% after dump fees)
```
commission = (job_total - (gallons × cost_per_gallon)) × 0.20
```

Example:
- Job Total: $450
- Gallons Pumped: 1,000
- Dump Cost: $0.08/gallon
- Dump Fee: 1,000 × $0.08 = $80
- Commissionable: $450 - $80 = $370
- Commission: $370 × 0.20 = $74

### For Service Jobs (15% on total)
```
commission = job_total × 0.15
```

Example:
- Job Total: $300
- Commission: $300 × 0.15 = $45

---

## Modern Commission System Features (2026)

### 1. Auto-Calculation on Job Completion
- Commission auto-generated when work order marked complete
- Pulls job_type, job_total, gallons from work order
- Applies appropriate rate based on job type
- Deducts dump fees for pumping jobs

### 2. Dump Site Management
Best practices for dump site tracking:
- **Site Name**: Descriptive name (e.g., "County Wastewater Treatment")
- **Address**: Full address for routing
- **Cost Per Gallon**: Current rate ($0.05 - $0.15)
- **Active/Inactive Status**: Toggle for sites no longer used
- **Last Updated**: Track when rates changed
- **Distance from Service Area**: For routing optimization

### 3. Approval Workflow
Modern approval flow:
```
Auto-Generated → Pending → Approved → Paid
                    ↓
              Manager Review
                    ↓
           Override if needed
```

### 4. Audit Trail
Track all changes:
- Original calculated amount
- Any manual overrides
- Who approved
- When paid
- Work order reference

### 5. Technician Dashboard View
What technicians should see:
- Month-to-date commissions
- Pending approvals
- Paid this period
- Breakdown by job type
- Historical performance

---

## ServiceTitan & Housecall Pro Patterns

### ServiceTitan Commission Features
- Tiered commission rates by job type
- Spiffs for specific actions (5-star reviews, maintenance agreements)
- Performance-based bonuses
- Dashboard for technician earnings

### Housecall Pro Commission Features
- Simple percentage-based commissions
- Job-type based rates
- Integration with payroll
- Mobile-friendly technician view

---

## Recommended Implementation for MAC Septic CRM

### Commission Rates Configuration
| Job Type | Rate | Deduction |
|----------|------|-----------|
| pumping | 20% | Dump fees |
| inspection | 15% | None |
| repair | 15% | None |
| installation | 10% | None |
| emergency | 20% | None |
| maintenance | 15% | None |
| grease_trap | 20% | Dump fees |
| camera_inspection | 15% | None |

### Dump Fee Deduction Logic
```python
if job_type in ['pumping', 'grease_trap']:
    dump_fee = gallons × dump_site.cost_per_gallon
    commissionable = job_total - dump_fee
else:
    commissionable = job_total

commission = commissionable × rate_for_job_type
```

### Data Model for Dump Sites
```
DumpSite:
  - id (UUID)
  - name (string)
  - address (string)
  - city, state, zip
  - cost_per_gallon (decimal)
  - is_active (boolean)
  - notes (text)
  - created_at, updated_at
```

### UI Requirements
1. **Admin Section**: Dump Sites management (CRUD)
2. **Commission Form**: Auto-populate from work order, show dump fee calculation
3. **Payroll Dashboard**: Commission stats, leaderboard
4. **Technician Portal**: Personal commission view

---

## Key Takeaways

1. **20% for pumpout** is industry standard for septic after costs
2. **15% for service** is competitive for repairs/inspections
3. **Dump fee deduction** is critical for accurate pumpout commissions
4. **Auto-calculation** reduces errors and saves admin time
5. **Transparency** builds technician trust - show the math
6. **Approval workflow** prevents unauthorized payments
7. **Mobile access** lets techs see earnings in real-time

---

## Competitive Advantage Features

To exceed industry standard:
1. **Real-time commission tracking** - see earnings as jobs complete
2. **Dump site optimization** - suggest nearest/cheapest dump
3. **Commission projections** - forecast monthly earnings
4. **Gamification** - leaderboards, badges, streak bonuses
5. **Instant payment** - option for weekly commission payouts
