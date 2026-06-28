import { env } from '../config/env.js';

let pipeline: any = null;

async function getEmbeddingPipeline() {
  if (pipeline) return pipeline;
  const { pipeline: createPipeline } = await import('@xenova/transformers');
  pipeline = await createPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    cache_dir: process.env.EMBEDDING_CACHE_DIR ?? './.cache/models',
  });
  return pipeline;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const pipe = await getEmbeddingPipeline();
  const truncated = text.slice(0, 2048);
  const output = await pipe(truncated, { pooling: 'mean', normalize: true });
  return Array.from(output.data as Float32Array);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
