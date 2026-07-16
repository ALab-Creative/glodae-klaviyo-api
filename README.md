# Klaviyo Contact Forms API

A Vercel-hosted Node.js API for Shopify contact forms (regular + wholesale) that posts to Klaviyo.

## Project Structure

```text
mailchimp-form-api/
├── api/
│   ├── contact.js         # Regular contact form handler
│   └── wholesale.js       # Wholesale contact form handler
├── lib/
│   ├── klaviyo.js         # Klaviyo client utilities
│   └── validate.js        # Form field validation
├── package.json           # Dependencies
├── vercel.json            # Vercel config
├── .env.example           # Environment variables template
└── README.md              # This file
```

## Setup

### 1. Get Klaviyo Credentials

1. In Klaviyo, create a private API key.
2. Copy the list ID for your regular-contact list.
3. Copy the list ID for your wholesale-contact list.
4. Keep your Shopify storefront domain ready for CORS.

### 2. Configure Environment

Copy .env.example to .env.local and fill in values.

```bash
cp .env.example .env.local
```

Example:

```env
KLAVIYO_PRIVATE_API_KEY=your_private_api_key_here
KLAVIYO_API_REVISION=2024-10-15
KLAVIYO_LIST_ID_REGULAR=your_regular_list_id_here
KLAVIYO_LIST_ID_WHOLESALE=your_wholesale_list_id_here
ALLOWED_ORIGIN=https://your-store.com
```

### 3. Run Locally

```bash
npm install
npm run dev
```

Endpoints:
- http://localhost:3000/api/contact
- http://localhost:3000/api/wholesale

## API Endpoints

### POST /api/contact

Submits regular-form profiles to Klaviyo list KLAVIYO_LIST_ID_REGULAR.

Request body:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "country": "Canada",
  "countryCode": "+1",
  "phoneNumber": "5551234567",
  "email": "jane@example.com",
  "message": "I would like more information."
}
```

### POST /api/wholesale

Submits wholesale-form profiles to Klaviyo list KLAVIYO_LIST_ID_WHOLESALE.

Request body:

```json
{
  "country": "Canada",
  "firstName": "Jane",
  "lastName": "Doe",
  "companyAttention": "Acme Buying Team",
  "address": "123 Main St",
  "address2": "Suite 201",
  "city": "Toronto",
  "province": "Ontario",
  "postalCode": "M5V 2T6",
  "countryCode": "+1",
  "phoneNumber": "5551234567",
  "email": "buyer@acme.com",
  "companyDescription": "Independent beauty retailer with 3 stores",
  "website": "https://acme.com",
  "socialMediaHandle": "@acme",
  "estimatedOrderVolume": "$5,000 / month"
}
```

Success response for /api/contact:

```json
{
  "ok": true,
  "message": "Contact form submitted successfully"
}
```

Success response for /api/wholesale:

```json
{
  "ok": true,
  "message": "Wholesale form submitted successfully"
}
```

## Deploy

Deploy with Vercel and set all environment variables from .env.example in the Vercel project settings.

## Security Notes

1. Restrict ALLOWED_ORIGIN to your real storefront domain.
2. Never commit .env.local.
3. Keep the honeypot field in Shopify form HTML to reduce spam.
4. Add rate-limiting before production if traffic is high.

## Support

- Klaviyo docs: https://developers.klaviyo.com
- Vercel docs: https://vercel.com/docs
