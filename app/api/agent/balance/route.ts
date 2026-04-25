import { jsonError, jsonOk } from '@/lib/http';
import { getAgentIssuance, latestProfile } from '@/lib/ledger/store';
import { fetchBaseWalletBalance } from '@/lib/wallet/balance';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const agentId = params.get('agentId') ?? undefined;
    const agentWalletAddress = params.get('agentWalletAddress') ?? undefined;
    const issuance = getAgentIssuance({ agentId, walletAddress: agentWalletAddress });
    const profile = agentWalletAddress ? latestProfile(agentWalletAddress) : latestProfile();
    const profileWalletAddress = profile && profile.agentId === agentId ? profile.agentWalletAddress : undefined;
    const walletAddress = agentWalletAddress ?? issuance?.walletAddress ?? profileWalletAddress;
    if (!walletAddress) return jsonError('agentWalletAddress or a persisted agentId is required', 400);

    const balance = await fetchBaseWalletBalance({ address: walletAddress });
    return jsonOk({ balance: { ...balance, agentId: agentId ?? issuance?.agentId ?? profile?.agentId } });
  } catch (error) {
    return jsonError(error, 400);
  }
}
