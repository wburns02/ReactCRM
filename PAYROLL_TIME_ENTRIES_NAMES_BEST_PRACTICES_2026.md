# Payroll Time Entries - Technician Names Best Practices 2026

## Research Summary

Based on analysis of leading field service management software (ServiceTitan, Jobber, QuickBooks Time, Connecteam, FIELDBOSS) and 2026 industry standards.

---

## Key Best Practices for Time Entry Displays

### 1. Real Names Everywhere
- **Always display full names** (first + last) - never UUIDs or technical IDs
- **Consistent format**: "John Smith" not "Smith, John" or "J. Smith"
- **Searchable**: Users should be able to filter/search by technician name
- **Mobile-friendly**: Names should be visible on mobile devices without truncation

### 2. Data Join at API Level
- **Server-side resolution**: API should return complete technician data, not just IDs
- **Efficient querying**: Use batch lookups (IN clause) rather than N+1 queries
- **Caching**: Consider caching technician names to reduce database hits
- **Fallback**: If technician is deleted, show "Unknown Technician" not raw UUID

### 3. ServiceTitan Patterns (Industry Leader)
- Displays technician names on dispatch board
- Skills shown on hover over technician name
- Clicking technician name reveals actions (message, call, send job details)
- ETA notifications include technician bios
- 30+ built-in reports trace data back to specific technicians by name

### 4. Jobber Patterns
- Real-time dispatch shows technician names
- GPS tracking with named technician markers
- Technician performance reports by name
- Mobile app shows technician name on job assignments
- Customer history accessible per named technician

### 5. QuickBooks Time/Payroll Integration (2026 Best)
- Employee time tracking flows directly into payroll
- Approved hours tied to named employees
- Automatic pay calculations by employee name
- Compliance tracking per named worker

### 6. FIELDBOSS Field Service Standards
- Every hour captured with technician name
- Approval workflows show who worked
- AI-driven overtime insights by technician
- Job-cost allocation tied to named workers

---

## Implementation Requirements

### API Response Pattern
```json
{
  "entries": [
    {
      "id": "entry-uuid",
      "technician_id": "tech-uuid",
      "technician_name": "Chris Williams",  // REQUIRED
      "date": "2026-01-29",
      "clock_in": "08:00:00",
      "clock_out": "17:00:00",
      "regular_hours": 8,
      "overtime_hours": 0,
      "status": "pending"
    }
  ]
}
```

### Frontend Display
```tsx
// CORRECT: Real name
<td>{entry.technician_name}</td>

// WRONG: UUID fallback
<td>{entry.technician_name || `Tech #${entry.technician_id}`}</td>
```

### Dropdowns and Forms
- Technician selection dropdowns must show full names
- Sort alphabetically by last name or first name
- Include active/inactive status indicator
- Consider showing employee ID in parentheses for disambiguation

### Audit Trail
- All time entries should record who created/approved them by name
- Historical records should preserve technician names even if employee leaves
- Export reports should include full names, not just IDs

---

## Recommended Fix for ECBTX CRM

### Backend Changes
1. **GET /payroll/time-entries**: Add `technician_name` to response
2. **POST /payroll/time-entries**: Return `technician_name` in created entry
3. **PATCH /payroll/time-entries/{id}**: Return `technician_name` in updated entry

### Pattern to Follow (from pay-rates endpoint)
```python
# Resolve technician names
tech_ids = list(set(e.technician_id for e in entries if e.technician_id))
technicians = {}
if tech_ids:
    tech_result = await db.execute(select(Technician).where(Technician.id.in_(tech_ids)))
    technicians = {str(t.id): f"{t.first_name} {t.last_name}" for t in tech_result.scalars().all()}

# Include in response
"technician_name": technicians.get(e.technician_id, "Unknown Technician"),
```

---

## Sources

- [Best Payroll Software with Time Tracking 2026 - Better Business Advice](https://www.prnewswire.com/news-releases/best-payroll-software-with-time-tracking-2026-quickbooks-payroll-rated-reliable-all-in-one-solution-by-better-business-advice-302657957.html)
- [FIELDBOSS Field Service Time Tracking](https://www.fieldboss.com/features/payroll/)
- [ServiceTitan - How to Add Technician](https://help.servicetitan.com/how-to/how-to-add-technician)
- [ServiceTitan vs Jobber Comparison](https://www.servicetitan.com/comparison/servicetitan-vs-jobber)
- [Best Field Service Time Tracking Software 2026](https://apploye.com/field-service-time-tracking)
- [Field Service Time Tracking - Factorial](https://factorialhr.com/blog/best-field-service-time-tracking/)
