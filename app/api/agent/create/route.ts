import { jsonError, jsonOk } from '@/lib/http';
import { createAgentWallet } from '@/lib/agent/demo-agent';
import { saveAgentIssuance } from '@/lib/ledger/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { seed?: string };
    const seed = body.seed ?? 'alex';
    const agent = await createAgentWallet(seed);
    saveAgentIssuance({ agentId: agent.agentId, walletAddress: agent.walletAddress, walletProvider: agent.walletProvider, seed, issuedAt: Date.now() });
    return jsonOk({ agent });
  } catch (error) {
    return jsonError(error, 400);
  }
}
