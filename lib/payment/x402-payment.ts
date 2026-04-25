import { decodePaymentResponseHeader, encodePaymentResponseHeader } from '@x402/core/http';
import { HTTPFacilitatorClient, x402ResourceServer } from '@x402/core/server';
import type { PaymentPayload, PaymentRequirements, SettleResponse } from '@x402/core/types';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import type { ClientEvmSigner } from '@x402/evm';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { registerExactEvmScheme as registerExactEvmServerScheme } from '@x402/evm/exact/server';
import { explorerTxUrl, type BaseX402Network } from '../chains';
import { getRuntimeConfig } from '../env';
import { usdcUnits, verifyBaseTx } from '../tx/verify-base-tx';
import type { PurchaseEvent, UserProfile, X402PaymentRequest, X402SettlementProof } from '../types';

const X402_PAYMENT_TIMEOUT_SECONDS = 300;

export function x402Eip3009Domain(network: BaseX402Network) {
  if (network === 'eip155:84532') {
    return { name: 'USDC', version: '2' } as const;
  }
  return { name: 'USD Coin', version: '2' } as const;
}

export interface CreateAgentX402PaymentInput {
  signalId: string;
  agentWalletAddress: string;
  priceUsdc: number;
  resourceUrl?: string;
}

export interface AgentX402PaymentIntent extends PurchaseEvent {
  x402: X402PaymentRequest;
}

export interface AgentX402ExecutionResult {
  purchase: PurchaseEvent;
  x402Settlement: X402SettlementProof;
  paymentPayload?: PaymentPayload;
}

export function assertWalletAddress(address: string): asserts address is `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('A valid wallet address is required.');
}

function isTestMode() {
  return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

function paymentReceiverAddress() {
  const config = getRuntimeConfig();
  const receiverAddress = config.x402ReceiverAddress ?? config.platformWalletAddress;
  if (!receiverAddress) throw new Error('X402_RECEIVER_ADDRESS or PLATFORM_WALLET_ADDRESS must be configured before live x402 payment.');
  return receiverAddress;
}

function buildResourceUrl(signalId: string, explicitResourceUrl?: string) {
  if (explicitResourceUrl) return explicitResourceUrl;
  const config = getRuntimeConfig();
  const path = `/api/signals/${encodeURIComponent(signalId)}`;
  return config.x402ResourceBaseUrl ? new URL(path, config.x402ResourceBaseUrl).toString() : path;
}

export function buildX402PaymentRequirements(input: CreateAgentX402PaymentInput): X402PaymentRequest['paymentRequirements'] {
  const config = getRuntimeConfig();
  const receiverAddress = paymentReceiverAddress();
  const amountUnits = usdcUnits(input.priceUsdc).toString();
  const domain = x402Eip3009Domain(config.x402Network);
  return {
    scheme: 'exact',
    network: config.x402Network,
    amount: amountUnits,
    asset: config.x402PaymentToken,
    payTo: receiverAddress,
    maxTimeoutSeconds: X402_PAYMENT_TIMEOUT_SECONDS,
    extra: {
      name: domain.name,
      version: domain.version,
      assetTransferMethod: 'eip3009',
    },
  };
}

export function buildAgentX402PaymentRequest(input: CreateAgentX402PaymentInput): X402PaymentRequest {
  assertWalletAddress(input.agentWalletAddress);
  const config = getRuntimeConfig();
  const paymentRequirements = buildX402PaymentRequirements(input) satisfies PaymentRequirements;
  return {
    protocol: 'x402',
    version: 2,
    scheme: 'exact',
    network: config.x402Network,
    resourceUrl: buildResourceUrl(input.signalId, input.resourceUrl),
    facilitatorUrl: config.x402FacilitatorUrl,
    paymentExecutor: 'agent',
    agentWalletAddress: input.agentWalletAddress,
    receiverAddress: paymentRequirements.payTo,
    assetAddress: paymentRequirements.asset,
    amountUnits: paymentRequirements.amount,
    amountUsdc: input.priceUsdc,
    paymentRequirements,
    settlementProof: 'x402_facilitator_settlement_response',
  };
}

export function createAgentX402PaymentIntent(input: CreateAgentX402PaymentInput): AgentX402PaymentIntent {
  assertWalletAddress(input.agentWalletAddress);
  const config = getRuntimeConfig();
  if (!config.realPaymentsEnabled) throw new Error('Real payments are disabled by NEXT_PUBLIC_ENABLE_REAL_PAYMENTS.');
  if (!config.x402FacilitatorUrl) throw new Error('X402_FACILITATOR_URL must be configured for agent x402 payment.');
  if (input.priceUsdc > config.caps.maxSignalPriceUsdc) {
    throw new Error(`Signal price ${input.priceUsdc} USDC exceeds demo cap ${config.caps.maxSignalPriceUsdc} USDC.`);
  }

  const x402 = buildAgentX402PaymentRequest(input);

  return {
    id: `pur_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    signalId: input.signalId,
    buyerAddress: input.agentWalletAddress,
    priceUsdc: input.priceUsdc,
    paymentMode: 'x402',
    paymentExecutor: 'agent',
    agentWalletAddress: input.agentWalletAddress,
    x402ResourceUrl: x402.resourceUrl,
    paymentStatus: 'awaiting_agent',
    timestamp: Date.now(),
    x402,
  };
}

