import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_KEY: z.string().min(1),
  FEATURE_NLP: z.coerce.boolean().default(false),
  FEATURE_CBR: z.coerce.boolean().default(false),
  FEATURE_ENSEMBLE: z.coerce.boolean().default(false),
  FEATURE_FEEDBACK: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
