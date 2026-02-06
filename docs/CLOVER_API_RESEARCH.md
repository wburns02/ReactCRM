# Clover API Research: Payment Processing Integration for CRM/Service Business

> Research compiled: 2026-02-05
> Focus: Ecommerce / Online Payment use case (not in-person POS)

---

## Table of Contents

1. [API Overview](#1-clover-api-overview)
2. [Authentication](#2-authentication)
3. [Payment Flow](#3-payment-flow)
4. [Hosted Checkout & Iframe](#4-clover-hosted-checkout--iframe)
5. [Tokenization](#5-tokenization)
6. [Ecommerce API](#6-clover-ecommerce-api)
7. [API Base URLs](#7-api-base-urls)
8. [Key Endpoints Reference](#8-key-endpoints-reference)
9. [Webhook Support](#9-webhook-support)
10. [PCI DSS Compliance](#10-pci-dss-compliance)
11. [Best Practices 2026](#11-best-practices-2026-for-crm-integration)

---

## 1. Clover API Overview

Clover organizes its APIs into several major categories:

### Platform REST API (Merchant Data)
| Category      | Description                                                        |
|---------------|--------------------------------------------------------------------|
| **MERCHANTS** | Merchant accounts, properties, gateways, service charges, devices  |
| **CUSTOMERS** | Customer profiles, contact info, addresses, saved cards, metadata  |
| **EMPLOYEES** | Employee records, shifts, order history                            |
| **INVENTORY** | Items, stock, categories, modifiers, tax rates, discounts          |
| **ORDERS**    | Create/manage orders, line items, discounts, service charges       |
| **PAYMENTS**  | Process payments, authorizations, refunds                          |
| **APPS**      | App billing and metered events                                     |
| **CASH**      | Cash events for merchants, employees, and devices                  |
| **NOTIFICATIONS** | Send notifications to apps and devices                         |

### Ecommerce Service API (Online Payments)
| Category          | Description                                          |
|-------------------|------------------------------------------------------|
| **CHARGES**       | Create and capture charges (one-time payments)       |
| **CUSTOMERS**     | Card-on-file customers and payment sources           |
| **REFUNDS**       | Process refunds                                      |
| **ORDERS**        | Ecommerce orders and order-based payments            |
| **ECOMMGIFTCARD** | Gift card balance inquiries, reloads, operations     |

### Tokenization Service APIs
| Category   | Description                                                |
|------------|------------------------------------------------------------|
| **TOKENS** | Generate tokens for cards, Apple Pay, ACH, and gift cards  |

### Recurring APIs
| Category          | Description                            |
|-------------------|----------------------------------------|
| **PLANS**         | Create and manage subscription plans   |
| **SUBSCRIPTIONS** | Manage customer subscriptions          |

### Integration Options for Ecommerce
1. **Hosted Checkout (HCO)** -- Redirect customers to a Clover-hosted payment page
2. **Iframe Integration** -- Embed Clover payment fields directly on your site
3. **API-Only Integration** -- Full custom control (higher PCI burden)
4. **Ecommerce Plugins** -- Pre-built for Shopify, WooCommerce, Adobe Commerce

---

## 2. Authentication

### OAuth 2.0 (v2 Flow -- Required for all new apps since October 2023)

Clover uses the industry-standard OAuth 2.0 framework. Apps created after October 2023 **must** use the v2/OAuth flow which produces **expiring token pairs** (access_token + refresh_token).

#### OAuth Endpoints by Environment

| Endpoint              | Sandbox                         | Production (NA)    | Production (EU)       | Production (LATAM)    |
|-----------------------|---------------------------------|--------------------|-----------------------|-----------------------|
| `/oauth/v2/authorize` | sandbox.dev.clover.com          | www.clover.com     | www.eu.clover.com     | www.la.clover.com     |
| `/oauth/v2/token`     | apisandbox.dev.clover.com       | api.clover.com     | api.eu.clover.com     | api.la.clover.com     |
| `/oauth/v2/refresh`   | apisandbox.dev.clover.com       | api.clover.com     | api.eu.clover.com     | api.la.clover.com     |

#### Flow Types
- **High-trust apps**: Standard authorization code flow
- **Low-trust apps**: Authorization code flow with PKCE

#### Token Lifecycle
1. Merchant authorizes your app at `/oauth/v2/authorize`
2. Clover redirects back with an authorization `code`
3. Exchange `code` for an `access_token` + `refresh_token` pair via `/oauth/v2/token`
4. Use `access_token` as a Bearer token in API requests
5. Before expiration, refresh using `/oauth/v2/refresh`

#### Making Authenticated Requests
```
Authorization: Bearer {access_token}
```

### Sandbox Test Tokens
For development, you can generate a merchant-specific test API token from the test Merchant Dashboard. These tokens do NOT expire but must never be used in production.

### Ecommerce PAKMS Key (Public Key)
For iframe tokenization, Clover provides a **public API access key (PAKMS key)** used client-side to tokenize card data. This is separate from the Bearer token (private key).

**To get the PAKMS key:**
```
GET https://scl-sandbox.dev.clover.com/pakms/apikey
Authorization: Bearer {access_token}
```
Response:
```json
{
  "active": true,
  "apiAccessKey": "af4exxxxxxxxxxxxxxxxxxxxxxxxd145",
  "createdTime": 1722230745532,
  "developerAppUuid": "RKxxxxxxxxx9C",
  "merchantUuid": "6Xxxxxxxxxx91",
  "modifiedTime": 1722230745532
}
```

---

## 3. Payment Flow

### Standard Charge Flow (No Order)

**Step 1: Get PAKMS Key** (server-side, one-time per merchant)
```
GET {ecommBaseUrl}/pakms/apikey
Authorization: Bearer {access_token}
```

**Step 2: Tokenize the Card** (client-side via iframe, or server-side if API-only)
```
POST https://token-sandbox.dev.clover.com/v1/tokens
Headers:
  apikey: {apiAccessKey}
  Content-Type: application/json

Body:
{
  "card": {
    "number": "6011361000006668",
    "exp_month": "12",
    "exp_year": "2030",
    "cvv": "123",
    "brand": "DISCOVER"
  }
}
```
Response:
```json
{
  "id": "clv_1TSTxxxxxxxxxxxxxxxxxFQif",
  "object": "token",
  "card": {
    "exp_month": "12",
    "exp_year": "2030",
    "first6": "601136",
    "last4": "6668",
    "brand": "DISCOVER"
  }
}
```
All tokens begin with `clv_`.

**Step 3: Create the Charge** (server-side)
```
POST {ecommBaseUrl}/v1/charges
Authorization: Bearer {access_token}
Content-Type: application/json
idempotency-key: {uuid-v4}
x-forwarded-for: {client_ip}

{
  "amount": 1800,
  "currency": "usd",
  "source": "clv_1TSTxxxxxxxxxxxxxxxxxFQif"
}
```

### Order-Based Payment Flow

**Step 1: Create an Order**
```
POST {ecommBaseUrl}/v1/orders
Authorization: Bearer {access_token}

{
  "currency": "usd",
  "customer": "{customer_uuid}",
  "email": "customer@example.com",
  "items": [
    {
      "amount": 1500,
      "currency": "usd",
      "description": "Service charge",
      "quantity": 1
    }
  ],
  "shipping": { ... }
}
```

**Step 2: Pay for the Order**
```
POST {ecommBaseUrl}/v1/orders/{orderId}/pay
Authorization: Bearer {access_token}

{
  "source": "clv_1TSTxxxxxxxxxxxxxxxxxFQif",
  "customer": "{customerId}",
  "ecomind": "ecom"
}
```

### Pre-Authorization + Capture
```
POST /v1/charges
{
  "amount": 5000,
  "currency": "usd",
  "source": "clv_...",
  "capture": false         <-- creates an auth hold, does not charge
}

POST /v1/charges/{chargeId}/capture    <-- capture later
```

### Tips
```json
{
  "amount": 1800,
  "tip_amount": 200,
  "currency": "usd",
  "source": "clv_..."
}
```
**Important:** Do NOT add tip to the amount. Submit both fields separately.

### Transaction Type Indicators
- `"ecomind": "ecom"` -- Customer enters card details (default, online)
- `"ecomind": "moto"` -- Merchant enters card details (phone/mail orders)

---

## 4. Clover Hosted Checkout & Iframe

### Option A: Hosted Checkout (HCO)

Customers are **redirected** to a Clover-hosted payment page (similar to Stripe Checkout).

**Flow:**
1. Create a checkout session via the Create Checkout API endpoint
2. Customize the page appearance (branding, colors)
3. Redirect customer to the Clover-hosted URL
4. Customer completes payment on Clover's page
5. Customer is redirected back to your success/failure URL
6. Receive webhook notification of payment result

**Features:**
- PCI DSS compliant -- Clover manages all card data
- Brand customization (colors, messaging)
- reCAPTCHA fraud protection for CNP transactions
- ACH payment support (TeleCheck)
- Real-time webhook notifications

**Limitations:**
- No integration with Clover's inventory system
- Default tax settings don't apply automatically

### Option B: Iframe Integration (Like Stripe Elements)

Embed Clover payment fields **directly on your site** using an iframe tokenizer.

**SDK URLs:**
- Sandbox: `https://checkout.sandbox.dev.clover.com/sdk.js`
- Production: `https://checkout.clover.com/sdk.js`

**HTML Setup:**
```html
<head>
  <script src="https://checkout.sandbox.dev.clover.com/sdk.js"></script>
</head>
<body>
  <form id="payment-form">
    <div id="card-number"></div>
    <div id="card-date"></div>
    <div id="card-cvv"></div>
    <div id="card-postal-code"></div>
    <button type="submit">Pay</button>
  </form>
</body>
```

**JavaScript Initialization:**
```javascript
const clover = new Clover('YOUR_API_ACCESS_KEY', {
    merchantId: 'xxxxxxxxxxxxx'
});
const elements = clover.elements();

// Create individual card fields
const cardNumber = elements.create('CARD_NUMBER', styles);
const cardDate   = elements.create('CARD_DATE', styles);
const cardCvv    = elements.create('CARD_CVV', styles);
const cardZip    = elements.create('CARD_POSTAL_CODE', styles);

// Mount to DOM
cardNumber.mount('#card-number');
cardDate.mount('#card-date');
cardCvv.mount('#card-cvv');
cardZip.mount('#card-postal-code');
```

**Available Element Types:**
| Element                  | Description                    |
|--------------------------|--------------------------------|
| `CARD_NUMBER`            | Card number input              |
| `CARD_DATE`              | Expiration date                |
| `CARD_CVV`              | Security code                  |
| `CARD_POSTAL_CODE`       | Billing postal code            |
| `CARD_NAME`              | Cardholder name                |
| `CARD_STREET_ADDRESS`    | Street address                 |
| `PAYMENT_REQUEST_BUTTON` | Digital wallet (Apple/Google)  |

**Tokenization on Submit:**
```javascript
document.getElementById('payment-form')
  .addEventListener('submit', function(event) {
    event.preventDefault();
    clover.createToken()
      .then(function(result) {
        if (result.errors) {
          // Handle validation errors
          Object.keys(result.errors).forEach(function(key) {
            console.error(key + ': ' + result.errors[key]);
          });
        } else {
          // Send token to your server
          submitTokenToServer(result.token);
        }
      });
  });
```

**Real-Time Validation:**
```javascript
cardNumber.addEventListener('change', function(event) {
  if (event.error) {
    showError(event.error.message);
  }
});
```

**Localization:** `en-US` (default), `en-CA`, `fr-CA`

**Browser Support:** Safari, Chrome, Firefox, Edge

---

## 5. Tokenization

### Single-Pay Tokens (One-Time Use)
Generated via iframe's `clover.createToken()` or direct API call to `/v1/tokens`. Tokens begin with `clv_` prefix. Used once for a single charge.

### Multi-Pay Tokens (Card-on-File / Recurring)
For saving cards and charging later:

**Step 1:** Create a single-pay `clv_` token (as above)

**Step 2:** Create a charge with card-saving intent:
```
POST /v1/charges
{
  "amount": 1100,
  "currency": "usd",
  "source": "clv_...",
  "stored_credentials": {
    "sequence": "FIRST",
    "initiator": "CARDHOLDER"
  }
}
```

**Step 3:** The response includes a **multi-pay TransArmor (TA) token** and a **multi-pay c-token**, which can be reused for future charges.

### Alternative: Save to Customer Profile
```
POST /v1/customers
{
  "source": "clv_...",
  "email": "customer@example.com"
}
```
Clover generates a multi-pay token automatically when a card is associated with a Customer object.

### Token Types Summary
| Token Type        | Prefix   | Reusable | Use Case                        |
|-------------------|----------|----------|---------------------------------|
| Single-pay token  | `clv_`   | No       | One-time charges                |
| Multi-pay c-token | varies   | Yes      | Recurring / saved card charges  |
| TransArmor token  | varies   | Yes      | Card-on-file transactions       |

---

## 6. Clover Ecommerce API

The Ecommerce API is Clover's purpose-built API for **online/card-not-present transactions**.

### Key Ecommerce Endpoints

| Method | Endpoint                             | Description                        |
|--------|--------------------------------------|------------------------------------|
| POST   | `/v1/tokens`                         | Tokenize a card                    |
| POST   | `/v1/charges`                        | Create a charge                    |
| POST   | `/v1/charges/{chargeId}/capture`     | Capture a pre-authorized charge    |
| POST   | `/v1/orders`                         | Create an order                    |
| POST   | `/v1/orders/{orderId}/pay`           | Pay for an order                   |
| POST   | `/v1/customers`                      | Create a customer with saved card  |
| POST   | `/v1/refunds`                        | Process a refund                   |
| GET    | `/v1/charges/{chargeId}`             | Retrieve charge details            |
| GET    | `/v1/orders/{orderId}`               | Retrieve order details             |

### Required Fields for Charges
| Field              | Type    | Required | Description                                 |
|--------------------|---------|----------|---------------------------------------------|
| `amount`           | integer | Yes      | Amount in cents (e.g., 1800 = $18.00)       |
| `currency`         | string  | Yes      | ISO 4217 code, lowercase (e.g., "usd")      |
| `source`           | string  | Yes      | Tokenized card ID (`clv_...`)               |
| `idempotency-key`  | header  | Yes      | UUID v4 to prevent duplicate charges        |
| `tax_rate_uuid`    | string  | No       | Merchant's tax rate identifier              |
| `tax_amount`       | integer | No       | Flat tax amount in cents                    |
| `tip_amount`       | integer | No       | Tip amount in cents                         |
| `capture`          | boolean | No       | `false` for pre-auth only (default: `true`) |
| `ecomind`          | string  | No       | `"ecom"` or `"moto"`                        |

### Alternate Tenders (Non-Card Payments)
```json
{
  "source": "alternate_tender",
  "tender": {
    "label_key": "com.clover.tender.cash"
  },
  "amount": 1833,
  "currency": "usd"
}
```
Built-in tenders: `com.clover.tender.cash`, `com.clover.tender.check`

### Recurring Payments API

**Plans:**
| Method | Endpoint                                      | Description             |
|--------|-----------------------------------------------|-------------------------|
| POST   | `/recurring/v1/plans`                         | Create a billing plan   |
| GET    | `/recurring/v1/plans`                         | List all plans          |
| GET    | `/recurring/v1/plans/{planId}`                | Get a plan              |

**Subscriptions:**
| Method | Endpoint                                              | Description              |
|--------|-------------------------------------------------------|--------------------------|
| POST   | `/recurring/v1/plans/{planId}/subscriptions`          | Create a subscription    |
| GET    | `/recurring/v1/subscriptions`                         | List all subscriptions   |
| GET    | `/recurring/v1/subscriptions/{subscriptionId}`        | Get a subscription       |
| PUT    | `/recurring/v1/subscriptions/{subscriptionId}`        | Update a subscription    |
| DELETE | `/recurring/v1/subscriptions/{subscriptionId}`        | Delete a subscription    |

**Subscription Creation:**
```json
POST /recurring/v1/plans/{planId}/subscriptions
Headers:
  Authorization: Bearer {access_token}
  X-Clover-Merchant-Id: {merchantId}

{
  "customerId": "{customer_uuid}",
  "collectionMethod": "CHARGE_AUTOMATICALLY",
  "startDate": "2026-03-01T00:00:00Z",
  "amount": 4999,
  "taxRateUuids": ["{tax_uuid}"]
}
```

**Note:** Subscriptions auto-deactivate after 5 consecutive payment failures.

---

## 7. API Base URLs

### REST API (Platform / Merchant Data)
| Environment         | Base URL                              |
|---------------------|---------------------------------------|
| Sandbox             | `https://apisandbox.dev.clover.com`   |
| Production (NA)     | `https://api.clover.com`              |
| Production (EU)     | `https://api.eu.clover.com`           |
| Production (LATAM)  | `https://api.la.clover.com`           |

### Ecommerce API (Charges, Orders, Refunds)
| Environment         | Base URL                              |
|---------------------|---------------------------------------|
| Sandbox             | `https://scl-sandbox.dev.clover.com`  |
| Production (NA)     | `https://scl.clover.com`             |
| Production (EU)     | `https://scl.eu.clover.com`          |
| Production (LATAM)  | `https://scl.la.clover.com`          |

### Tokenization API
| Environment         | Base URL                                |
|---------------------|-----------------------------------------|
| Sandbox             | `https://token-sandbox.dev.clover.com`  |
| Production (NA)     | `https://token.clover.com`             |
| Production (EU)     | `https://token.eu.clover.com`          |
| Production (LATAM)  | `https://token.la.clover.com`          |

### OAuth Endpoints
| Environment         | Authorize URL                     | Token URL                          |
|---------------------|-----------------------------------|------------------------------------|
| Sandbox             | sandbox.dev.clover.com            | apisandbox.dev.clover.com          |
| Production (NA)     | www.clover.com                    | api.clover.com                     |
| Production (EU)     | www.eu.clover.com                 | api.eu.clover.com                  |
| Production (LATAM)  | www.la.clover.com                 | api.la.clover.com                  |

### Iframe SDK
| Environment  | URL                                              |
|--------------|--------------------------------------------------|
| Sandbox      | `https://checkout.sandbox.dev.clover.com/sdk.js` |
| Production   | `https://checkout.clover.com/sdk.js`             |

---

## 8. Key Endpoints Reference

### Complete Endpoint Map

**Tokenization:**
```
POST /v1/tokens                              -- Tokenize card/ACH/Apple Pay
GET  /pakms/apikey                           -- Get PAKMS public key
```

**Charges:**
```
POST /v1/charges                             -- Create a charge
GET  /v1/charges/{chargeId}                  -- Get charge details
POST /v1/charges/{chargeId}/capture          -- Capture pre-authorized charge
```

**Orders (Ecommerce):**
```
POST /v1/orders                              -- Create an order
GET  /v1/orders/{orderId}                    -- Get order details
POST /v1/orders/{orderId}/pay                -- Pay for an order
POST /v1/orders/{orderId}/returns            -- Return/refund an order
```

**Customers:**
```
POST /v1/customers                           -- Create customer (with card-on-file)
GET  /v1/customers/{customerId}              -- Get customer details
PUT  /v1/customers/{customerId}              -- Update customer
```

**Refunds:**
```
POST /v1/refunds                             -- Create a refund
GET  /v1/refunds/{refundId}                  -- Get refund details
```

**Recurring:**
```
POST /recurring/v1/plans                     -- Create a plan
POST /recurring/v1/plans/{planId}/subscriptions  -- Create a subscription
GET  /recurring/v1/subscriptions             -- List subscriptions
PUT  /recurring/v1/subscriptions/{id}        -- Update subscription
DELETE /recurring/v1/subscriptions/{id}      -- Delete subscription
```

**Platform REST API (Merchant Data):**
```
GET /v3/merchants/{mId}                      -- Get merchant info
GET /v3/merchants/{mId}/customers            -- List customers
GET /v3/merchants/{mId}/orders               -- List orders
GET /v3/merchants/{mId}/payments             -- List payments
GET /v3/merchants/{mId}/items                -- List inventory items
```

---

## 9. Webhook Support

### Yes, Clover supports webhooks.

### Setup Process
1. Go to Developer Dashboard > Your Apps > App Settings > Webhooks
2. Enter your HTTPS callback URL (must be publicly accessible, no localhost)
3. Click "Send Verification Code" -- Clover POSTs a verification payload
4. Copy the verification code from the POST and paste it back to confirm
5. Select event types to subscribe to

### Webhook Payload Format
```json
{
  "appId": "YOUR_APP_ID",
  "merchants": {
    "MERCHANT_ID": [
      {
        "objectId": "key:event-object-id",
        "type": "CREATE",
        "ts": 1537970958000
      }
    ]
  }
}
```
`type` values: `CREATE`, `UPDATE`, `DELETE`

### Available Event Types

| Key | Event Category       | Required Permission |
|-----|----------------------|---------------------|
| A   | Apps (install/uninstall) | Read merchant   |
| C   | Customers            | Read customers      |
| CA  | Cash adjustments     | Read merchant       |
| E   | Employees            | Read employees      |
| I   | Inventory items      | Read inventory      |
| IC  | Inventory categories | Read inventory      |
| IG  | Inventory modifier groups | Read inventory |
| IM  | Inventory modifiers  | Read inventory      |
| **O** | **Orders**         | **Read orders**     |
| M   | Merchants            | Read merchant       |
| **P** | **Payments**       | **Read payments**   |
| SH  | Service hours        | Read merchant       |

**For a CRM integration, you primarily want `P` (Payments) and `O` (Orders).**

### Webhook Security
- Validate using the `X-Clover-Auth` header
- HMAC-based signature verification with a secret key
- Must respond with `200 OK` status code

### Hosted Checkout Webhooks
Hosted Checkout has its own webhook configuration for payment-specific events. After a customer completes a payment on the Hosted Checkout page, a webhook notification is sent to the configured URL.

---

## 10. PCI DSS Compliance

### Clover's Compliance
Clover is **PCI DSS compliant**, validated by a Qualified Security Assessor (QSA). All payments processed through the Ecommerce API are PCI compliant.

### Your Compliance Burden by Integration Type

| Integration Type   | PCI Burden | SAQ Level | Notes                                          |
|--------------------|------------|-----------|------------------------------------------------|
| Hosted Checkout    | **Lowest** | SAQ A     | Clover hosts entire payment page               |
| Iframe Integration | **Low**    | SAQ A     | Card data never touches your server             |
| API-Only           | **High**   | Full SAQ D / AOC | You handle raw card data; need PCI cert |
| Plugins            | **Minimal**| SAQ A     | Platform handles compliance                    |

### Recommendation for CRM Integration
**Use the iframe integration.** It provides:
- SAQ A eligibility (smallest PCI compliance scope)
- Full UI customization on your site
- Card data goes directly from customer browser to Clover
- No card data on your servers ever

### PCI DSS v4.0 Requirements (Effective April 1, 2025)
Two new requirements apply to all ecommerce integrations:

**Requirement 6.4.3:**
- All scripts on payment pages must be authorized with justification
- Script inventory must be maintained
- Integrity of each script must be verified
- Regular scans for unauthorized scripts

**Requirement 11.6.1:**
- Regular evaluation of HTTP headers and payment pages
- Detect unauthorized changes to scripts
- Immediate alerts to authorized personnel

**You are responsible** for maintaining PCI DSS v4.0 compliance on your merchant-facing pages, even when using the iframe integration.

---

## 11. Best Practices 2026 for CRM Integration

### Architecture Recommendations

1. **Use the Iframe for Payment Collection**
   - Embed Clover's iframe elements on your CRM's invoice/payment pages
   - Customer card data never touches your server (SAQ A eligible)
   - Style the iframe elements to match your CRM's UI

2. **Save Cards as Customer Profiles**
   - Use `/v1/customers` with `source` to save cards
   - Clover generates multi-pay tokens for future charges
   - Link Clover `customerId` to your CRM's client record

3. **Use Order-Based Payments for Invoices**
   - Map CRM invoices to Clover orders via `POST /v1/orders`
   - Associate line items, tax, and tips properly
   - Pay orders with `POST /v1/orders/{orderId}/pay`

4. **Implement Recurring Billing**
   - Use the Recurring APIs for subscription services
   - Create plans with billing intervals
   - Auto-deactivation after 5 failed attempts (handle gracefully)

5. **Always Use Idempotency Keys**
   - Generate UUID v4 for every charge/payment request
   - Prevents double-charging on network retries
   - Store idempotency keys alongside payment records

6. **Use Webhooks for Real-Time Sync**
   - Subscribe to `P` (Payments) and `O` (Orders) events
   - Update CRM payment status in real-time
   - Validate webhooks using HMAC signature verification

7. **Token Management**
   - Store multi-pay tokens (never raw card data)
   - Associate tokens with customer records in your CRM
   - Handle token expiration/renewal gracefully

8. **Environment Separation**
   - Use sandbox for all development and testing
   - Never use sandbox tokens in production
   - Use environment variables for base URLs and keys

9. **Error Handling**
   - Handle Clover API error codes gracefully
   - Implement retry logic with exponential backoff
   - Log all payment attempts and responses for audit trail

10. **Security**
    - Store OAuth tokens encrypted at rest
    - Rotate refresh tokens before expiration
    - Never expose PAKMS keys or Bearer tokens client-side
    - Implement Content Security Policy (CSP) headers for iframe pages
    - Monitor for PCI DSS v4.0 compliance (script integrity checks)

### Typical CRM Payment Integration Architecture

```
[CRM Frontend (React)]
    |
    |-- Clover iframe SDK (card input)
    |       |
    |       +--> clover.createToken() --> Clover servers
    |                                        |
    |                                   clv_ token returned
    |
    |-- POST /api/payments (your server) <-- clv_ token
            |
            +--> POST /v1/charges (Clover Ecommerce API)
            |       Authorization: Bearer {access_token}
            |       { amount, currency, source: "clv_..." }
            |
            +--> Response: charge ID, status, ref_num
            |
            +--> Update CRM database (payment record)
            |
[Clover Webhooks]
    |
    +--> POST /webhooks/clover (your server)
            |
            +--> Verify HMAC signature
            +--> Update payment status in CRM
```

### Invoice Payment Flow for Service CRM

```
1. Technician completes job -> CRM creates invoice
2. CRM creates Clover order (POST /v1/orders)
3. Email/SMS sent to customer with payment link
4. Customer opens link -> sees embedded Clover iframe
5. Customer enters card -> iframe tokenizes to clv_ token
6. Your server charges token (POST /v1/orders/{id}/pay)
7. Webhook confirms payment -> CRM marks invoice as paid
8. Customer option: save card for future payments
9. If saved -> multi-pay token stored for recurring charges
```

---

## Quick Start Checklist

- [ ] Create a Clover developer account at https://sandbox.dev.clover.com/developer-home/create-account
- [ ] Create a test app and configure permissions (Payments, Orders, Customers)
- [ ] Generate a test merchant API token for sandbox testing
- [ ] Implement OAuth v2 flow for production merchant onboarding
- [ ] Integrate Clover iframe SDK for client-side card tokenization
- [ ] Implement server-side charge creation via `/v1/charges`
- [ ] Set up webhook endpoint for payment notifications
- [ ] Test full flow in sandbox with test card numbers
- [ ] Complete PCI DSS SAQ A self-assessment
- [ ] Verify PCI DSS v4.0 compliance (Requirements 6.4.3 and 11.6.1)
- [ ] Switch base URLs to production and deploy

---

## Sources

- [Clover Ecommerce API -- Accept Payments Flow](https://docs.clover.com/dev/docs/ecommerce-api-payments-flow)
- [Clover Iframe Integrations](https://docs.clover.com/dev/docs/clover-iframe-integrations)
- [Create a Payment Form (Hosted Iframe)](https://docs.clover.com/dev/docs/using-the-clover-hosted-iframe)
- [Hosted Checkout Integration](https://docs.clover.com/dev/docs/hosted-checkout-api)
- [Ecommerce Integration Types](https://docs.clover.com/dev/docs/ecommerce-integration-types)
- [OAuth v2 Flow](https://docs.clover.com/dev/docs/use-oauth)
- [Generate Test API Token](https://docs.clover.com/dev/docs/generate-a-test-api-token)
- [OAuth Expiring Token Overview](https://docs.clover.com/dev/docs/generate-an-oauth-api-token-or-access_token)
- [Use Clover REST API](https://docs.clover.com/dev/docs/making-rest-api-calls)
- [Accept Payments and Tips](https://docs.clover.com/dev/docs/ecommerce-accepting-payments)
- [Create Multi-Pay Tokens](https://docs.clover.com/dev/docs/create-a-transarmor-token)
- [Webhooks](https://docs.clover.com/dev/docs/webhooks)
- [Hosted Checkout Webhooks](https://docs.clover.com/dev/docs/ecomm-hosted-checkout-webhook)
- [Recurring Payments -- Subscriptions](https://docs.clover.com/dev/docs/recurring-apis-subscriptions)
- [API Reference Overview](https://docs.clover.com/dev/reference/api-reference-overview)
- [Ecommerce Services APIs](https://docs.clover.com/dev/docs/ecommerce-api-tutorials)
- [PCI DSS v4.0 Requirements](https://docs.clover.com/dev/docs/pci-dss-version-40-requirements-643-and-1161)
- [PCI Security Guidance for Developers](https://docs.clover.com/dev/docs/pci-security-guidance-for-app-developers)
- [Ecommerce FAQs](https://docs.clover.com/dev/docs/ecommerce-faqs)
- [Payment Gateway Integration Guide 2026](https://trio.dev/payment-gateway-integration/)
- [Best Payment APIs for Developers 2026](https://blog.postman.com/best-payment-apis-for-developers/)
- [CRMs with Payment Processing 2025](https://assembly.com/blog/crm-with-payment-processing)
