import { jsonError, jsonOk } from '@/lib/http';
import { stopAgentRun } from '@/lib/agent/run-state-machine';
import { latestProfile } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { agentWalletAddress?: string };
    const profile = latestProfile(body.agentWalletAddress);
    if (!profile) return jsonError('Persisted onboarding profile with issued agent wallet is required.', 400);
    const run = stopAgentRun(profile);
    return jsonOk({ run });
  } catch (error) {
    return jsonError(error, 400);
  }
}
