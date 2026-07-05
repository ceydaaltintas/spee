import { prisma } from '../../db/prisma.client.js';
import { TECHNIQUE_REGISTRY } from '../../techniques/technique.registry.js';

export interface CriteriaCbrResult {
  sp: number;
  similarity: number;
  matchCount: number;
  matches: { sourceId: string; approvedSP: number; similarity: number }[];
}

type CriteriaSnapshot = Record<string, { rawValue: { type: string; value: number | boolean } }>;
type CurrentCriteria = Record<string, { type: string; value: number | boolean }>;

function computeSimilarity(current: CurrentCriteria, snapshot: CriteriaSnapshot): number {
  const sharedKeys = Object.keys(current).filter(k => snapshot[k] !== undefined);
  if (sharedKeys.length < 2) return 0;

  let totalSim = 0;
  let count = 0;

  for (const key of sharedKeys) {
    const a = current[key]!;
    const b = snapshot[key]!.rawValue;
    if (a.type !== b.type) continue;

    let sim = 0;
    if (a.type === 'boolean') {
      sim = a.value === b.value ? 1 : 0;
    } else if (a.type === 'scale5') {
      sim = 1 - Math.abs((a.value as number) - (b.value as number)) / 4;
    } else {
      // count: log2-normalized
      const av = Math.log2((a.value as number) + 1);
      const bv = Math.log2((b.value as number) + 1);
      const maxV = Math.log2(51); // reasonable cap at 50
      sim = 1 - Math.abs(av - bv) / maxV;
    }
    totalSim += Math.max(0, sim);
    count++;
  }

  return count > 0 ? totalSim / count : 0;
}

function nearestFib(value: number, scale: (number | string)[]): number {
  const nums = scale
    .map(s => typeof s === 'number' ? s : parseInt(s as string, 10))
    .filter(n => !isNaN(n) && n > 0);
  if (nums.length === 0) return Math.round(value);
  return nums.reduce((closest, n) =>
    Math.abs(n - value) < Math.abs(closest - value) ? n : closest
  );
}

export async function runCriteriaCbr(
  currentCriteria: CurrentCriteria,
  teamId: string,
  taskType: string,
  technique: string,
  limit = 5,
): Promise<CriteriaCbrResult | null> {
  const pastEstimations = await prisma.estimationResult.findMany({
    where: {
      teamId,
      taskType: taskType as any,
      approvedSP: { not: null },
    },
    include: { workItem: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  if (pastEstimations.length === 0) return null;

  // Deduplicate by sourceId — keep only most recent per work item
  const latestBySourceId = new Map<string, typeof pastEstimations[0]>();
  for (const est of pastEstimations) {
    const key = est.workItem.sourceId;
    if (!latestBySourceId.has(key)) latestBySourceId.set(key, est);
  }

  const scored = Array.from(latestBySourceId.values())
    .map(est => {
      const snapshot = est.criteriaSnapshot as CriteriaSnapshot | null;
      if (!snapshot || typeof snapshot !== 'object') return null;
      const sim = computeSimilarity(currentCriteria, snapshot);
      return { sourceId: est.workItem.sourceId, approvedSP: est.approvedSP!, similarity: sim };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null && c.similarity >= 0.70)
    .sort((a, b) => b.similarity - a.similarity);

  if (scored.length === 0) return null;

  // Dominant match (similarity >= 0.90) — use only the best one to avoid cross-contamination
  const best = scored[0]!;
  const candidates = best.similarity >= 0.90
    ? [best]
    : scored.slice(0, limit);

  // Weighted average with squared similarity to amplify the closest match
  const totalWeight = candidates.reduce((s, c) => s + c.similarity * c.similarity, 0);
  const avgSP = candidates.reduce((s, c) => s + c.approvedSP * c.similarity * c.similarity, 0) / totalWeight;

  const config = TECHNIQUE_REGISTRY[technique];
  const scale = config?.scale ?? [1, 2, 3, 5, 8, 13, 21, 34, 55];
  const sp = nearestFib(avgSP, scale);

  return {
    sp,
    similarity: candidates[0]!.similarity,
    matchCount: candidates.length,
    matches: candidates,
  };
}
