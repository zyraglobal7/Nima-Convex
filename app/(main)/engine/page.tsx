import { preloadQuery } from 'convex/nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { api } from '@/convex/_generated/api';
import EngineClient from './EngineClient';

export default async function EnginePage() {
  const { accessToken } = await withAuth();

  let authExpired = false;

  try {
    await preloadQuery(api.users.queries.getCurrentUser, {}, { token: accessToken });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (
      msg.includes('InvalidAuthHeader') ||
      msg.includes('Token expired') ||
      msg.includes('token') ||
      msg.includes('Could not validate')
    ) {
      authExpired = true;
    }
  }

  return <EngineClient authExpired={authExpired} />;
}
