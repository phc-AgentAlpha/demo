import { jsonError, jsonOk } from '@/lib/http';
import { getDemoAgentBalance } from '@/lib/agent/demo-agent';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const agentId = new URL(request.url).searchParams.get('agentId');
  if (!agentId) return jsonError('agentId is required', 400);
  return jsonOk({ balance: getDemoAgentBalance(agentId) });
}
