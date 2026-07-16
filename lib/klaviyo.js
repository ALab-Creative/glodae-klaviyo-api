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

function buildSubscriptions(profile) {
  const subscriptions = {};

  if (profile.email) {
    subscriptions.email = {
      marketing: {
        consent: 'SUBSCRIBED'
      }
    };
  }

  if (profile.phone_number) {
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

/**
 * Create a Klaviyo subscription job that upserts a profile and subscribes it to a list.
 */
export async function createProfileSubscriptionJob(config, { listId, profile, source }) {
  if (!listId) {
    throw new Error('Missing Klaviyo list id for subscription job');
  }

  const subscriptions = buildSubscriptions(profile);
  const profileAttributes = {
    email: profile.email,
    phone_number: profile.phone_number,
    subscriptions: subscriptions || {}
  };

  const attributes = {
    custom_source: source || 'Shopify Contact Form',
    profiles: {
      data: [
        {
          type: 'profile',
          attributes: profileAttributes
        }
      ]
    }
  };

  const payload = {
    data: {
      type: 'profile-subscription-bulk-create-job',
      attributes,
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
    throw new Error(`Klaviyo subscription failed: ${detail}`);
  }

  return body;
}
