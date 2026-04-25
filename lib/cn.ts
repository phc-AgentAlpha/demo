export type ClassValue = string | number | null | false | undefined | ClassValue[] | { [k: string]: any };

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') { out.push(String(v)); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') { for (const k of Object.keys(v)) if (v[k]) out.push(k); }
  };
  inputs.forEach(walk);
  return out.join(' ');
}
