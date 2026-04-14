import { NextRequest, NextResponse } from 'next/server';

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace('.cloud', '.site');

/**
 * Proxy Fingo Pay webhook events to the Convex HTTP endpoint.
 * Fingo is configured to POST to https://www.shopnima.ai/api/fingo/webhook
 * which Next.js forwards here, and we forward to Convex.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward all Fingo signature headers
  for (const header of [
    'X-Webhook-Signature',
    'x-webhook-signature',
    'Webhook-Signature',
    'X-Fingo-Signature',
  ]) {
    const value = request.headers.get(header);
    if (value) headers[header] = value;
  }

  const convexResponse = await fetch(`${CONVEX_SITE_URL}/webhooks/fingo`, {
    method: 'POST',
    headers,
    body,
  });

  const responseText = await convexResponse.text();
  return new NextResponse(responseText, {
    status: convexResponse.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
