import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

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

export default http;
