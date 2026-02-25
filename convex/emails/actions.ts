"use node";

import { internalAction, ActionCtx } from '../_generated/server';
import { v } from 'convex/values';
import { Resend } from 'resend';
import { sellerNewOrderEmail } from './templates';

const DEFAULT_FROM = 'Nima <support@shopnima.ai>';

/**
 * Send a new-order notification email to a seller.
 * All financial amounts are whole KES values (prices are stored as whole units, not cents).
 * Errors are swallowed — email failures must never break the order payment flow.
 */
export const sendSellerNewOrderEmail = internalAction({
  args: {
    sellerEmail: v.string(),
    sellerName: v.string(),
    orderNumber: v.string(),
    orderDate: v.number(),
    items: v.array(
      v.object({
        name: v.string(),
        brand: v.optional(v.string()),
        quantity: v.number(),
        price: v.number(),
        lineTotal: v.number(),
        imageUrl: v.optional(v.string()),
        size: v.optional(v.string()),
        color: v.optional(v.string()),
      })
    ),
    subtotal: v.number(),
    total: v.number(),
    currency: v.string(),
    buyerCity: v.string(),
    buyerCountry: v.string(),
  },
  returns: v.null(),
  handler: async (
    _ctx: ActionCtx,
    args: {
      sellerEmail: string;
      sellerName: string;
      orderNumber: string;
      orderDate: number;
      items: {
        name: string;
        brand?: string;
        quantity: number;
        price: number;
        lineTotal: number;
        imageUrl?: string;
        size?: string;
        color?: string;
      }[];
      subtotal: number;
      total: number;
      currency: string;
      buyerCity: string;
      buyerCountry: string;
    }
  ): Promise<null> => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[EMAIL] RESEND_API_KEY not set — skipping seller order email');
      return null;
    }

    const from = process.env.EMAIL_FROM ?? DEFAULT_FROM;
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://shopnima.ai'}/seller/orders`;

    try {
      const { subject, html } = sellerNewOrderEmail({
        sellerName: args.sellerName,
        orderNumber: args.orderNumber,
        orderDate: args.orderDate,
        items: args.items,
        subtotal: args.subtotal,
        total: args.total,
        currency: args.currency,
        buyerCity: args.buyerCity,
        buyerCountry: args.buyerCountry,
        dashboardUrl,
      });

      const resend = new Resend(apiKey);
      const result = await resend.emails.send({
        from,
        to: args.sellerEmail,
        subject,
        html,
      });

      if (result.error) {
        console.error(`[EMAIL] Resend error for ${args.sellerEmail} (${args.orderNumber}):`, result.error);
      } else {
        console.log(`[EMAIL] Seller order email sent to ${args.sellerEmail} for ${args.orderNumber} (id: ${result.data?.id})`);
      }
    } catch (err) {
      console.error(`[EMAIL] Unexpected error sending seller order email to ${args.sellerEmail}:`, err);
    }

    return null;
  },
});
