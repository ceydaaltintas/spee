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

const SYSTEM_PROMPT = `Sen bir yazılım geliştirme uzmanısın. Kullanıcı sana bir PBI (Product Backlog Item) başlığı ve açıklaması verecek.
Sen bu metni analiz edip aşağıdaki kriterleri 1-5 ölçeğinde veya sayısal/boolean olarak tahmin edeceksin.

Kriterlerin açıklamaları:
- technicalComplexity: 1=basit, 5=çok karmaşık
- scopeClarity: 1=çok net, 5=belirsiz
- techDebtRisk: 1=temiz kod, 5=borç yığını
- domainKnowledge: 1=kimse bilmiyor, 5=takım uzman
- testLoad: 1=az test yeter, 5=kapsamlı test gerek
- integrationPoints: kaç dış servis/API ile konuşuyor (sayı)
- affectedModuleCount: kaç modül etkilenecek (sayı)
- hasSecurityConstraint: güvenlik kısıtı var mı (true/false)
- hasPerformanceConstraint: performans kısıtı var mı (true/false)

Sadece metinden çıkarılabilecek değerleri döndür. Emin olmadıklarını döndürme.

detectedTaskType için YALNIZCA şu değerlerden birini kullan (başka hiçbir şey yazma):
USER_STORY, BUG, ANALYSIS, TEST_TASK, DESIGN, DEVOPS, SPIKE, SUB_TASK
Emin değilsen null yaz.

Yanıtını SADECE JSON olarak ver, başka hiçbir şey yazma:
{
  "detectedTaskType": "USER_STORY",
  "criteria": {
    "technicalComplexity": 3,
    "scopeClarity": 2,
    "hasSecurityConstraint": true
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

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 300,
      }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.status}`);

    const json = await res.json() as any;
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response');

    const parsed = JSON.parse(content);

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
