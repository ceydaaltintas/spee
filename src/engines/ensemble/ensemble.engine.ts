import { TECHNIQUE_REGISTRY, type TechniqueScale } from '../../techniques/technique.registry.js';

export interface EnsembleInput {
  ruleBasedSP: TechniqueScale;
  cbrSP?: TechniqueScale | null;
  technique: string;
}

export interface EnsembleResult {
  ensembleSP: TechniqueScale;
  agreement: boolean;
}

const ENGINE_WEIGHTS = {
  ruleBased: 0.50,
  cbr: 0.50,
};

export function runEnsemble(input: EnsembleInput): EnsembleResult {
  const config = TECHNIQUE_REGISTRY[input.technique];
  if (!config || input.cbrSP == null) {
    return { ensembleSP: input.ruleBasedSP, agreement: true };
  }

  const scale = config.scale;
  const ruleIdx = scale.indexOf(input.ruleBasedSP);
  const cbrIdx = scale.indexOf(input.cbrSP);

  if (ruleIdx === -1 || cbrIdx === -1) {
    return { ensembleSP: input.ruleBasedSP, agreement: true };
  }

  const weightedIdx = ruleIdx * ENGINE_WEIGHTS.ruleBased + cbrIdx * ENGINE_WEIGHTS.cbr;
  const roundedIdx = Math.round(weightedIdx);
  const clampedIdx = Math.max(0, Math.min(scale.length - 1, roundedIdx));

  const agreement = Math.abs(ruleIdx - cbrIdx) <= 2;

  return {
    ensembleSP: scale[clampedIdx]!,
    agreement,
  };
}
