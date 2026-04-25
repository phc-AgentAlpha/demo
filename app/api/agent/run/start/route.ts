import { jsonError, jsonOk } from '@/lib/http';
import { startAgentRun } from '@/lib/agent/run-state-machine';
import { latestProfile } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { agentWalletAddress?: string };
    const profile = latestProfile(body.agentWalletAddress);
    if (!profile) return jsonError('Persisted onboarding profile with issued Agent/AA wallet is required.', 400);
    if (body.agentWalletAddress && profile.agentWalletAddress?.toLowerCase() !== body.agentWalletAddress.toLowerCase()) {
      return jsonError('Requested agent wallet does not match the persisted onboarding wallet.', 403);
    }
    const run = await startAgentRun(profile);
    return jsonOk({ run });
  } catch (error) {
    return jsonError(error, 400);
  }
}
