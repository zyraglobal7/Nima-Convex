import { redirect } from 'next/navigation';
import { signOut } from '@workos-inc/authkit-nextjs';

export async function GET() {
  await signOut();
  return redirect('/');
}
