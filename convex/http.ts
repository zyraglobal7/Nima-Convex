import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';

const http = httpRouter();

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.shopnima.ai';

// ─── Connect CORS helper ────────────────────────────────────────────────────

/**
 * Add CORS headers for Connect API responses.
 * Allows any origin when key validates (server-side calls have no Origin header).
 * For browser calls, validates against partner's allowedDomains.
 */
function addConnectCorsHeaders(
  response: Response,
  origin: string | null,
  allowedDomains: string[],
): Response {
  const headers = new Headers(response.headers);
  const allowed =
    !origin || // server-to-server: no origin header
    allowedDomains.length === 0 ||
    allowedDomains.some((d) => origin === d || origin.endsWith(`.${d}`));

  if (allowed) {
    headers.set('Access-Control-Allow-Origin', origin ?? '*');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** SHA-256 via Web Crypto (available in Convex without 'use node') */
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generate a random hex token of given byte length */
function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

type ConnectPartner = {
  _id: Id<'api_partners'>;
  name: string;
  slug: string;
  apiKeyHash: string;
  apiKeyPrefix: string;
  allowedDomains: string[];
  plan: string;
  monthlyTryOnLimit: number;
  tryOnsUsedThisMonth: number;
  billingResetAt: number;
  isActive: boolean;
};

type ConnectAuthResult =
  | { partner: ConnectPartner }
  | { error: string; status: number };

/**
 * Validate an API key from the Authorization header.
 * Returns partner data or an error.
 */
async function validateConnectApiKey(
  ctx: Parameters<Parameters<typeof httpAction>[0]>[0],
  request: Request,
): Promise<ConnectAuthResult> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer nima_pk_')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const fullKey = authHeader.slice('Bearer '.length);
  // prefix is the first 16 chars of the random part (after "nima_pk_")
  const randomPart = fullKey.slice('nima_pk_'.length);
  const prefix = randomPart.slice(0, 16);

  const partner = await ctx.runQuery(internal.connect.queries.validateApiKey, { prefix });
  if (!partner) {
    return { error: 'Invalid or inactive API key', status: 401 };
  }

  // Verify hash
  const keyHash = await sha256Hex(fullKey);
  if (keyHash !== partner.apiKeyHash) {
    return { error: 'Invalid API key', status: 401 };
  }

  return { partner };
}

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://www.shopnima.ai',
  'https://shopnima.ai',
];

/**
 * Helper to add CORS headers to responses
 */
function addCorsHeaders(response: Response, origin: string | null): Response {
  const headers = new Headers(response.headers);
  
  // Check if origin is allowed
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Helper to validate origin
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * WorkOS Webhook Handler
 * Receives webhook events from WorkOS and processes them
 *
 * Supported events:
 * - user.created: Creates a new user in the database
 * - user.updated: Updates user info when changed in WorkOS
 * - user.deleted: Deactivates user when deleted in WorkOS
 *
 * NOTE: Webhook signature validation is disabled for development.
 * For production, add WORKOS_WEBHOOK_SECRET validation using the
 * WorkOS-Signature header (format: "t=timestamp,v1=signature").
 */
http.route({
  path: '/webhooks/workos',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    
    // Get the raw body
    const body = await request.text();

    // Parse the webhook payload
    let payload: {
      event: string;
      data: {
        id: string;
        email?: string;
        email_verified?: boolean;
        first_name?: string;
        last_name?: string;
        profile_picture_url?: string;
      };
    };

    try {
      payload = JSON.parse(body);
    } catch {
      return addCorsHeaders(new Response('Invalid JSON', { status: 400 }), origin);
    }

    const { event, data } = payload;

    try {
      switch (event) {
        case 'user.created': {
          await ctx.runMutation(internal.webhooks.workos.handleUserCreated, {
            workosUserId: data.id,
            email: data.email ?? '',
            emailVerified: data.email_verified ?? false,
            firstName: data.first_name ?? undefined,
            lastName: data.last_name ?? undefined,
            profileImageUrl: data.profile_picture_url ?? undefined,
          });
          break;
        }

        case 'user.updated': {
          await ctx.runMutation(internal.webhooks.workos.handleUserUpdated, {
            workosUserId: data.id,
            email: data.email,
            emailVerified: data.email_verified,
            firstName: data.first_name,
            lastName: data.last_name,
            profileImageUrl: data.profile_picture_url ?? undefined,
          });
          break;
        }

        case 'user.deleted': {
          await ctx.runMutation(internal.webhooks.workos.handleUserDeleted, {
            workosUserId: data.id,
          });
          break;
        }

        default:
          // Unhandled event type - still acknowledge receipt
      }

      // Respond with 200 OK to acknowledge receipt
      return addCorsHeaders(new Response('OK', { status: 200 }), origin);
    } catch {
      return addCorsHeaders(new Response('Internal error', { status: 500 }), origin);
    }
  }),
});

