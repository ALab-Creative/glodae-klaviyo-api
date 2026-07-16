/**
 * Klaviyo API helpers for profile subscription jobs.
 */

export function initKlaviyo() {
  const privateApiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const revision = process.env.KLAVIYO_API_REVISION || '2024-10-15';
  const listIdRegular = process.env.KLAVIYO_LIST_ID_REGULAR;
  const listIdWholesale = process.env.KLAVIYO_LIST_ID_WHOLESALE;

  if (!privateApiKey) {
    throw new Error('Missing Klaviyo credential: KLAVIYO_PRIVATE_API_KEY');
  }

  return {
    privateApiKey,
    revision,
    listIdRegular,
    listIdWholesale,
    baseUrl: 'https://a.klaviyo.com/api'
  };
}

function buildSubscriptions(profile, { includeSms = true } = {}) {
  const subscriptions = {};

  if (profile.email) {
    subscriptions.email = {
      marketing: {
        consent: 'SUBSCRIBED'
      }
    };
  }

  if (includeSms && profile.phone_number) {
    subscriptions.sms = {
      marketing: {
        consent: 'SUBSCRIBED'
      }
    };
  }

  return Object.keys(subscriptions).length ? subscriptions : undefined;
}

function parseJsonSafe(text) {
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function isUnsupportedSmsRegionError(detail) {
  const message = String(detail || '').toLowerCase();
  return message.includes('supported region') || message.includes('configure a sending number');
}

async function postProfileSubscriptionJob(config, payload) {
  const response = await fetch(`${config.baseUrl}/profile-subscription-bulk-create-jobs/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      revision: config.revision,
      Authorization: `Klaviyo-API-Key ${config.privateApiKey}`
    },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  const body = parseJsonSafe(bodyText);

  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail || body?.message || response.statusText;
    const error = new Error(`Klaviyo subscription failed: ${detail}`);
    error.detail = detail;
    throw error;
  }

  return body;
}

function buildProfileSubscriptionPayload(listId, profile, source, { includeSms = true } = {}) {
  const subscriptions = buildSubscriptions(profile, { includeSms });
  const profileAttributes = {
    email: profile.email,
    phone_number: profile.phone_number,
    subscriptions: subscriptions || {}
  };

  return {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes: {
        custom_source: source || 'Shopify Contact Form',
        profiles: {
          data: [
            {
              type: 'profile',
              attributes: profileAttributes
            }
          ]
        }
      },
      relationships: {
        list: {
          data: {
            type: 'list',
            id: listId
          }
        }
      }
    }
  };
}

/**
 * Create a Klaviyo subscription job that upserts a profile and subscribes it to a list.
 */
export async function createProfileSubscriptionJob(config, { listId, profile, source }) {
  if (!listId) {
    throw new Error('Missing Klaviyo list id for subscription job');
  }

  try {
    const payload = buildProfileSubscriptionPayload(listId, profile, source, { includeSms: true });
    return await postProfileSubscriptionJob(config, payload);
  } catch (error) {
    if (profile.phone_number && isUnsupportedSmsRegionError(error?.detail || error?.message)) {
      const fallbackPayload = buildProfileSubscriptionPayload(listId, profile, source, { includeSms: false });
      return await postProfileSubscriptionJob(config, fallbackPayload);
    }

    throw error;
  }
}

/**
 * Upsert a Klaviyo profile with additional attributes and custom properties.
 */
export async function upsertProfile(config, profile) {
  const profileAttributes = {
    email: profile.email,
    phone_number: profile.phone_number,
    ...(profile.first_name ? { first_name: profile.first_name } : {}),
    ...(profile.last_name ? { last_name: profile.last_name } : {}),
    ...(profile.location ? { location: profile.location } : {}),
    ...(profile.properties ? { properties: profile.properties } : {})
  };

  const payload = {
    data: {
      type: 'profile',
      attributes: profileAttributes
    }
  };

  const response = await fetch(`${config.baseUrl}/profile-import/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      revision: config.revision,
      Authorization: `Klaviyo-API-Key ${config.privateApiKey}`
    },
    body: JSON.stringify(payload)
  });

  const bodyText = await response.text();
  const body = parseJsonSafe(bodyText);

  if (!response.ok) {
    const detail = body?.errors?.[0]?.detail || body?.message || response.statusText;
    throw new Error(`Klaviyo profile upsert failed: ${detail}`);
  }

  return body;
}
