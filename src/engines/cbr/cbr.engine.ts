import { prisma } from '../../db/prisma.client.js';
import { cosineSimilarity, weightedAverage } from './similarity.js';
import { mapScoreToSP, TECHNIQUE_REGISTRY, type TechniqueScale } from '../../techniques/technique.registry.js';

export interface CbrResult {
  sp: TechniqueScale;
  similarity: number;
  matchCount: number;
  matches: { sourceId: string; approvedSP: number; similarity: number }[];
}

export async function runCbrEngine(
  embedding: number[],
  teamId: string,
  taskType: string,
  technique: string,
  limit: number = 5,
): Promise<CbrResult | null> {
  const pastItems = await prisma.workItemCache.findMany({
    where: {
      teamId,
      estimations: {
        some: {
          taskType: taskType as any,
          approvedSP: { not: null },
        },
      },
    },
    include: {
      estimations: {
        where: {
          taskType: taskType as any,
          approvedSP: { not: null },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (pastItems.length === 0) return null;

  const scored = pastItems
    .filter(item => item.extractedSignals && typeof item.extractedSignals === 'object')
    .map(item => {
      const itemEmbedding = (item as any).embeddingVector as number[] | undefined;
      const sim = itemEmbedding ? cosineSimilarity(embedding, itemEmbedding) : 0;
      const approvedSP = item.estimations[0]?.approvedSP;
      return {
        sourceId: item.sourceId,
        approvedSP: approvedSP!,
        similarity: sim,
      };
    })
    .filter(s => s.approvedSP != null && s.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  if (scored.length === 0) return null;

  const avgSP = weightedAverage(
    scored.map(s => ({ value: s.approvedSP, weight: s.similarity })),
  );

  const config = TECHNIQUE_REGISTRY[technique];
  if (!config) return null;

  const numericScale = config.scale
    .map(s => typeof s === 'number' ? s : config.numericMapping?.[s] ?? 0)
    .filter(n => n > 0);

  let closestSP = numericScale[0]!;
  let closestDiff = Math.abs(avgSP - closestSP);
  for (const sp of numericScale) {
    const diff = Math.abs(avgSP - sp);
    if (diff < closestDiff) {
      closestSP = sp;
      closestDiff = diff;
    }
  }

  const spValue = mapScoreToSP(avgSP, technique);

  return {
    sp: spValue,
    similarity: scored[0]!.similarity,
    matchCount: scored.length,
    matches: scored,
  };
}