export function createAgentX402Fetch(signer: ClientEvmSigner, fetchImpl: typeof fetch = fetch, network: BaseX402Network = getRuntimeConfig().x402Network) {
  const client = new x402Client();
  registerExactEvmScheme(client, { signer, networks: [network] });
  return wrapFetchWithPayment(fetchImpl, client);
}

export async function fetchWithAgentX402(input: { signer: ClientEvmSigner; resourceUrl: string; init?: RequestInit; fetchImpl?: typeof fetch }) {
  const fetchWithPayment = createAgentX402Fetch(input.signer, input.fetchImpl ?? fetch);
  const response = await fetchWithPayment(input.resourceUrl, input.init);
  return {
    response,
    paymentResponseHeader: response.headers.get('PAYMENT-RESPONSE') ?? response.headers.get('payment-response'),
  };
}

function createX402ResourceServer(facilitatorUrl: string, network: BaseX402Network) {
  const server = new x402ResourceServer(new HTTPFacilitatorClient({ url: facilitatorUrl }));
  registerExactEvmServerScheme(server, { networks: [network] });
  return server;
}

function createX402Client(signer: ClientEvmSigner, network: BaseX402Network) {
  const client = new x402Client();
  registerExactEvmScheme(client, { signer, networks: [network] });
  return client;
}

export async function executeAgentX402Payment(input: { profile: UserProfile; purchase: PurchaseEvent; x402: X402PaymentRequest; signer?: ClientEvmSigner }): Promise<AgentX402ExecutionResult> {
  const { profile, purchase, x402 } = input;
  if (profile.agentWalletProvider === 'cdp-smart-account') {
    throw new Error('CDP smart-account signatures are not accepted by the current x402 exact EIP-3009 verifier. Complete onboarding again to issue a CDP server-account x402 payer.');
  }
  if (profile.agentWalletProvider !== 'cdp-server-account') throw new Error('Live x402 payment requires a CDP server-account agent wallet.');
  if (profile.agentWalletAddress?.toLowerCase() !== x402.agentWalletAddress.toLowerCase()) throw new Error('x402 payer does not match the issued agent wallet.');

  if (process.env.AGENTALPHA_MOCK_X402_SETTLEMENT === 'true') {
    if (!isTestMode()) throw new Error('AGENTALPHA_MOCK_X402_SETTLEMENT is only allowed in test mode.');
    return completeX402Settlement({
      purchase,
      x402,
      settlement: {
        success: true,
        payer: x402.agentWalletAddress,
        transaction: `0x${'9'.repeat(64)}`,
        network: x402.network,
        amount: x402.amountUnits,
      },
      verifiedBy: 'test_x402_mock',
    });
  }

  if (!input.signer) throw new Error('A CDP agent signer is required to execute live x402 payment.');
  const server = createX402ResourceServer(x402.facilitatorUrl, x402.network);
  await server.initialize();
  const requirements = await server.buildPaymentRequirements({
    scheme: x402.scheme,
    network: x402.network,
    payTo: x402.receiverAddress,
    price: { amount: x402.amountUnits, asset: x402.assetAddress, extra: x402.paymentRequirements.extra },
    maxTimeoutSeconds: x402.paymentRequirements.maxTimeoutSeconds,
  });
  const paymentRequired = await server.createPaymentRequiredResponse(requirements, {
    url: x402.resourceUrl,
    description: `AgentAlpha signal ${purchase.signalId}`,
    mimeType: 'application/json',
  });
  const paymentPayload = await createX402Client(input.signer, x402.network).createPaymentPayload(paymentRequired);
  const matchingRequirements = server.findMatchingRequirements(paymentRequired.accepts, paymentPayload);
  if (!matchingRequirements) throw new Error('x402 client did not create a payload matching AgentAlpha payment requirements.');
  const verification = await server.verifyPayment(paymentPayload, matchingRequirements);
  if (!verification.isValid) throw new Error(`x402 payment verification failed: ${verification.invalidReason ?? 'invalid payment'}`);
  const settlement = await server.settlePayment(paymentPayload, matchingRequirements);
  return completeX402Settlement({ purchase, x402, settlement, paymentPayload, verifiedBy: 'x402_facilitator' });
}

