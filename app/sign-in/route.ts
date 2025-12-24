import { redirect } from 'next/navigation';
import { getSignInUrl } from '@workos-inc/authkit-nextjs';

export async function GET() {
  const authorizationUrl = await getSignInUrl();
  
  // Log the full authorization URL to see what redirect_uri is being sent
  console.log('[WorkOS Sign-In] Full authorization URL:', authorizationUrl);
  
  // Parse and log just the redirect_uri parameter
  try {
    const url = new URL(authorizationUrl);
    console.log('[WorkOS Sign-In] redirect_uri param:', url.searchParams.get('redirect_uri'));
  } catch (e) {
    console.log('[WorkOS Sign-In] Could not parse URL');
  }
  
  return redirect(authorizationUrl);
}