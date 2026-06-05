# Mailchimp Contact Forms API

A Vercel-hosted Node.js API for Shopify contact forms (regular + wholesale) that posts to Mailchimp.

## Project Structure

```
mailchimp-form-api/
├── api/
│   ├── contact.js         # Regular contact form handler
│   └── wholesale.js       # Wholesale contact form handler
├── lib/
│   ├── mailchimp.js       # Mailchimp client utilities
│   └── validate.js        # Form field validation
├── package.json           # Dependencies
├── vercel.json           # Vercel config
├── .env.example          # Environment variables template
└── README.md             # This file
```

## Setup Steps

### 1. Get Mailchimp Credentials

1. Log into your Mailchimp account.
2. Go to **Account > Extras > API keys**.
3. Copy your API key (format: `xxxxxxxx-us21`).
4. Extract the server prefix (the two-letter code after the dash, e.g., `us21`).
5. Go to **Audiences > Your Audience > Settings > Audience name and defaults**.
6. Copy your Audience ID.
7. Verify your merge field tags match the ones in `.env.example`.

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your Mailchimp credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MAILCHIMP_API_KEY=xxxxxxxx-us21
MAILCHIMP_SERVER_PREFIX=us21
MAILCHIMP_AUDIENCE_ID=your-audience-id
ALLOWED_ORIGIN=https://your-store.com
```

**Important:** Update the merge field environment variables to match your exact Mailchimp merge tag names:

```env
MAILCHIMP_FIELD_FNAME=FNAME          # or your actual tag
MAILCHIMP_FIELD_LNAME=LNAME          # or your actual tag
# ... etc for all fields
```

### 3. Local Development

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

The API will be available at `http://localhost:3000/api/contact` and `http://localhost:3000/api/wholesale`.

#### Test with cURL

**Regular contact form:**

```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Jane",
    "lastName": "Doe",
    "country": "Canada",
    "countryCode": "+1",
    "phoneNumber": "5551234567",
    "email": "jane@example.com",
    "message": "I would like more information."
  }'
```

**Wholesale form:**

```bash
curl -X POST http://localhost:3000/api/wholesale \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

### 4. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

Follow prompts and add your environment variables when prompted.

#### Option B: Using Vercel Dashboard

1. Push code to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **Add New > Project**.
4. Select your GitHub repo.
5. Under **Environment Variables**, add:
   - `MAILCHIMP_API_KEY`
   - `MAILCHIMP_SERVER_PREFIX`
   - `MAILCHIMP_AUDIENCE_ID`
   - `ALLOWED_ORIGIN`
   - All `MAILCHIMP_FIELD_*` variables

6. Click **Deploy**.

#### Option C: Direct Vercel CLI with env

```bash
vercel --prod \
  --env MAILCHIMP_API_KEY=xxxxxxxx-us21 \
  --env MAILCHIMP_SERVER_PREFIX=us21 \
  --env MAILCHIMP_AUDIENCE_ID=xxxxx \
  --env ALLOWED_ORIGIN=https://your-store.com
```

## API Endpoints

### POST `/api/contact`

**Request body:**

```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "country": "string (required, country name)",
  "countryCode": "string (required, phone prefix e.g. '+1')",
  "phoneNumber": "string (required)",
  "email": "string (required, valid email)",
  "message": "string (required, 1-5000 chars)"
}
```

**Success response (200):**

```json
{
  "ok": true,
  "message": "Contact form submitted successfully"
}
```

**Error response (400/500):**

```json
{
  "ok": false,
  "message": "Validation error",
  "errors": {
    "email": "Email format is invalid"
  }
}
```

### POST `/api/wholesale`

Wholesale mapping note:
- Address-related inputs (`address`, `address2`, `city`, `province`, `postalCode`, `country`) are merged into one Mailchimp merge field: `ADDRESS`.
- `countryCode` is only used to build `PHONE` (`countryCode + phoneNumber`) and is not posted as its own Mailchimp merge field.

**Request body:**

```json
{
  "country": "string (required)",
  "firstName": "string (required)",
  "lastName": "string (required)",
  "companyAttention": "string (required)",
  "address": "string (required)",
  "address2": "string (optional)",
  "city": "string (required)",
  "province": "string (required)",
  "postalCode": "string (required)",
  "countryCode": "string (required)",
  "phoneNumber": "string (required)",
  "email": "string (required, valid email)",
  "companyDescription": "string (required, 10-1000 chars)",
  "website": "string (optional, valid URL)",
  "socialMediaHandle": "string (optional)",
  "estimatedOrderVolume": "string (required)"
}
```

**Success response (200):**

```json
{
  "ok": true,
  "message": "Wholesale form submitted successfully"
}
```

**Error response (400/500):**

```json
{
  "ok": false,
  "message": "Validation error",
  "errors": {
    "companyDescription": "Company description must be at least 10 characters"
  }
}
```

## Shopify Integration

In your Shopify theme JavaScript:

```javascript
// Regular contact form
async function submitContactForm(formData) {
  const response = await fetch('https://your-vercel-domain.vercel.app/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const result = await response.json();
  if (result.ok) {
    alert('Thank you for contacting us!');
  } else {
    alert('Error: ' + (result.errors ? JSON.stringify(result.errors) : result.message));
  }
}

// Wholesale contact form
async function submitWholesaleForm(formData) {
  const response = await fetch('https://your-vercel-domain.vercel.app/api/wholesale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  const result = await response.json();
  if (result.ok) {
    alert('Thank you for your interest in wholesale!');
  } else {
    alert('Error: ' + (result.errors ? JSON.stringify(result.errors) : result.message));
  }
}
```

## Security Notes

1. **CORS**: The API accepts requests from `ALLOWED_ORIGIN` only. Update this to your Shopify store domain.
2. **API Key**: Never commit `.env.local` to git. Use `.env.example` as template.
3. **Rate Limiting**: Consider adding rate limiting middleware before production.
4. **Input Validation**: All inputs are validated server-side.
5. **Honeypot**: Consider adding a honeypot field in your Shopify forms to reduce spam.

## Troubleshooting

### "Missing Mailchimp credentials"

Ensure `.env.local` has all three required variables and `npm run dev` is reading them correctly.

### "Mailchimp upsert failed"

- Check that your Audience ID is correct.
- Verify merge field tag names match your Mailchimp setup.
- Ensure API key has proper permissions.

### CORS errors

- Update `ALLOWED_ORIGIN` in `.env.local` to your exact Shopify domain.
- Test preflight with: `curl -X OPTIONS http://localhost:3000/api/contact -H "Origin: https://your-store.com"`

## Support

For Mailchimp API docs, see: https://mailchimp.com/developer/marketing/api/
For Vercel docs, see: https://vercel.com/docs/

## License

MIT
