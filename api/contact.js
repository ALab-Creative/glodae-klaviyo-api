import { initKlaviyo, createProfileSubscriptionJob } from '../lib/klaviyo.js';
import { validateContactPayload, normalizePhone } from '../lib/validate.js';

/**
 * POST /api/contact
 * Handler for regular contact form submissions
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  try {
    // 1) Validate payload
    const { firstName, lastName, country, countryCode, phoneNumber, email, message } = req.body || {};
    const validationErrors = validateContactPayload({
      firstName,
      lastName,
      country,
      countryCode,
      phoneNumber,
      email,
      message
    });

    if (validationErrors) {
      return res.status(400).json({
        ok: false,
        message: 'Validation error',
        errors: validationErrors
      });
    }

    // 2) Initialize Klaviyo
    const klaviyoConfig = initKlaviyo();

    // 3) Combine country code and local number into one normalized phone value
    const normalizedPhone = normalizePhone(countryCode, phoneNumber);

    // 4) Build Klaviyo profile attributes
    const profileAttributes = {
      email: email.trim().toLowerCase(),
      phone_number: normalizedPhone,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      properties: {
        form_variant: 'regular',
        country: country.trim(),
        message: message.trim()
      }
    };

    // 5) Submit Klaviyo subscription job
    await createProfileSubscriptionJob(klaviyoConfig, {
      listId: klaviyoConfig.listIdRegular,
      profile: profileAttributes,
      source: 'Shopify Contact Form - Regular'
    });

    // 6) Return success
    return res.status(200).json({
      ok: true,
      message: 'Contact form submitted successfully'
    });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
}
