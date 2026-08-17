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
  modelUsed?: string;
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

  if (!env.GROQ_API_KEY && !env.GEMINI_API_KEY) {
    return { detectedTaskType: signals.detectedTaskType, suggestedCriteria, sources, groqAvailable: false };
  }

  try {
    const userMessage = `Başlık: ${title}\nAçıklama: ${description ?? '(yok)'}`;

    const SCALE5_KEYS = ['technicalComplexity', 'scopeClarity', 'techDebtRisk', 'domainKnowledge',
      'testLoad', 'reproductionDifficulty', 'rootCauseClarity', 'fixImpactScope', 'regressionRisk',
      'ambiguityLevel'];
    const COUNT_KEYS = ['integrationPoints', 'affectedModuleCount', 'dependencyCount', 'testCaseCount', 'stakeholderCount'];
    const BOOL_KEYS = ['hasSecurityConstraint', 'hasPerformanceConstraint', 'hasSimilarHistory'];
    const VALID_TASK_TYPES = new Set(['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK']);

    async function callGemini(): Promise<any> {
      if (!env.GEMINI_API_KEY) { console.warn('[gemini] no API key'); return null; }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 500 },
          }),
        },
      );
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[gemini] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        return null;
      }
      const json = await res.json() as any;
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.warn('[gemini] empty content, candidates:', JSON.stringify(json.candidates).slice(0, 400));
        return null;
      }
      console.log('[gemini] content (first 300):', String(content).slice(0, 300));
      // JSON mode bazen sadece JSON döndürür, direkt parse dene
      try {
        const direct = JSON.parse(content);
        const criteriaCount = Object.keys(direct.criteria ?? {}).length;
        console.log(`[gemini] direct parse ok — type=${direct.detectedTaskType} criteria=${criteriaCount}`);
        return direct;
      } catch { /* JSON değil, regex ile dene */ }
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { console.warn('[gemini] no JSON found in content'); return null; }
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const criteriaCount = Object.keys(parsed.criteria ?? {}).length;
        console.log(`[gemini] ok — type=${parsed.detectedTaskType} criteria=${criteriaCount}`);
        return parsed;
      } catch { console.warn('[gemini] JSON parse failed'); return null; }
    }

    async function callGroq(model: string): Promise<any> {
      if (!env.GROQ_API_KEY) return null;
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userMessage }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
          max_tokens: 400,
        }),
      });
      if (!res.ok) { console.warn(`[groq] model=${model} failed with ${res.status}`); return null; }
      const json = await res.json() as any;
      const content = json.choices?.[0]?.message?.content;
      if (!content) return null;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      try { return JSON.parse(jsonMatch[0]); } catch { return null; }
    }

    // Önce Gemini, başarısız/kota doluysa Groq
    const attempts: Array<() => Promise<any>> = [
      () => callGemini(),
      () => callGroq('groq/compound'),
      () => callGroq('groq/compound-mini'),
    ];

    let parsed: any = null;
    let usedModel = '';
    const modelNames = ['gemini-2.0-flash', 'groq/compound', 'groq/compound-mini'];

    for (let i = 0; i < attempts.length; i++) {
      const result = await attempts[i]!();
      if (result && Object.keys(result.criteria ?? {}).length > 0) {
        parsed = result;
        usedModel = modelNames[i]!;
        break;
      }
      if (result && !parsed) { parsed = result; usedModel = modelNames[i]!; }
    }
    if (!parsed) throw new Error('All providers returned empty');

    const rawDetected = parsed.detectedTaskType;
    const detectedTaskType = rawDetected && rawDetected !== 'null' && VALID_TASK_TYPES.has(rawDetected)
      ? rawDetected
      : signals.detectedTaskType;

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

    return { detectedTaskType, suggestedCriteria, sources, groqAvailable: true, modelUsed: usedModel };
  } catch (e) {
    // Groq başarısız olursa regex sonuçlarıyla devam et
    return { detectedTaskType: signals.detectedTaskType, suggestedCriteria, sources, groqAvailable: false };
  }
}
