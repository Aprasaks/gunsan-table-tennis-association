import raw from '@/data/jbtta-2026.json';
import type { Tournament } from '@/lib/tournaments';

export const staticTournaments = raw as Tournament[];

export function getStaticTournament(id: string) {
  return staticTournaments.find((item) => item.id === id) ?? null;
}