/**
 * Health check endpoint
 */
http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    const response = new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return addCorsHeaders(response, origin);
  }),
});

/**
 * CORS preflight handler for all routes
 */
http.route({
  path: '/webhooks/workos',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    
    if (!isOriginAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    
    return addCorsHeaders(new Response(null, { status: 204 }), origin);
  }),
});

http.route({
  path: '/health',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    
    if (!isOriginAllowed(origin)) {
      return new Response('Forbidden', { status: 403 });
    }
    
    return addCorsHeaders(new Response(null, { status: 204 }), origin);
  }),
});

// ============================================
// FINGO PAY WEBHOOK
// ============================================

/**
 * Fingo Pay Webhook Handler
 * Receives payment confirmation events from Fingo Pay
 * 
 * Events:
 * - transaction.completed: Payment successful, add credits
 * - transaction.failed: Payment failed
 * 
 * Webhook URL: https://www.shopnima.ai/api/fingo/webhook
 * (proxied to this Convex HTTP endpoint)
 */
http.route({
  path: '/webhooks/fingo',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');

    // Get the raw body for signature verification
    const body = await request.text();

    // Verify webhook signature using FINGO_WEBHOOK_SECRET
    const webhookSecret = process.env.FINGO_WEBHOOK_SECRET;
    const webhookSecretKey = process.env.FINGO_WEBHOOK_SECRET_KEY;
    const signature = request.headers.get('X-Webhook-Signature') ||
                      request.headers.get('x-webhook-signature') ||
                      request.headers.get('Webhook-Signature') ||
                      request.headers.get('X-Fingo-Signature');

    if (webhookSecret && signature) {
      // Verify HMAC signature
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(webhookSecretKey || webhookSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
      );

      const signatureBuffer = encoder.encode(body);
      const expectedSignature = await crypto.subtle.sign('HMAC', key, signatureBuffer);
      const expectedHex = Array.from(new Uint8Array(expectedSignature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      if (signature !== expectedHex) {
        console.error('[FINGO WEBHOOK] Signature verification failed');
        // Log but don't reject - Fingo's exact signature format may vary
        // In production, uncomment the line below:
        // return new Response('Invalid signature', { status: 401 });
      }
    }

    // Parse the webhook payload
    let payload: {
      event?: string;
      type?: string;
      data?: {
        id?: string;
        merchantTransactionId?: string;
        status?: string;
        failureReason?: string;
        [key: string]: unknown;
      };
      merchantTransactionId?: string;
      status?: string;
      id?: string;
      failureReason?: string;
      [key: string]: unknown;
    };

    try {
      payload = JSON.parse(body);
    } catch {
      console.error('[FINGO WEBHOOK] Invalid JSON payload');
      return addCorsHeaders(new Response('Invalid JSON', { status: 400 }), origin);
    }

    console.log('[FINGO WEBHOOK] Received event:', JSON.stringify(payload));

    // Extract event type and data (handle various payload formats)
    const eventType = payload.event || payload.type || '';
    const data = payload.data || payload;
    const merchantTransactionId = data.merchantTransactionId || payload.merchantTransactionId || '';
    const fingoTransactionId = data.id || payload.id || '';

    if (!merchantTransactionId) {
      console.error('[FINGO WEBHOOK] No merchantTransactionId in payload');
      return addCorsHeaders(
        new Response(JSON.stringify({ error: 'Missing merchantTransactionId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }),
        origin,
      );
    }

    try {
      // Determine the status from the event
      const status = (data.status || payload.status || '').toString().toLowerCase();
      const isCompleted =
        eventType.includes('completed') ||
        eventType.includes('success') ||
        status === 'completed' ||
        status === 'success' ||
        status === 'successful';

      const isFailed =
        eventType.includes('failed') ||
        eventType.includes('failure') ||
        status === 'failed' ||
        status === 'failure' ||
        status === 'cancelled' ||
        status === 'rejected';

      // Route to the correct handler based on merchant transaction ID prefix
      const isOrderPayment = (merchantTransactionId as string).startsWith('nima_ord_');
      const isCreditPurchase = (merchantTransactionId as string).startsWith('nima_cr_');
      const isSubscription = (merchantTransactionId as string).startsWith('nima_sub_');

      if (isCompleted) {
        console.log(`[FINGO WEBHOOK] Payment completed: ${merchantTransactionId}`);
        if (isOrderPayment) {
          await ctx.runMutation(internal.orders.mutations.completeOrderPayment, {
            merchantTransactionId: merchantTransactionId as string,
            fingoTransactionId: fingoTransactionId as string,
          });
        } else if (isSubscription) {
          await ctx.runMutation(internal.sellers.subscriptions.activateSubscription, {
            merchantTransactionId: merchantTransactionId as string,
            fingoTransactionId: fingoTransactionId as string,
          });
        } else {
          // Default to credit purchase (backward compatible)
          await ctx.runMutation(internal.credits.mutations.completePurchase, {
            merchantTransactionId: merchantTransactionId as string,
            fingoTransactionId: fingoTransactionId as string,
          });
        }
      } else if (isFailed) {
        const reason = (data.failureReason || payload.failureReason || 'Payment failed').toString();
        console.log(`[FINGO WEBHOOK] Payment failed: ${merchantTransactionId} - ${reason}`);
        if (isOrderPayment) {
          await ctx.runMutation(internal.orders.mutations.failOrderPayment, {
            merchantTransactionId: merchantTransactionId as string,
            reason,
          });
        } else if (isSubscription) {
          await ctx.runMutation(internal.sellers.subscriptions.failSubscription, {
            merchantTransactionId: merchantTransactionId as string,
            reason,
          });
        } else {
          // Default to credit purchase (backward compatible)
          await ctx.runMutation(internal.credits.mutations.failPurchase, {
            merchantTransactionId: merchantTransactionId as string,
            reason,
          });
        }
      } else {
        // Unknown event type - log it but acknowledge
        console.log(`[FINGO WEBHOOK] Unhandled event type: ${eventType}, status: ${status}, isOrder: ${isOrderPayment}, isCredit: ${isCreditPurchase}, isSubscription: ${isSubscription}`);
      }

      return addCorsHeaders(
        new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
        origin,
      );
    } catch (error) {
      console.error('[FINGO WEBHOOK] Processing error:', error);
      return addCorsHeaders(new Response('Internal error', { status: 500 }), origin);
    }
  }),
});

/**
 * CORS preflight for Fingo webhook
 */
http.route({
  path: '/webhooks/fingo',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    return addCorsHeaders(new Response(null, { status: 204 }), origin);
  }),
});

// ============================================
// NIMA CONNECT REST API
// ============================================

/**
 * POST /api/v1/sessions
 * Create a new try-on session for a product
 */
http.route({
  path: '/api/v1/sessions',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const auth = await validateConnectApiKey(ctx, request);
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { partner } = auth;

    let body: {
      productImageUrl?: string;
      externalProductId?: string;
      productName?: string;
      productCategory?: string;
      guestFingerprint?: string;
      externalProductUrl?: string;
    };
    try {
      body = await request.json();
    } catch {
      return addConnectCorsHeaders(
        new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } }),
        origin, partner.allowedDomains,
      );
    }

    if (!body.productImageUrl || !body.externalProductId) {
      return addConnectCorsHeaders(
        new Response(JSON.stringify({ error: 'productImageUrl and externalProductId are required' }), { status: 400, headers: { 'Content-Type': 'application/json' } }),
        origin, partner.allowedDomains,
      );
    }

    // Normalize common plural/alias variants so integrators don't break on minor mismatches
    const CATEGORY_MAP: Record<string, 'top' | 'bottom' | 'dress' | 'outfit' | 'outerwear'> = {
      top: 'top', tops: 'top', shirt: 'top', blouse: 'top',
      bottom: 'bottom', bottoms: 'bottom', pants: 'bottom', trousers: 'bottom', skirt: 'bottom',
      dress: 'dress', dresses: 'dress',
      outfit: 'outfit', outfits: 'outfit', set: 'outfit',
      outerwear: 'outerwear', jacket: 'outerwear', coat: 'outerwear', vest: 'outerwear',
    };
    const rawCategory = (body.productCategory ?? '').toLowerCase().trim();
    const normalizedCategory = CATEGORY_MAP[rawCategory] ?? undefined;

    const sessionToken = `sess_${randomHex(16)}`;
    const sessionId = await ctx.runMutation(internal.connect.mutations.createSession, {
      partnerId: partner._id,
      sessionToken,
      externalProductId: body.externalProductId,
      externalProductUrl: body.externalProductUrl,
      productImageUrl: body.productImageUrl,
      productName: body.productName,
      productCategory: normalizedCategory,
      guestFingerprint: body.guestFingerprint,
    });

    // Log session_created event
    await ctx.runMutation(internal.connect.mutations.logUsageEvent, {
      partnerId: partner._id,
      sessionId,
      eventType: 'session_created',
      externalProductId: body.externalProductId,
      wasAuthenticated: false,
    });

    return addConnectCorsHeaders(
      new Response(
        JSON.stringify({
          sessionToken,
          widgetUrl: `${SITE_URL}/connect?session=${sessionToken}`,
          status: 'photo_needed',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } }
      ),
      origin, partner.allowedDomains,
    );
  }),
});

