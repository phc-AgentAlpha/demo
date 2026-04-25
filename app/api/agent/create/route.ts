import { jsonOk } from '@/lib/http';
import { createDemoAgent } from '@/lib/agent/demo-agent';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { seed?: string };
  return jsonOk({ agent: createDemoAgent(body.seed ?? 'alex') });
}
