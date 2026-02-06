# Geocivix Portal API Analysis - Williamson County, TN

**Analysis Date:** January 22, 2026
**Portal:** https://williamson.geocivix.com/secure/
**Platform:** idtplans by Geocivix

## Executive Summary

Williamson County, TN uses a Geocivix portal powered by the "idtplans" platform for permit management. The portal provides:
- Session-based authentication via POST requests
- HTML-based API responses (not JSON)
- A comprehensive permit list endpoint returning ~1,000 permits per request
- Project and inspection management capabilities

## Authentication Flow

### Step 1: Check User Scheme
```
POST /secure/?action=user.scheme
Content-Type: application/x-www-form-urlencoded

username=willwalterburns%40gmail.com&rememberme=false
```

Response: JSON with SAML/Auth URLs (empty for this portal)
```json
{"SAMLURL":"","AUTHURL":""}
```

### Step 2: Authenticate
```
POST /secure/?action=user.authenticate
Content-Type: application/x-www-form-urlencoded

username=willwalterburns%40gmail.com&password=%23Espn2025&rememberme=false&token=
```

Response: JSON confirmation
```json
{"MESSAGE":"Login successful","SUCCESS":true,"SUCCESSURL":"https://williamson.geocivix.com/secure/"}
```

Session cookies are set and must be included in subsequent requests.

## Key API Endpoints

### Permit List (MOST VALUABLE)
```
GET /secure/?action=permit.list
```
- Returns: HTML table with all permits (~1.76 MB, 1000+ permits)
- Data includes: Permit number, type, status, date, expiration, document links

### Permit Detail
```
GET /secure/permits/?issuanceid={id}
```
- Returns: Full permit detail page
- Example: `/secure/permits/?issuanceid=8873` for permit BP-2020-00001

### Project Search
```
GET /secure/project/?step=search
```
Search form parameters:
- `projTitle` - Project title/name search
- `ProjState` - State filter
- `searchtype` - Search type
- `ProjCounty` - County filter
- `StatusID` - Project status
- `ProjectTypeID` - Project type
- `ApplicationTypeID` - Application type
- `submitter_ContactId` - Submitter contact
- `Submitter_CompanyID` - Submitter company
- `StageID` - Project stage
- `RealID` - Property/Real ID
- `dr_startDate` / `dr_endDate` - Date range
- `dr_projDate` - Date field to search
- `dr_dateOperator` - Date comparison operator

### Other Valid Endpoints
| Endpoint | Description |
|----------|-------------|
| `project.user-submittals` | User's submitted projects |
| `project.browse` | Browse all projects |
| `project.recent` | Recently viewed projects |
| `project.tracked` | Tracked/followed projects |
| `project.types` | Project type definitions |
| `inspection.user-inspections` | User's inspections |
| `inspection.list` | All inspections |
| `company.search` | Search companies/contractors |
| `contractor.search` | Search contractors |

## Permit Data Structure (from HTML)

Each permit row contains:
```html
<tr>
  <td><a href="/secure/permits/?issuanceid=8873">BP-2020-00001</a></td>
  <td>Building Permit</td>
  <td><span class="green bold">Issued</span></td>
  <td>1/2/20</td>
  <td></td>  <!-- Issued By -->
  <td>N/A</td>  <!-- Expiration -->
  <td><a href="/secure/utilities/viewer/?vid=2774325">Document.pdf</a></td>
  <td><!-- Actions: Revoke, Close --></td>
</tr>
```

### Parsed Fields
| Field | HTML Location | Example |
|-------|---------------|---------|
| Permit Number | `td:nth-child(1) a` | BP-2020-00001 |
| Permit Type | `td:nth-child(2)` | Building Permit |
| Status | `td:nth-child(3) span` | Issued |
| Issue Date | `td:nth-child(4)` | 1/2/20 |
| Issued By | `td:nth-child(5)` | (empty) |
| Expiration | `td:nth-child(6)` | N/A |
| Document URL | `td:nth-child(7) a href` | /secure/utilities/viewer/?vid=... |
| Detail URL | `td:nth-child(1) a href` | /secure/permits/?issuanceid=8873 |
| Issuance ID | data-issuanceid attribute | 8873 |

