import type { DataSnapshot } from './types';

const base = import.meta.env.BASE_URL;

export async function loadJSON<T>(filename: string): Promise<T | null> {
  try {
    const res = await fetch(`${base}${filename}`);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function loadSnapshot(): Promise<DataSnapshot | null> {
  return loadJSON<DataSnapshot>('data-snapshot.json');
}
