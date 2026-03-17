/**
 * City-specific configuration for geo-targeted landing pages.
 *
 * Adding a new city:
 *   1. Add a config entry here
 *   2. Add a <Route> in src/routes/public/index.tsx
 *   3. Export from landing/index.ts
 */

export interface CityConfig {
  slug: string;
  cityName: string;
  state: string;
  county: string;
  phone: string;
  phoneTel: string;
  heroHeadline: string;
  heroSubtext: string;
  serviceAreaLabel: string;
  serviceAreaDescription: string;
  pageTitle: string;
  metaDescription: string;
  servedCities: string[];
}

// Nashville phone shared across Middle TN markets
const NASHVILLE_PHONE = "(615) 345-2544";
const NASHVILLE_PHONE_TEL = "tel:+16153452544";

export const cityConfigs: Record<string, CityConfig> = {
  franklin: {
    slug: "franklin-tn",
    cityName: "Franklin",
    state: "TN",
    county: "Williamson County",
    phone: NASHVILLE_PHONE,
    phoneTel: NASHVILLE_PHONE_TEL,
    heroHeadline: "Franklin, TN",
    heroSubtext:
      "Professional septic tank pumping, inspection, and repair serving Franklin and Williamson County homeowners.",
    serviceAreaLabel: "Franklin & Williamson County",
    serviceAreaDescription:
      "Franklin, Williamson County, and surrounding Middle Tennessee communities including Brentwood, Spring Hill, Nolensville, Thompson's Station, and Arrington",
    pageTitle:
      "Septic Tank Pumping & Repair | MAC Septic | Franklin, TN",
    metaDescription:
      "Professional septic tank pumping, inspection & repair in Franklin, TN. Same-day service available, 4.9 rating, 28+ years experience. Call (615) 345-2544.",
    servedCities: [
      "Franklin",
      "Brentwood",
      "Spring Hill",
      "Nolensville",
      "Thompson's Station",
      "Arrington",
      "Fairview",
      "College Grove",
      "Nashville",
      "Murfreesboro",
      "Cool Springs",
      "Williamson County",
    ],
  },

  springHill: {
    slug: "spring-hill-tn",
    cityName: "Spring Hill",
    state: "TN",
    county: "Maury / Williamson County",
    phone: NASHVILLE_PHONE,
    phoneTel: NASHVILLE_PHONE_TEL,
    heroHeadline: "Spring Hill, TN",
    heroSubtext:
      "Professional septic tank pumping, inspection, and repair serving Spring Hill and the surrounding area.",
    serviceAreaLabel: "Spring Hill & Surrounding Areas",
    serviceAreaDescription:
      "Spring Hill, Maury County, southern Williamson County, and surrounding communities including Columbia, Thompson's Station, Franklin, and Chapel Hill",
    pageTitle:
      "Septic Tank Pumping & Repair | MAC Septic | Spring Hill, TN",
    metaDescription:
      "Professional septic service in Spring Hill, TN. Same-day service, 4.9 rating, 28+ years experience. Call (615) 345-2544.",
    servedCities: [
      "Spring Hill",
      "Thompson's Station",
      "Columbia",
      "Franklin",
      "Chapel Hill",
      "Lewisburg",
      "Mt. Pleasant",
      "Maury County",
      "Williamson County",
      "Nashville",
      "Brentwood",
      "Murfreesboro",
    ],
  },

  brentwood: {
    slug: "brentwood-tn",
    cityName: "Brentwood",
    state: "TN",
    county: "Williamson County",
    phone: NASHVILLE_PHONE,
    phoneTel: NASHVILLE_PHONE_TEL,
    heroHeadline: "Brentwood, TN",
    heroSubtext:
      "Professional septic tank pumping, inspection, and repair for Brentwood homeowners and properties.",
    serviceAreaLabel: "Brentwood & Nashville Metro",
    serviceAreaDescription:
      "Brentwood, Williamson County, Nashville metro, and surrounding communities including Franklin, Nolensville, and Green Hills",
    pageTitle:
      "Septic Tank Pumping & Repair | MAC Septic | Brentwood, TN",
    metaDescription:
      "Professional septic service in Brentwood, TN. Same-day service, 4.9 rating, 28+ years experience. Call (615) 345-2544.",
    servedCities: [
      "Brentwood",
      "Franklin",
      "Nashville",
      "Nolensville",
      "Green Hills",
      "Oak Hill",
      "Forest Hills",
      "Belle Meade",
      "Spring Hill",
      "Murfreesboro",
      "Antioch",
      "Williamson County",
    ],
  },

  murfreesboro: {
    slug: "murfreesboro-tn",
    cityName: "Murfreesboro",
    state: "TN",
    county: "Rutherford County",
    phone: NASHVILLE_PHONE,
    phoneTel: NASHVILLE_PHONE_TEL,
    heroHeadline: "Murfreesboro, TN",
    heroSubtext:
      "Professional septic tank pumping, inspection, and repair serving Murfreesboro and Rutherford County.",
    serviceAreaLabel: "Murfreesboro & Rutherford County",
    serviceAreaDescription:
      "Murfreesboro, Rutherford County, and surrounding Middle Tennessee areas including Smyrna, La Vergne, Eagleville, and Lascassas",
    pageTitle:
      "Septic Tank Pumping & Repair | MAC Septic | Murfreesboro, TN",
    metaDescription:
      "Professional septic service in Murfreesboro, TN. Same-day service, 4.9 rating, 28+ years experience. Call (615) 345-2544.",
    servedCities: [
      "Murfreesboro",
      "Smyrna",
      "La Vergne",
      "Eagleville",
      "Lascassas",
      "Christiana",
      "Rockvale",
      "Walter Hill",
      "Nashville",
      "Franklin",
      "Rutherford County",
      "Williamson County",
    ],
  },
};

export function getCityConfig(key: string): CityConfig | undefined {
  return cityConfigs[key];
}