## Permit Types Observed
- Building Permit (BP-XXXX-XXXXX)
- Other permit types to be discovered from full extraction

## Implementation Strategy

### 1. Session Management
- Authenticate once, store session cookies
- Re-authenticate on 401/403 or session expiry
- Use httpOnly cookies from Set-Cookie headers

### 2. Permit Extraction
```python
# Primary extraction method
1. Login via user.scheme + user.authenticate
2. GET /secure/?action=permit.list
3. Parse HTML table with BeautifulSoup/cheerio
4. Extract each permit row into structured data
5. For full details, fetch /secure/permits/?issuanceid={id}
```

### 3. Incremental Sync
- Track last sync timestamp
- Filter by date range on subsequent syncs
- Use `dr_startDate` and `dr_endDate` parameters

### 4. Rate Limiting
- Portal is production system - be respectful
- Recommend: 1-2 requests per second
- Implement exponential backoff on errors

## Data Model Mapping

### GeocivixPermit → CRM Permit
| Geocivix Field | CRM Field | Notes |
|----------------|-----------|-------|
| Permit Number | permit_number | Primary identifier |
| Permit Type | permit_type | e.g., "Building Permit" |
| Status | status | Issued, Pending, etc. |
| Issue Date | issue_date | Parse MM/DD/YY format |
| Expiration | expiration_date | May be "N/A" |
| Document URL | document_url | Full URL to PDF |
| Issuance ID | external_id | Portal's internal ID |
| Detail URL | source_url | Link to full details |

## Sample Scraper Pseudocode

```typescript
class GeocivixScraper {
  private cookies: string[];

  async login(): Promise<void> {
    // Step 1: Get scheme
    await fetch('/secure/?action=user.scheme', {
      method: 'POST',
      body: 'username=...&rememberme=false'
    });

    // Step 2: Authenticate
    const authResp = await fetch('/secure/?action=user.authenticate', {
      method: 'POST',
      body: 'username=...&password=...&rememberme=false&token='
    });

    // Store cookies from response
    this.cookies = authResp.headers.get('set-cookie');
  }

  async getPermitList(): Promise<Permit[]> {
    const resp = await fetch('/secure/?action=permit.list', {
      headers: { Cookie: this.cookies.join('; ') }
    });

    const html = await resp.text();
    return this.parsePermitHtml(html);
  }

  parsePermitHtml(html: string): Permit[] {
    const $ = cheerio.load(html);
    const permits: Permit[] = [];

    $('table tbody tr').each((i, row) => {
      const $row = $(row);
      permits.push({
        permitNumber: $row.find('td:nth-child(1) a').text().trim(),
        permitType: $row.find('td:nth-child(2)').text().trim(),
        status: $row.find('td:nth-child(3)').text().trim(),
        issueDate: $row.find('td:nth-child(4)').text().trim(),
        expirationDate: $row.find('td:nth-child(6)').text().trim(),
        documentUrl: $row.find('td:nth-child(7) a').attr('href'),
        detailUrl: $row.find('td:nth-child(1) a').attr('href'),
        issuanceId: $row.find('button[data-issuanceid]').attr('data-issuanceid')
      });
    });

    return permits;
  }
}
```

## Next Steps

1. **Backend Service**: Create `geocivix_service.py` with login/scrape methods
2. **Database Model**: Create `GeocivixPermit` SQLAlchemy model
3. **Sync Command**: Create management command for scheduled imports
4. **Frontend Integration**: Display Geocivix permits in CRM UI
5. **E2E Testing**: Playwright tests to verify integration

---

**<promise>GEOCIVIX_API_MAPPED</promise>**
