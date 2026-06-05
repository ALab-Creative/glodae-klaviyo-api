import crypto from 'crypto';

/**
 * Initialize Mailchimp client with API credentials from environment
 */
export function initMailchimp() {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

  if (!apiKey || !serverPrefix || !audienceId) {
    throw new Error(
      'Missing Mailchimp credentials: MAILCHIMP_API_KEY, MAILCHIMP_SERVER_PREFIX, or MAILCHIMP_AUDIENCE_ID'
    );
  }

  return {
    apiKey,
    serverPrefix,
    audienceId,
    baseUrl: `https://${serverPrefix}.api.mailchimp.com/3.0`
  };
}

/**
 * Compute MD5 hash of email (lowercase) for subscriber_hash
 */
export function getSubscriberHash(email) {
  return crypto.createHash('md5').update(email.toLowerCase()).digest('hex');
}

/**
 * Upsert member to Mailchimp audience
 * @param {Object} config - Mailchimp config from initMailchimp()
 * @param {Object} memberData - member object with email, status_if_new, merge_fields
 */
export async function upsertMember(config, memberData) {
  const { apiKey, baseUrl, audienceId } = config;
  const sourceEmail = (memberData.email_address || memberData.email || '').trim();

  if (!sourceEmail) {
    throw new Error('Mailchimp upsert requires email or email_address');
  }

  const subscriberHash = getSubscriberHash(sourceEmail);

  // Mailchimp requires the request body key to be email_address.
  const payload = {
    ...memberData,
    email_address: sourceEmail
  };

  delete payload.email;

  const url = `${baseUrl}/lists/${audienceId}/members/${subscriberHash}`;

  const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Mailchimp upsert error:', error);
    throw new Error(`Mailchimp upsert failed: ${error.detail || error.message || response.statusText}`);
  }

  return response.json();
}

/**
 * Add tags to a member
 * @param {Object} config - Mailchimp config from initMailchimp()
 * @param {string} email - subscriber email
 * @param {Array<string>} tags - tags to add
 */
export async function addTags(config, email, tags) {
  const { apiKey, baseUrl, audienceId } = config;
  const subscriberHash = getSubscriberHash(email);

  const url = `${baseUrl}/lists/${audienceId}/members/${subscriberHash}/tags`;

  const auth = Buffer.from(`anystring:${apiKey}`).toString('base64');

  const tagData = tags.map(tag => ({
    name: tag,
    status: 'active'
  }));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`
    },
    body: JSON.stringify({ tags: tagData })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Mailchimp tag error:', error);
    throw new Error(`Mailchimp tag failed: ${error.detail || error.message || response.statusText}`);
  }

  return response.json();
}
