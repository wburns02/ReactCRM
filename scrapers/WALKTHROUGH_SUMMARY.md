# Septic Record Scraper Walkthroughs

## MGO Connect (Texas Counties)

### Credentials
- URL: https://www.mgoconnect.org/cp/search
- Login: willwalterburns@gmail.com
- Password: #Espn202512

### Travis County Walkthrough
1. Select Texas
2. Type: County, choose Travis, click continue
3. Click search permits
4. Select date (must be a 35 day window)
5. Start date search in 1/1/2000
6. Project Name: First search "Septic"
7. Click Search, copy metadata, next
8. Project Name: Next search "OSSF"
9. Click Search, copy metadata, next

### Williamson County Walkthrough
1. Login with credentials
2. State: Texas
3. Jurisdiction: Williamson County
4. Project Type: OSSF
5. Recursive address search (MAX 100)
6. Copy metadata
7. Click the next icon on the bottom
8. Copy metadata
9. Repeat until none are left
10. Choose another recursive address search
11. Repeat until all septic permits have been acquired

### Hays County Walkthrough
1. Login with credentials
2. State: Texas
3. Jurisdiction: Hays County
4. Project Type: On-Site Sewage Facility (Septic) Permit
5. Recursive address search (MAX 100)
6. Copy metadata
7. Click the next icon on the bottom
8. Copy metadata
9. Repeat until none are left
10. Choose another recursive address search
11. Repeat until all septic permits have been acquired

### MGO Texas Counties Queue
- Travis County
- Bastrop County
- Bell County
- Cooke County
- Ellis County
- Fannin County
- Grayson County
- Hays County
- Waller County
- Williamson County

**IMPORTANT**: Only ONE MGOConnect scraper at a time!

---

## North Carolina Counties (CDPEHS System)

### Avery County Walkthrough
- URL: https://public.cdpehs.com/NCENVPBLo/OSW_PROPERTY/ShowOSW_PROPERTYTablePage.aspx?ESTTST_CTY=C6

Steps:
1. Recursive street address containing
2. Copy metadata
3. Click the green next icon
4. Copy metadata
5. Repeat til empty
6. Start next recursive address search EX: 1, 12, 123, etc.

### Alleghany County Walkthrough
- URL: https://public.cdpehs.com/NCENVPBLo/OSW_PROPERTY/ShowOSW_PROPERTYTablePage.aspx?ESTTST_CTY=D5

Steps:
1. Recursive street address containing
2. Copy metadata
3. Click the green next icon
4. Copy metadata
5. Repeat til empty
6. Start next recursive address search EX: 1, 12, 123, etc.

---

## NC County Codes (for CDPEHS URL)
- Avery: C6
- Alleghany: D5
- (Other counties would follow similar pattern with different codes)
