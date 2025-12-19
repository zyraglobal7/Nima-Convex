import { preloadQuery } from 'convex/nextjs';
import { withAuth } from '@workos-inc/authkit-nextjs';
import { api } from '@/convex/_generated/api';
import ChatThreadClient from './ChatThreadClient';

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function ChatThreadPage({ params }: PageProps) {
  const { chatId } = await params;
  const { accessToken } = await withAuth();
  
  let authExpired = false;
  
  try {
    // Preload user data on the server - this populates Convex cache for client-side useQuery
    await preloadQuery(
      api.users.queries.getCurrentUser,
      {},
      { token: accessToken }
    );
  } catch (error) {
    // Check if it's an auth error (expired token, invalid token, etc.)
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('InvalidAuthHeader') ||
      errorMessage.includes('Token expired') ||
      errorMessage.includes('token') ||
      errorMessage.includes('Could not validate')
    ) {
      authExpired = true;
    }
    // Don't re-throw - preload is optional, client-side useQuery will work
  }
  
  return <ChatThreadClient chatId={chatId} authExpired={authExpired} />;
}
