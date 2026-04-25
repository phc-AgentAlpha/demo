import { jsonError, jsonOk } from '@/lib/http';
import { buildUserProfile } from '@/lib/onboarding/profile';
import { getAgentIssuance, latestProfile, saveProfile } from '@/lib/ledger/store';
import type { ClassifyStyleRequest, ClassifyStyleResponse, UserProfile } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const walletAddress = new URL(request.url).searchParams.get('walletAddress') ?? undefined;
  return jsonOk({ profile: latestProfile(walletAddress) ?? null });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClassifyStyleRequest & {
      consentToIndexing: boolean;
      classification: ClassifyStyleResponse;
      agentId?: string;
      agentWalletAddress?: string;
    };
    let agentFields: Pick<UserProfile, 'agentId' | 'agentWalletAddress' | 'agentWalletProvider'> = {};
    if (body.agentId || body.agentWalletAddress) {
      const issuance = getAgentIssuance({ agentId: body.agentId, walletAddress: body.agentWalletAddress });
      if (!issuance) return jsonError('Agent wallet was not issued by this server session.', 403);
      agentFields = {
        agentId: issuance.agentId,
        agentWalletAddress: issuance.walletAddress,
        agentWalletProvider: issuance.walletProvider,
      };
    }
    const profile: UserProfile = {
      ...buildUserProfile(body),
      ...agentFields,
    };
    saveProfile(profile);
    return jsonOk({ profile });
  } catch (error) {
    return jsonError(error, 400);
  }
}
