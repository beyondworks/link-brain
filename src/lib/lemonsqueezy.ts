/**
 * Lemon Squeezy API Client
 *
 * Handles checkout creation and customer portal access.
 * API docs: https://docs.lemonsqueezy.com/api
 */

const LEMON_SQUEEZY_API = 'https://api.lemonsqueezy.com/v1';

interface LemonSqueezyResponse<T> {
  data: T;
}

interface CheckoutAttributes {
  url: string;
}

interface CheckoutData {
  type: 'checkouts';
  id: string;
  attributes: CheckoutAttributes;
}

interface SubscriptionAttributes {
  status: string;
  urls: {
    customer_portal: string;
    update_payment_method: string;
  };
}

interface SubscriptionData {
  type: 'subscriptions';
  id: string;
  attributes: SubscriptionAttributes;
}

async function lemonFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY ?? '';
  const res = await fetch(`${LEMON_SQUEEZY_API}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Lemon Squeezy API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

/**
 * Create a checkout URL for the Pro plan.
 *
 * @param storeId - Lemon Squeezy store ID
 * @param variantId - Pro plan variant ID (monthly or yearly)
 * @param userId - Internal user ID (passed as custom_data for webhook matching)
 * @param userEmail - Pre-fill email
 */
export async function createCheckout(
  storeId: string,
  variantId: string,
  userId: string,
  userEmail?: string
): Promise<string> {
  const payload = {
    data: {
      type: 'checkouts' as const,
      attributes: {
        checkout_data: {
          custom: {
            user_id: userId,
          },
          ...(userEmail && { email: userEmail }),
        },
        product_options: {
          redirect_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://linkbrain.cloud'}/settings?tab=billing&success=true`,
        },
      },
      relationships: {
        store: {
          data: {
            type: 'stores' as const,
            id: storeId,
          },
        },
        variant: {
          data: {
            type: 'variants' as const,
            id: variantId,
          },
        },
      },
    },
  };

  const result = await lemonFetch<LemonSqueezyResponse<CheckoutData>>(
    '/checkouts',
    { method: 'POST', body: JSON.stringify(payload) }
  );

  return result.data.attributes.url;
}

/**
 * Get customer portal URL for an existing subscription.
 */
export async function getCustomerPortalUrl(
  subscriptionId: string
): Promise<string> {
  const result = await lemonFetch<LemonSqueezyResponse<SubscriptionData>>(
    `/subscriptions/${subscriptionId}`
  );

  return result.data.attributes.urls.customer_portal;
}
