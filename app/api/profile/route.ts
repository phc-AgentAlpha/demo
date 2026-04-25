import { jsonError, jsonOk } from '@/lib/http';
import { buildUserProfile } from '@/lib/onboarding/profile';
import { latestProfile, saveProfile } from '@/lib/ledger/store';
import type { ClassifyStyleRequest, ClassifyStyleResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const walletAddress = new URL(request.url).searchParams.get('walletAddress') ?? undefined;
  return jsonOk({ profile: latestProfile(walletAddress) ?? null });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClassifyStyleRequest & { consentToIndexing: boolean; classification: ClassifyStyleResponse };
    const profile = buildUserProfile(body);
    saveProfile(profile);
    return jsonOk({ profile });
  } catch (error) {
    return jsonError(error, 400);
  }
}
