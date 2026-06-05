import { initMailchimp, upsertMember, addTags } from '../lib/mailchimp.js';
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

    // 2) Initialize Mailchimp
    const mailchimpConfig = initMailchimp();

    // 3) Normalize phone
    const normalizedPhone = normalizePhone(countryCode, phoneNumber);

    // 4) Merge all address-related inputs into one Mailchimp ADDRESS field
    const mergedAddress = [address, address2, city, province, postalCode, country]
      .map(value => (value || '').trim())
      .filter(Boolean)
      .join(', ');

    // 5) Prepare merge fields using environment variable keys
    const mergeFields = {
      [process.env.MAILCHIMP_FIELD_FNAME || 'FNAME']: firstName.trim(),
      [process.env.MAILCHIMP_FIELD_LNAME || 'LNAME']: lastName.trim(),
      [process.env.MAILCHIMP_FIELD_COUNTRY || 'COUNTRY']: country.trim(),
      [process.env.MAILCHIMP_FIELD_COMPATTN || 'COMPATTN']: companyAttention.trim(),
      [process.env.MAILCHIMP_FIELD_ADDRESS || 'ADDRESS']: mergedAddress,
      [process.env.MAILCHIMP_FIELD_PHONE || 'PHONE']: normalizedPhone,
      [process.env.MAILCHIMP_FIELD_CMPDESC || 'CMPDESC']: companyDescription.trim(),
      [process.env.MAILCHIMP_FIELD_WEBSITE || 'WEBSITE']: (website || '').trim(),
      [process.env.MAILCHIMP_FIELD_SOCIAL || 'SOCIAL']: (socialMediaHandle || '').trim(),
      [process.env.MAILCHIMP_FIELD_ESTVOL || 'ESTVOL']: estimatedOrderVolume.trim()
    };

    // 6) Upsert member to Mailchimp
    await upsertMember(mailchimpConfig, {
      email_address: email.trim(),
      status_if_new: 'pending',
      merge_fields: mergeFields
    });

    // 7) Add tag
    await addTags(mailchimpConfig, email.trim(), ['CONTACT_WHOLESALE']);

    // 8) Return success
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
