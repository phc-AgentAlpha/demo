import { jsonError, jsonOk } from '@/lib/http';
import { getAgentRun } from '@/lib/agent/run-state-machine';
import { latestProfile } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const agentWalletAddress = new URL(request.url).searchParams.get('agentWalletAddress') ?? undefined;
    const profile = latestProfile(agentWalletAddress);
    if (!profile) return jsonOk({ run: null });
    return jsonOk({ run: getAgentRun(profile) });
  } catch (error) {
    return jsonError(error, 400);
  }
}