export function decodeX402SettlementHeader(paymentResponseHeader: string) {
  return decodePaymentResponseHeader(paymentResponseHeader);
}

export async function verifyX402SettlementProof(input: { purchase: PurchaseEvent; x402: X402PaymentRequest; paymentResponseHeader: string }): Promise<AgentX402ExecutionResult> {
  const settlement = decodeX402SettlementHeader(input.paymentResponseHeader);
  return completeX402Settlement({ ...input, settlement, verifiedBy: 'x402_facilitator' });
}

async function completeX402Settlement(input: {
  purchase: PurchaseEvent;
  x402: X402PaymentRequest;
  settlement: SettleResponse;
  paymentPayload?: PaymentPayload;
  verifiedBy: X402SettlementProof['verifiedBy'];
}): Promise<AgentX402ExecutionResult> {
  const { purchase, x402, settlement } = input;
  if (purchase.paymentMode !== 'x402') throw new Error('Purchase is not an x402 payment.');
  if (!settlement.success) throw new Error(settlement.errorMessage ?? settlement.errorReason ?? 'x402 settlement failed.');
  if (settlement.network !== x402.network) throw new Error(`x402 settlement was not on the configured Base network ${x402.network}.`);
  if (!settlement.payer) throw new Error('x402 settlement response did not include payer.');
  assertWalletAddress(settlement.payer);
  if (settlement.payer.toLowerCase() !== x402.agentWalletAddress.toLowerCase()) throw new Error('x402 settlement payer does not match the issued agent wallet.');
  if (settlement.amount && BigInt(settlement.amount) < BigInt(x402.amountUnits)) throw new Error('x402 settlement amount is below the required signal price.');

  const verified = await verifyBaseTx(settlement.transaction, {
    expectedTokenTransfer: {
      tokenAddress: x402.assetAddress,
      from: x402.agentWalletAddress,
      to: x402.receiverAddress,
      minAmountUnits: BigInt(x402.amountUnits),
    },
  });
  const paymentResponseHeader = encodePaymentResponseHeader(settlement);
  const transaction = settlement.transaction as `0x${string}`;
  const x402Settlement: X402SettlementProof = {
    success: true,
    payer: settlement.payer,
    transaction,
    network: x402.network,
    amount: settlement.amount ?? x402.amountUnits,
    resourceUrl: input.paymentPayload?.resource?.url ?? x402.resourceUrl,
    paymentResponseHeader,
    verifiedBy: input.verifiedBy,
    settledAt: Date.now(),
  };

  if (x402Settlement.resourceUrl !== x402.resourceUrl) throw new Error('x402 settlement resource does not match the purchased signal.');

  const completed: PurchaseEvent = {
    ...purchase,
    buyerAddress: x402.agentWalletAddress,
    agentWalletAddress: x402.agentWalletAddress,
    paymentExecutor: 'agent',
    paymentTxHash: transaction,
    paymentStatus: verified.status,
    explorerUrl: verified.explorerUrl,
    confirmedAt: verified.status === 'confirmed' ? Date.now() : purchase.confirmedAt,
    x402ResourceUrl: x402.resourceUrl,
    x402Settlement,
  };

  return { purchase: completed, x402Settlement, paymentPayload: input.paymentPayload };
}
