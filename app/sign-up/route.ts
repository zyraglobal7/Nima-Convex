import { redirect } from 'next/navigation';
import { getSignUpUrl } from '@workos-inc/authkit-nextjs';

export async function GET() {
  const authorizationUrl = await getSignUpUrl();
  
  // Log the full authorization URL to see what redirect_uri is being sent
  console.log('[WorkOS Sign-Up] Full authorization URL:', authorizationUrl);
  
  // Parse and log just the redirect_uri parameter
  try {
    const url = new URL(authorizationUrl);
    console.log('[WorkOS Sign-Up] redirect_uri param:', url.searchParams.get('redirect_uri'));
  } catch (e) {
    console.log('[WorkOS Sign-Up] Could not parse URL');
  }
  
  return redirect(authorizationUrl);
}