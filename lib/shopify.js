/**
 * Shopify Admin GraphQL helpers for customer create/update by email.
 */

function getShopifyConfig() {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const accessToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-01';

  if (!storeDomain || !accessToken) {
    return null;
  }

  return {
    storeDomain,
    accessToken,
    apiVersion,
    endpoint: `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`
  };
}

async function shopifyGraphqlRequest(config, query, variables = {}) {
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': config.accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  const bodyText = await response.text();
  const payload = bodyText ? JSON.parse(bodyText) : {};

  if (!response.ok) {

  const bodyText = await response.text();
  console.error('[Shopify GraphQL] Response status:', response.status);
  console.error('[Shopify GraphQL] Response body:', bodyText);
  
    throw new Error(payload?.errors?.[0]?.message || payload?.error || `Shopify request failed (${response.status})`);
  }

  if (payload.errors && payload.errors.length) {
    throw new Error(payload.errors.map((entry) => entry.message).join('; '));
  }

  return payload.data || {};
}

function cleanString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function uniqueTags(tags) {
  return Array.from(new Set((tags || []).map((tag) => cleanString(tag)).filter(Boolean)));
}

function isPhoneValidationError(error) {
  const message = String(error?.message || '');
  return /phone/i.test(message);
}

async function createOrUpdateWithoutPhone(action, config, input) {
  const { phone, ...inputWithoutPhone } = input;
  return action(config, inputWithoutPhone);
}

async function findCustomerByEmail(config, email) {
  const query = `
    query FindCustomerByEmail($search: String!) {
      customers(first: 1, query: $search) {
        edges {
          node {
            id
            email
            firstName
            lastName
            phone
            tags
          }
        }
      }
    }
  `;

  const data = await shopifyGraphqlRequest(config, query, {
    search: `email:${email}`
  });

  const edge = data?.customers?.edges?.[0];
  return edge ? edge.node : null;
}

async function createCustomer(config, input) {
  const mutation = `
    mutation CreateCustomer($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphqlRequest(config, mutation, { input });
  const result = data?.customerCreate;

  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join('; '));
  }

  return result?.customer || null;
}

async function updateCustomer(config, input) {
  const mutation = `
    mutation UpdateCustomer($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          email
          tags
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphqlRequest(config, mutation, { input });
  const result = data?.customerUpdate;

  if (result?.userErrors?.length) {
    throw new Error(result.userErrors.map((entry) => entry.message).join('; '));
  }

  return result?.customer || null;
}

/**
 * Best-effort customer sync for Shopify Admin.
 * Creates if not found, otherwise updates by email.
 */
export async function syncShopifyCustomer({
  email,
  firstName,
  lastName,
  phone,
  tags = []
}) {

  console.log('[Shopify Sync] Starting sync for:', { email, firstName, lastName, phone, tags });

  const config = getShopifyConfig();

  console.log('[Shopify Sync] Config:', config ? 'found' : 'missing');

  if (!config) {
    console.error('[Shopify Sync] Missing Shopify config');
    return {
      ok: false,
      skipped: true,
      reason: 'Missing SHOPIFY_STORE_DOMAIN or SHOPIFY_ADMIN_ACCESS_TOKEN'
    };
  }

  const cleanEmail = cleanString(email).toLowerCase();
  if (!cleanEmail) {
    throw new Error('Shopify customer sync requires email');
  }

  const cleanFirst = cleanString(firstName);
  const cleanLast = cleanString(lastName);
  const cleanPhone = cleanString(phone);
  const requestedTags = uniqueTags(tags);

  const existingCustomer = await findCustomerByEmail(config, cleanEmail);

  if (!existingCustomer) {
    const createInput = {
      email: cleanEmail,
      tags: requestedTags
    };

    if (cleanFirst) createInput.firstName = cleanFirst;
    if (cleanLast) createInput.lastName = cleanLast;
    if (cleanPhone) createInput.phone = cleanPhone;

    let created;

    try {
      created = await createCustomer(config, createInput);
    } catch (error) {
      if (!cleanPhone || !isPhoneValidationError(error)) {
        throw error;
      }

      console.warn('[Shopify Sync] Retrying create without phone after validation error');
      created = await createOrUpdateWithoutPhone(createCustomer, config, createInput);
    }

    return {
      ok: true,
      action: 'created',
      customerId: created?.id || null
    };
  }

  const mergedTags = uniqueTags([...(existingCustomer.tags || []), ...requestedTags]);
  const updateInput = {
    id: existingCustomer.id,
    tags: mergedTags
  };

  if (cleanFirst) updateInput.firstName = cleanFirst;
  if (cleanLast) updateInput.lastName = cleanLast;
  if (cleanPhone) updateInput.phone = cleanPhone;

  let updated;

  try {
    updated = await updateCustomer(config, updateInput);
  } catch (error) {
    if (!cleanPhone || !isPhoneValidationError(error)) {
      throw error;
    }

    console.warn('[Shopify Sync] Retrying update without phone after validation error');
    updated = await createOrUpdateWithoutPhone(updateCustomer, config, updateInput);
  }

  return {
    ok: true,
    action: 'updated',
    customerId: updated?.id || existingCustomer.id
  };
}