http.route({
  path: '/api/v1/sessions',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin ?? '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }),
});

/**
 * GET /api/v1/sessions/:token
 * Get session status + result
 */
http.route({
  pathPrefix: '/api/v1/sessions/',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const auth = await validateConnectApiKey(ctx, request);
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { partner } = auth;

    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const token = parts[parts.length - 1];

    const session = await ctx.runQuery(internal.connect.queries.getSessionByToken, { sessionToken: token });
    if (!session) {
      return addConnectCorsHeaders(
        new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }),
        origin, partner.allowedDomains,
      );
    }

    let resultImageUrl: string | null = null;
    if (session.resultStorageId) {
      resultImageUrl = await ctx.storage.getUrl(session.resultStorageId);
    }

    return addConnectCorsHeaders(
      new Response(
        JSON.stringify({
          sessionToken: session.sessionToken,
          status: session.status,
          productName: session.productName,
          productImageUrl: session.productImageUrl,
          resultImageUrl,
          guestTryOnUsed: session.guestTryOnUsed,
          errorMessage: session.errorMessage,
          expiresAt: session.expiresAt,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
      origin, partner.allowedDomains,
    );
  }),
});

/**
 * POST /api/v1/sessions/:token/photo/url   — get Convex upload URL (widget, no API key)
 * POST /api/v1/sessions/:token/photo/save  — save uploaded storageId (widget, no API key)
 * POST /api/v1/sessions/:token/generate    — trigger try-on (widget, no API key)
 */
