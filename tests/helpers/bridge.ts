/**
 * @author harlin
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '../..');
export const BRIDGE_FILE = path.join(ROOT, 'test-results', 'e2e-bridge.json');

export type BridgePayload = {
  updatedAt: string;
  store?: string;
  productKeyword?: string;
  memberPhone?: string;
  wineName?: string;
  customerName?: string;
  note?: string;
};

export function writeBridge(patch: Partial<BridgePayload>) {
  fs.mkdirSync(path.dirname(BRIDGE_FILE), { recursive: true });
  let prev: BridgePayload = { updatedAt: new Date().toISOString() };
  if (fs.existsSync(BRIDGE_FILE)) {
    try {
      prev = JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8'));
    } catch {
      // ignore
    }
  }
  const next: BridgePayload = {
    ...prev,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(BRIDGE_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return next;
}

export function readBridge(): BridgePayload | null {
  if (!fs.existsSync(BRIDGE_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8')) as BridgePayload;
  } catch {
    return null;
  }
}
