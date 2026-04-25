import fs from 'node:fs';
import path from 'node:path';
import { migrateUserProfile } from '../profile-migration';
import type { AgentIssuance, AgentRunState, DerivedRelation, ExecutionEvent, PurchaseEvent, RevenueDistributionEvent, UserProfile } from '../types';

export interface DemoLedger {
  profiles: UserProfile[];
  purchases: PurchaseEvent[];
  executions: ExecutionEvent[];
  derivedRelations: DerivedRelation[];
  revenueEvents: RevenueDistributionEvent[];
  agentIssuances: AgentIssuance[];
  agentRuns: AgentRunState[];
}

const EMPTY_LEDGER: DemoLedger = {
  profiles: [],
  purchases: [],
  executions: [],
  derivedRelations: [],
  revenueEvents: [],
  agentIssuances: [],
  agentRuns: [],
};

export function ledgerPath() {
  return process.env.AGENTALPHA_LEDGER_PATH ?? path.join(process.cwd(), '.data', 'ledger.json');
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function readLedger(): DemoLedger {
  const filePath = ledgerPath();
  if (!fs.existsSync(filePath)) return structuredClone(EMPTY_LEDGER);
  const raw = fs.readFileSync(filePath, 'utf8');
  if (!raw.trim()) return structuredClone(EMPTY_LEDGER);
  return { ...structuredClone(EMPTY_LEDGER), ...(JSON.parse(raw) as Partial<DemoLedger>) };
}

export function writeLedger(ledger: DemoLedger) {
  const filePath = ledgerPath();
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2));
}

export function resetLedger() {
  writeLedger(structuredClone(EMPTY_LEDGER));
}

export function saveProfile(profile: UserProfile) {
  const ledger = readLedger();
  ledger.profiles = [profile, ...ledger.profiles.filter((existing) => !sameProfile(existing, profile))];
  writeLedger(ledger);
  return profile;
}

function profileWallets(profile: UserProfile) {
  return [profile.walletAddress, profile.paymentWalletAddress, profile.agentWalletAddress].filter(Boolean).map((value) => value!.toLowerCase());
}

function sameProfile(a: UserProfile, b: UserProfile) {
  const aWallets = profileWallets(a);
  const bWallets = profileWallets(b);
  return (
    aWallets.some((wallet) => bWallets.includes(wallet)) ||
    Boolean(a.agentId && a.agentId === b.agentId) ||
    (a.createdAt === b.createdAt && a.consentTimestamp === b.consentTimestamp)
  );
}

export function latestProfile(walletAddress?: string) {
  const profiles = readLedger().profiles;
  if (walletAddress) {
    const normalized = walletAddress.toLowerCase();
    const profile = profiles.find((profile) => profileWallets(profile).includes(normalized));
    return profile ? migrateUserProfile(profile) : undefined;
  }
  return profiles[0] ? migrateUserProfile(profiles[0]) : undefined;
}

export function saveAgentIssuance(issuance: AgentIssuance) {
  const ledger = readLedger();
  ledger.agentIssuances = [issuance, ...ledger.agentIssuances.filter((existing) => existing.agentId !== issuance.agentId && existing.walletAddress.toLowerCase() !== issuance.walletAddress.toLowerCase())];
  writeLedger(ledger);
  return issuance;
}

export function getAgentIssuance(input: { agentId?: string; walletAddress?: string }) {
  const normalizedWallet = input.walletAddress?.toLowerCase();
  return readLedger().agentIssuances.find((issuance) => {
    if (input.agentId && issuance.agentId === input.agentId) return normalizedWallet ? issuance.walletAddress.toLowerCase() === normalizedWallet : true;
    return Boolean(normalizedWallet && issuance.walletAddress.toLowerCase() === normalizedWallet);
  });
}

export function saveAgentRun(run: AgentRunState) {
  const ledger = readLedger();
  const normalizedWallet = run.agentWalletAddress.toLowerCase();
  ledger.agentRuns = [
    run,
    ...ledger.agentRuns.filter((existing) => existing.agentId !== run.agentId && existing.agentWalletAddress.toLowerCase() !== normalizedWallet),
  ];
  writeLedger(ledger);
  return run;
}

export function latestAgentRun(input: { agentId?: string; agentWalletAddress?: string }) {
  const normalizedWallet = input.agentWalletAddress?.toLowerCase();
  return readLedger().agentRuns.find((run) => {
    if (input.agentId && run.agentId === input.agentId) return normalizedWallet ? run.agentWalletAddress.toLowerCase() === normalizedWallet : true;
    return Boolean(normalizedWallet && run.agentWalletAddress.toLowerCase() === normalizedWallet);
  });
}

export function savePurchase(purchase: PurchaseEvent) {
  const ledger = readLedger();
  ledger.purchases = [purchase, ...ledger.purchases.filter((existing) => existing.id !== purchase.id)];
  writeLedger(ledger);
  return purchase;
}

export function getPurchase(id: string) {
  return readLedger().purchases.find((purchase) => purchase.id === id);
}

export function saveExecution(execution: ExecutionEvent) {
  const ledger = readLedger();
  ledger.executions = [execution, ...ledger.executions.filter((existing) => existing.id !== execution.id)];
  writeLedger(ledger);
  return execution;
}

export function getExecution(id: string) {
  return readLedger().executions.find((execution) => execution.id === id);
}

export function saveDerivedRelation(relation: DerivedRelation) {
  const ledger = readLedger();
  ledger.derivedRelations = [relation, ...ledger.derivedRelations.filter((existing) => existing.derivedSignalId !== relation.derivedSignalId)];
  writeLedger(ledger);
  return relation;
}

export function saveRevenueEvent(event: RevenueDistributionEvent) {
  const ledger = readLedger();
  ledger.revenueEvents = [event, ...ledger.revenueEvents.filter((existing) => existing.id !== event.id)];
  writeLedger(ledger);
  return event;
}