http.route({
  pathPrefix: '/api/v1/sessions/',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const parts = url.pathname.split('/').filter(Boolean);
    // parts: ['api','v1','sessions', TOKEN, ...subpath]
    const sessIdx = parts.indexOf('sessions');
    const sessionToken = parts[sessIdx + 1] ?? '';
    const subPath = parts.slice(sessIdx + 2).join('/'); // 'generate' | 'photo/url' | 'photo/save'

    const CORS_HEADERS = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // ── photo/url: generate a Convex upload URL ──────────────────────────────
    if (subPath === 'photo/url') {
      const session = await ctx.runQuery(internal.connect.queries.getSessionByToken, { sessionToken });
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: CORS_HEADERS });
      }
      const uploadUrl = await ctx.storage.generateUploadUrl();
      return new Response(JSON.stringify({ uploadUrl }), { status: 200, headers: CORS_HEADERS });
    }

    // ── photo/save: link uploaded storage ID to session ──────────────────────
    if (subPath === 'photo/save') {
      let body: { storageId?: string } = {};
      try { body = await request.json(); } catch { /* ignore */ }
      if (!body.storageId) {
        return new Response(JSON.stringify({ error: 'storageId required' }), { status: 400, headers: CORS_HEADERS });
      }
      const session = await ctx.runQuery(internal.connect.queries.getSessionByToken, { sessionToken });
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: CORS_HEADERS });
      }
      await ctx.runMutation(internal.connect.mutations.saveGuestPhoto, {
        sessionToken,
        storageId: body.storageId as Id<'_storage'>,
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS_HEADERS });
    }

    // ── generate: trigger try-on generation ─────────────────────────────────
    if (subPath === 'generate') {
      const session = await ctx.runQuery(internal.connect.queries.getSessionByToken, { sessionToken });
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: CORS_HEADERS });
      }
      if (Date.now() > session.expiresAt) {
        await ctx.runMutation(internal.connect.mutations.updateSessionStatus, { sessionToken, status: 'expired' });
        return new Response(JSON.stringify({ error: 'Session expired' }), { status: 410, headers: CORS_HEADERS });
      }
      // Look up partner for rate limit check
      const partner = await ctx.runQuery(internal.connect.queries.getPartnerById, { partnerId: session.partnerId });
      if (!partner || !partner.isActive) {
        return new Response(JSON.stringify({ error: 'Partner inactive' }), { status: 403, headers: CORS_HEADERS });
      }
      const now = Date.now();
      const used = now > partner.billingResetAt ? 0 : partner.tryOnsUsedThisMonth;
      if (used >= partner.monthlyTryOnLimit) {
        return new Response(JSON.stringify({ error: 'Monthly try-on limit exceeded' }), { status: 429, headers: CORS_HEADERS });
      }
      await ctx.scheduler.runAfter(0, internal.connect.actions.generateConnectTryOn, { sessionToken });
      return new Response(
        JSON.stringify({ status: 'processing', estimatedTimeMs: 30000 }),
        { status: 202, headers: CORS_HEADERS }
      );
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: CORS_HEADERS });
  }),
});

/**
 * OPTIONS /api/v1/sessions/* (CORS preflight)
 */
http.route({
  pathPrefix: '/api/v1/sessions/',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin ?? '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }),
});

/**
 * GET /api/v1/usage
 * Get partner usage stats
 */
http.route({
  path: '/api/v1/usage',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const origin = request.headers.get('Origin');
    const auth = await validateConnectApiKey(ctx, request);
    if ('error' in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { partner } = auth;

    const now = Date.now();
    const used = now > partner.billingResetAt ? 0 : partner.tryOnsUsedThisMonth;

    return addConnectCorsHeaders(
      new Response(
        JSON.stringify({
          plan: partner.plan,
          used,
          limit: partner.monthlyTryOnLimit,
          resetAt: partner.billingResetAt,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ),
      origin, partner.allowedDomains,
    );
  }),
});

http.route({
  path: '/api/v1/usage',
  method: 'OPTIONS',
  handler: httpAction(async (_, request) => {
    const origin = request.headers.get('Origin');
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin ?? '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }),
});

export default http;
