import { classifyStyleWithFlock } from '@/lib/onboarding/flock-classifier';
import { jsonError, jsonOk } from '@/lib/http';
import type { ClassifyStyleRequest } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClassifyStyleRequest;
    const result = await classifyStyleWithFlock(body);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error, 400);
  }
}
