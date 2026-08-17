import { env } from '../config/env.js';
import { extractSignals } from './extractor.js';

export interface AnalyzedCriteria {
  technicalComplexity?: number;
  scopeClarity?: number;
  techDebtRisk?: number;
  dependencyCount?: number;
  integrationPoints?: number;
  affectedModuleCount?: number;
  testLoad?: number;
  domainKnowledge?: number;
  hasSecurityConstraint?: boolean;
  hasPerformanceConstraint?: boolean;
  hasSimilarHistory?: boolean;
  reproductionDifficulty?: number;
  rootCauseClarity?: number;
  fixImpactScope?: number;
  regressionRisk?: number;
  ambiguityLevel?: number;
  testCaseCount?: number;
  stakeholderCount?: number;
}

export interface AnalyzeTextResult {
  detectedTaskType: string | null;
  suggestedCriteria: Record<string, { type: 'scale5' | 'count' | 'boolean'; value: number | boolean }>;
  sources: Record<string, 'regex' | 'llm'>;
  groqAvailable: boolean;
}

const SYSTEM_PROMPT = `Sen bir yazılım geliştirme uzmanısın. Sana verilen PBI başlığı ve açıklamasını analiz edeceksin.

GÖREV: Aşağıdaki kriterlerin HEPSİNİ metinden çıkarmaya çalış. Emin olduğun her kriter için değer ver.

KRİTERLER (mümkün olduğunca çoğunu doldur):
- technicalComplexity: 1=basit CRUD, 2=orta, 3=karmaşık mantık, 4=çok karmaşık, 5=araştırma gerektirir
- scopeClarity: 1=kristal net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=tamamen muğlak
- techDebtRisk: 1=temiz tasarım, 2=az risk, 3=orta risk, 4=yüksek borç riski, 5=legacy cehennem
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık
- testLoad: 1=birim test yeter, 2=birkaç test, 3=orta, 4=kapsamlı test, 5=çok boyutlu test
- integrationPoints: metinde geçen dış servis/API/sistem sayısı (0, 1, 2, 3...)
- affectedModuleCount: etkilenecek modül/bileşen tahmini (1, 2, 3...)
- hasSecurityConstraint: metinde güvenlik/auth/yetki/şifre/token söz konusu mu (true/false)
- hasPerformanceConstraint: metinde hız/performans/gecikme/cache/ölçeklendirme söz konusu mu (true/false)

detectedTaskType için YALNIZCA şunlardan birini seç:
USER_STORY (kullanıcı değeri sunan özellik), BUG (hata düzeltme), ANALYSIS (araştırma/analiz),
TEST_TASK (test yazımı), DESIGN (tasarım/UX), DEVOPS (altyapı/CI-CD), SPIKE (teknik araştırma), SUB_TASK (alt görev)
Emin değilsen null yaz.

ÇIKTI: SADECE JSON, başka hiçbir şey yazma:
{
  "detectedTaskType": "USER_STORY",
  "criteria": {
    "technicalComplexity": 3,
    "scopeClarity": 2,
    "techDebtRisk": 2,
    "domainKnowledge": 3,
    "testLoad": 3,
    "integrationPoints": 2,
    "affectedModuleCount": 3,
    "hasSecurityConstraint": true,
    "hasPerformanceConstraint": false
  }
}`;

export async function analyzeText(title: string, description?: string): Promise<AnalyzeTextResult> {
  const signals = extractSignals(title, description);

  // Regex'ten gelen kesin sonuçlar
  const suggestedCriteria: AnalyzeTextResult['suggestedCriteria'] = {};
  const sources: AnalyzeTextResult['sources'] = {};

  if (signals.hasSecurity) {
    suggestedCriteria.hasSecurityConstraint = { type: 'boolean', value: true };
    sources.hasSecurityConstraint = 'regex';
  }
  if (signals.hasPerformance) {
    suggestedCriteria.hasPerformanceConstraint = { type: 'boolean', value: true };
    sources.hasPerformanceConstraint = 'regex';
  }
  if (signals.acCount > 0) {
    suggestedCriteria.testCaseCount = { type: 'count', value: signals.acCount };
    sources.testCaseCount = 'regex';
  }

  if (!env.GROQ_API_KEY) {
    return { detectedTaskType: signals.detectedTaskType, suggestedCriteria, sources, groqAvailable: false };
  }

  try {
    const userMessage = `Başlık: ${title}\nAçıklama: ${description ?? '(yok)'}`;

    // Sırayla dene: önce daha güçlü model, fail ederse fallback
    const MODELS = ['openai/gpt-oss-20b', 'groq/compound'];
    let res: Response | null = null;
    for (const model of MODELS) {
      const attempt = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 400,
        }),
      });
      if (attempt.ok) { res = attempt; break; }
      console.warn(`[groq] model=${model} failed with ${attempt.status}, trying next`);
    }
    if (!res) throw new Error('All Groq models failed');

    const json = await res.json() as any;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    // JSON bloğunu çıkar (model bazen ```json ... ``` içinde döndürebilir)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = JSON.parse(jsonMatch[0]);

    const VALID_TASK_TYPES = new Set(['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK']);
    const rawDetected = parsed.detectedTaskType;
    const detectedTaskType = rawDetected && rawDetected !== 'null' && VALID_TASK_TYPES.has(rawDetected)
      ? rawDetected
      : signals.detectedTaskType;

    const SCALE5_KEYS = ['technicalComplexity', 'scopeClarity', 'techDebtRisk', 'domainKnowledge',
      'testLoad', 'reproductionDifficulty', 'rootCauseClarity', 'fixImpactScope', 'regressionRisk',
      'ambiguityLevel'];
    const COUNT_KEYS = ['integrationPoints', 'affectedModuleCount', 'dependencyCount', 'testCaseCount', 'stakeholderCount'];
    const BOOL_KEYS = ['hasSecurityConstraint', 'hasPerformanceConstraint', 'hasSimilarHistory'];

    for (const [key, val] of Object.entries(parsed.criteria ?? {})) {
      if (key in suggestedCriteria) continue; // regex sonucu korunur
      const num = Number(val);
      if (SCALE5_KEYS.includes(key) && num >= 1 && num <= 5) {
        suggestedCriteria[key] = { type: 'scale5', value: Math.round(num) };
        sources[key] = 'llm';
      } else if (COUNT_KEYS.includes(key) && num >= 0) {
        suggestedCriteria[key] = { type: 'count', value: Math.round(num) };
        sources[key] = 'llm';
      } else if (BOOL_KEYS.includes(key) && typeof val === 'boolean') {
        suggestedCriteria[key] = { type: 'boolean', value: val };
        sources[key] = 'llm';
      }
    }

    return { detectedTaskType, suggestedCriteria, sources, groqAvailable: true };
  } catch (e) {
    // Groq başarısız olursa regex sonuçlarıyla devam et
    return { detectedTaskType: signals.detectedTaskType, suggestedCriteria, sources, groqAvailable: false };
  }
}
