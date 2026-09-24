'use server';

import { redirect } from 'next/navigation';
import { resolveProtectedAction } from '@mcp-saas-starter/domain';
import { requireSession } from '@/lib/auth/session';
import { createServiceClient } from '@/lib/supabase/service';

export async function resolveProtectedActionAction(formData: FormData): Promise<void> {
  const { client, userContext } = await requireSession();
  const protectedActionId = String(formData.get('protectedActionId') ?? '').trim();
  const decision = String(formData.get('decision') ?? '');

  if (!userContext) {
    redirect('/dashboard/approvals?error=No+organization+membership');
  }
  if (!protectedActionId) {
    redirect('/dashboard/approvals?error=Missing+protected+action');
  }
  if (decision !== 'approved' && decision !== 'rejected') {
    redirect('/dashboard/approvals?error=Choose+approve+or+reject');
  }

  try {
    await resolveProtectedAction(
      client,
      createServiceClient(),
      userContext,
      protectedActionId,
      decision,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not resolve the action.';
    redirect(`/dashboard/approvals?error=${encodeURIComponent(message)}`);
  }

  redirect(`/dashboard/approvals?notice=${decision === 'approved' ? 'approved' : 'rejected'}`);
}
