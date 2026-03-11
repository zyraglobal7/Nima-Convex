import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';
import { type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get('redirect');
  const state = returnTo
    ? btoa(JSON.stringify({ returnPathname: returnTo })).replace(/\+/g, '-').replace(/\//g, '_')
    : undefined;
  const authorizationUrl = await getSignInUrl({ state });
  return redirect(authorizationUrl);
}
