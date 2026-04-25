import fs from 'node:fs';
import path from 'node:path';
import type { DerivedRelation, ExecutionEvent, PurchaseEvent, RevenueDistributionEvent, UserProfile } from '../types';

export interface DemoLedger {
  profiles: UserProfile[];
  purchases: PurchaseEvent[];
  executions: ExecutionEvent[];
  derivedRelations: DerivedRelation[];
  revenueEvents: RevenueDistributionEvent[];
}

const EMPTY_LEDGER: DemoLedger = {
  profiles: [],
  purchases: [],
  executions: [],
  derivedRelations: [],
  revenueEvents: [],
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
  ledger.profiles = [profile, ...ledger.profiles.filter((existing) => existing.walletAddress.toLowerCase() !== profile.walletAddress.toLowerCase())];
  writeLedger(ledger);
  return profile;
}

export function latestProfile(walletAddress?: string) {
  const profiles = readLedger().profiles;
  if (walletAddress) return profiles.find((profile) => profile.walletAddress.toLowerCase() === walletAddress.toLowerCase());
  return profiles[0];
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
