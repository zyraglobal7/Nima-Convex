import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { internal } from './_generated/api';

const http = httpRouter();

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
    } catch (error) {
      console.error('Failed to parse webhook payload:', error);
      return new Response('Invalid JSON', { status: 400 });
    }

    const { event, data } = payload;
    console.log(`Processing WorkOS webhook: ${event}`);

    try {
      switch (event) {
        case 'user.created': {
          await ctx.runMutation(internal.webhooks.workos.handleUserCreated, {
            workosUserId: data.id,
            email: data.email ?? '',
            emailVerified: data.email_verified ?? false,
            firstName: data.first_name,
            lastName: data.last_name,
            profileImageUrl: data.profile_picture_url,
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
            profileImageUrl: data.profile_picture_url,
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
          console.log(`Unhandled WorkOS event: ${event}`);
      }

      // Respond with 200 OK to acknowledge receipt
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error(`Error processing webhook ${event}:`, error);
      return new Response('Internal error', { status: 500 });
    }
  }),
});

/**
 * Health check endpoint
 */
http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }),
});

export default http;

