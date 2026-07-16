/**
 * Utility functions for form field validation
 */

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function isValidUrl(url) {
  if (!url) return true; // optional field
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Normalize phone number (remove spaces, dashes)
 */
export function normalizePhone(countryCode, phoneNumber) {
  const cc = String(countryCode || '').replace(/[^\d+]/g, '');
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  const combined = `${cc}${digits}`.replace(/\s+/g, '');

  // Enforce a leading plus for E.164-style phone formatting.
  return combined.startsWith('+') ? combined : `+${combined.replace(/^\++/, '')}`;
}

/**
 * Determine whether a country value should be treated as United States.
 */
export function isUnitedStatesCountry(country) {
  const normalized = String(country || '').trim().toLowerCase();
  return (
    normalized === 'united states' ||
    normalized === 'united states of america' ||
    normalized === 'usa' ||
    normalized === 'us'
  );
}

/**
 * Validate regular contact form payload
 */
export function validateContactPayload(data) {
  const errors = {};

  // First name
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length > 60) {
    errors.firstName = 'First name must be 60 characters or less';
  }

  // Last name
  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length > 60) {
    errors.lastName = 'Last name must be 60 characters or less';
  }

  // Country name
  if (!data.country || typeof data.country !== 'string' || data.country.trim().length === 0) {
    errors.country = 'Country is required';
  } else if (data.country.length > 80) {
    errors.country = 'Country must be 80 characters or less';
  }

  // Country code
  if (!data.countryCode || typeof data.countryCode !== 'string' || data.countryCode.trim().length === 0) {
    errors.countryCode = 'Country code is required';
  } else if (data.countryCode.length > 8) {
    errors.countryCode = 'Country code must be 8 characters or less';
  }

  // Phone number
  if (!data.phoneNumber || typeof data.phoneNumber !== 'string' || data.phoneNumber.trim().length === 0) {
    errors.phoneNumber = 'Phone number is required';
  } else if (data.phoneNumber.length > 20) {
    errors.phoneNumber = 'Phone number must be 20 characters or less';
  }

  // Email
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Email format is invalid';
  } else if (data.email.length > 254) {
    errors.email = 'Email must be 254 characters or less';
  }

  // Message
  if (!data.message || typeof data.message !== 'string' || data.message.trim().length === 0) {
    errors.message = 'Message is required';
  } else if (data.message.length > 5000) {
    errors.message = 'Message must be 5000 characters or less';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validate wholesale contact form payload
 */
export function validateWholesalePayload(data) {
  const errors = {};

  // Country
  if (!data.country || typeof data.country !== 'string' || data.country.trim().length === 0) {
    errors.country = 'Country is required';
  }

  // First name
  if (!data.firstName || typeof data.firstName !== 'string' || data.firstName.trim().length === 0) {
    errors.firstName = 'First name is required';
  } else if (data.firstName.length > 60) {
    errors.firstName = 'First name must be 60 characters or less';
  }

  // Last name
  if (!data.lastName || typeof data.lastName !== 'string' || data.lastName.trim().length === 0) {
    errors.lastName = 'Last name is required';
  } else if (data.lastName.length > 60) {
    errors.lastName = 'Last name must be 60 characters or less';
  }

  // Company / Attention
  if (!data.companyAttention || typeof data.companyAttention !== 'string' || data.companyAttention.trim().length < 2) {
    errors.companyAttention = 'Company/Attention must be at least 2 characters';
  } else if (data.companyAttention.length > 120) {
    errors.companyAttention = 'Company/Attention must be 120 characters or less';
  }

  // Address
  if (!data.address || typeof data.address !== 'string' || data.address.trim().length < 5) {
    errors.address = 'Address must be at least 5 characters';
  } else if (data.address.length > 120) {
    errors.address = 'Address must be 120 characters or less';
  }

  // Address 2 (optional)
  if (data.address2 && data.address2.length > 120) {
    errors.address2 = 'Address 2 must be 120 characters or less';
  }

  // City
  if (!data.city || typeof data.city !== 'string' || data.city.trim().length < 2) {
    errors.city = 'City must be at least 2 characters';
  } else if (data.city.length > 80) {
    errors.city = 'City must be 80 characters or less';
  }

  // Province
  if (!data.province || typeof data.province !== 'string' || data.province.trim().length === 0) {
    errors.province = 'Province/State is required';
  }

  // Postal code
  if (!data.postalCode || typeof data.postalCode !== 'string' || data.postalCode.trim().length < 3) {
    errors.postalCode = 'Postal code must be at least 3 characters';
  } else if (data.postalCode.length > 16) {
    errors.postalCode = 'Postal code must be 16 characters or less';
  }

  // Country code
  if (!data.countryCode || typeof data.countryCode !== 'string' || data.countryCode.trim().length === 0) {
    errors.countryCode = 'Country code is required';
  }

  // Phone number
  if (!data.phoneNumber || typeof data.phoneNumber !== 'string' || data.phoneNumber.trim().length === 0) {
    errors.phoneNumber = 'Phone number is required';
  } else if (data.phoneNumber.length > 20) {
    errors.phoneNumber = 'Phone number must be 20 characters or less';
  }

  // Email
  if (!data.email || typeof data.email !== 'string' || data.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Email format is invalid';
  } else if (data.email.length > 254) {
    errors.email = 'Email must be 254 characters or less';
  }

  // Website (optional)
  if (data.website && !isValidUrl(data.website)) {
    errors.website = 'Website must be a valid URL';
  }

  // Social media handle (optional)
  if (data.socialMediaHandle && data.socialMediaHandle.length > 200) {
    errors.socialMediaHandle = 'Social media handle must be 200 characters or less';
  }

  // Estimated order volume
  if (!data.estimatedOrderVolume || typeof data.estimatedOrderVolume !== 'string' || data.estimatedOrderVolume.trim().length === 0) {
    errors.estimatedOrderVolume = 'Estimated order volume is required';
  } else if (data.estimatedOrderVolume.length > 80) {
    errors.estimatedOrderVolume = 'Estimated order volume must be 80 characters or less';
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
