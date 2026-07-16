import { initKlaviyo, createProfileSubscriptionJob, upsertProfile } from '../lib/klaviyo.js';
import { validateWholesalePayload, normalizePhone } from '../lib/validate.js';

/**
 * POST /api/wholesale
 * Handler for wholesale contact form submissions
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
    const {
      country,
      firstName,
      lastName,
      companyAttention,
      address,
      address2,
      city,
      province,
      postalCode,
      countryCode,
      phoneNumber,
      email,
      companyDescription,
      website,
      socialMediaHandle,
      estimatedOrderVolume
    } = req.body || {};

    const validationErrors = validateWholesalePayload({
      country,
      firstName,
      lastName,
      companyAttention,
      address,
      address2,
      city,
      province,
      postalCode,
      countryCode,
      phoneNumber,
      email,
      companyDescription,
      website,
      socialMediaHandle,
      estimatedOrderVolume
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

    // 3) Normalize phone
    const normalizedPhone = normalizePhone(countryCode, phoneNumber);

    // 4) Build Klaviyo profile attributes
    const profileAttributes = {
      email: email.trim().toLowerCase(),
      phone_number: normalizedPhone,
      properties: {
        form_variant: 'wholesale',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        company_attention: companyAttention.trim(),
        company_description: String(companyDescription || '').trim(),
        website: (website || '').trim(),
        social_media_handle: (socialMediaHandle || '').trim(),
        estimated_order_volume: estimatedOrderVolume.trim(),
        address1: address.trim(),
        address2: (address2 || '').trim(),
        city: city.trim(),
        region: (province || '').trim(),
        zip: postalCode.trim(),
        country: country.trim()
      }
    };

    // 5) Submit Klaviyo subscription job
    await createProfileSubscriptionJob(klaviyoConfig, {
      listId: klaviyoConfig.listIdWholesale,
      profile: profileAttributes,
      source: 'Shopify Contact Form - Wholesale'
    });

    // 6) Upsert additional profile attributes and custom properties
    await upsertProfile(klaviyoConfig, {
      email: email.trim().toLowerCase(),
      phone_number: normalizedPhone,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      location: {
        address1: address.trim(),
        address2: (address2 || '').trim(),
        city: city.trim(),
        region: (province || '').trim(),
        zip: postalCode.trim(),
        country: country.trim()
      },
      properties: {
        form_variant: 'wholesale',
        company_attention: companyAttention.trim(),
        company_description: String(companyDescription || '').trim(),
        website: (website || '').trim(),
        social_media_handle: (socialMediaHandle || '').trim(),
        estimated_order_volume: estimatedOrderVolume.trim()
      }
    });

    // 7) Return success
    return res.status(200).json({
      ok: true,
      message: 'Wholesale form submitted successfully'
    });
  } catch (error) {
    console.error('Wholesale form error:', error);
    return res.status(500).json({
      ok: false,
      message: 'Internal server error'
    });
  }
}
