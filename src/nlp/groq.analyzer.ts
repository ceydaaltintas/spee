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
  dataAccessDifficulty?: number;
  outputFormality?: number;
  envSetupComplexity?: number;
  automationFeasibility?: number;
  regressionScope?: number;
  testDataComplexity?: number;
  screenCount?: number;
  approvalRounds?: number;
  userResearchNeeded?: number;
  designSystemFit?: number;
  platformDiversity?: number;
  envComplexity?: number;
  requiresDowntime?: boolean;
  rollbackComplexity?: number;
  crossTeamCoordination?: number;
  productionRisk?: number;
}

export interface AnalyzeTextResult {
  detectedTaskType: string | null;
  suggestedCriteria: Record<string, { type: 'scale5' | 'count' | 'boolean'; value: number | boolean }>;
  sources: Record<string, 'regex' | 'llm'>;
  groqAvailable: boolean;
  modelUsed?: string;
}

const SCALE5_KEYS = [
  'technicalComplexity', 'scopeClarity', 'techDebtRisk', 'domainKnowledge',
  'testLoad', 'reproductionDifficulty', 'rootCauseClarity', 'fixImpactScope',
  'regressionRisk', 'ambiguityLevel', 'dataAccessDifficulty', 'outputFormality',
  'envSetupComplexity', 'automationFeasibility', 'regressionScope', 'testDataComplexity',
  'userResearchNeeded', 'designSystemFit', 'envComplexity', 'rollbackComplexity',
  'crossTeamCoordination', 'productionRisk',
];
const COUNT_KEYS = [
  'integrationPoints', 'affectedModuleCount', 'dependencyCount', 'testCaseCount',
  'stakeholderCount', 'screenCount', 'approvalRounds', 'platformDiversity',
];
const BOOL_KEYS = ['hasSecurityConstraint', 'hasPerformanceConstraint', 'hasSimilarHistory', 'requiresDowntime'];

const PROMPTS: Record<string, string> = {
  USER_STORY: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Kullanıcı Hikayesi / Feature PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- technicalComplexity: 1=basit CRUD, 2=orta, 3=karmaşık mantık, 4=çok karmaşık, 5=araştırma gerektirir
- scopeClarity: 1=kristal net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=tamamen muğlak
- techDebtRisk: 1=temiz tasarım, 2=az risk, 3=orta risk, 4=yüksek borç riski, 5=legacy cehennem
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık
- testLoad: 1=birim test yeter, 2=birkaç test, 3=orta, 4=kapsamlı test, 5=çok boyutlu test
- integrationPoints: dış servis/API/sistem sayısı (0,1,2,3...)
- dependencyCount: bağımlı modül/ekip/servis sayısı (0,1,2,3...)
- affectedModuleCount: etkilenecek modül/bileşen sayısı (1,2,3...)
- hasSecurityConstraint: güvenlik/auth/yetki/şifre/token geçiyor mu (true/false)
- hasPerformanceConstraint: hız/performans/gecikme/cache/ölçeklendirme geçiyor mu (true/false)

ÇIKTI: SADECE JSON:
{"detectedTaskType":"USER_STORY","criteria":{"technicalComplexity":3,"scopeClarity":2,"techDebtRisk":2,"domainKnowledge":2,"testLoad":3,"integrationPoints":1,"dependencyCount":1,"affectedModuleCount":2,"hasSecurityConstraint":false,"hasPerformanceConstraint":false}}`,

  BUG: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Bug/Hata PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- reproductionDifficulty: 1=her zaman üretilebilir, 2=kolay, 3=bazen, 4=zor, 5=aralıklı/üretilemez
- rootCauseClarity: 1=kök neden belli, 2=büyük ihtimal belli, 3=kısmen, 4=belirsiz, 5=tamamen bilinmiyor
- fixImpactScope: 1=tek satır, 2=bir fonksiyon, 3=bir modül, 4=birden fazla servis, 5=sistem geneli
- regressionRisk: 1=yok, 2=düşük, 3=orta, 4=yüksek, 5=kritik yolları etkiler
- techDebtRisk: 1=temiz düzeltme, 2=az risk, 3=orta, 4=yüksek borç riski, 5=legacy cehennem
- domainKnowledge: 1=basit, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık
- hasSecurityConstraint: güvenlik/auth/veri sızıntısı/açığı söz konusu mu (true/false)

ÇIKTI: SADECE JSON:
{"detectedTaskType":"BUG","criteria":{"reproductionDifficulty":3,"rootCauseClarity":3,"fixImpactScope":2,"regressionRisk":2,"techDebtRisk":2,"domainKnowledge":2,"hasSecurityConstraint":false}}`,

  ANALYSIS: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Analiz/Araştırma PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- scopeClarity: 1=kristal net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=tamamen muğlak
- ambiguityLevel: 1=net hedef, 2=büyük ihtimal net, 3=bazı belirsizlikler, 4=belirsiz, 5=tamamen muğlak
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık
- dataAccessDifficulty: 1=veri hazır, 2=kolay erişim, 3=orta çaba, 4=zor erişim, 5=erişilmez/gizli
- outputFormality: 1=not yeterli, 2=basit döküman, 3=orta rapor, 4=kapsamlı rapor, 5=resmi belge/sunum
- stakeholderCount: karar vericiler/paydaşlar (1,2,3...)
- dependencyCount: bağımlı sistemler/ekipler (0,1,2,3...)

ÇIKTI: SADECE JSON:
{"detectedTaskType":"ANALYSIS","criteria":{"scopeClarity":3,"ambiguityLevel":3,"domainKnowledge":3,"dataAccessDifficulty":2,"outputFormality":2,"stakeholderCount":2,"dependencyCount":1}}`,

  TEST_TASK: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Test/QA PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- testCaseCount: yazılacak tahmini test sayısı (1,5,10,20...)
- envSetupComplexity: 1=local çalışır, 2=basit kurulum, 3=orta, 4=karmaşık, 5=özel ortam gerektirir
- automationFeasibility: 1=kolayca otomatize edilir, 2=büyük ihtimal, 3=kısmen, 4=zor, 5=manuel zorunlu
- regressionScope: 1=tek alan, 2=bir modül, 3=birkaç modül, 4=uygulama geneli, 5=tüm sistem
- testDataComplexity: 1=sabit veri yeterli, 2=basit fixture, 3=orta veri hazırlığı, 4=karmaşık, 5=prod benzeri veri
- scopeClarity: 1=test kapsamı net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=muğlak
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık

ÇIKTI: SADECE JSON:
{"detectedTaskType":"TEST_TASK","criteria":{"testCaseCount":10,"envSetupComplexity":2,"automationFeasibility":2,"regressionScope":2,"testDataComplexity":2,"scopeClarity":2,"domainKnowledge":2}}`,

  DESIGN: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Tasarım/UX PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- screenCount: tasarlanacak ekran/sayfa/bileşen sayısı (1,2,3...)
- platformDiversity: hedef platform sayısı — web, mobil, tablet... (1,2,3...)
- approvalRounds: tahmini onay turu sayısı (1,2,3...)
- userResearchNeeded: 1=araştırma yok, 2=az, 3=orta, 4=kapsamlı, 5=kullanıcı testleri gerekli
- designSystemFit: 1=mevcut sistem tam uyar, 2=büyük ihtimal, 3=uyarlamalar gerekli, 4=büyük eklemeler, 5=sıfırdan
- scopeClarity: 1=kristal net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=muğlak
- stakeholderCount: onay vericiler/paydaşlar (1,2,3...)
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık

ÇIKTI: SADECE JSON:
{"detectedTaskType":"DESIGN","criteria":{"screenCount":3,"platformDiversity":1,"approvalRounds":2,"userResearchNeeded":2,"designSystemFit":2,"scopeClarity":2,"stakeholderCount":2,"domainKnowledge":2}}`,

  DEVOPS: `Sen bir yazılım geliştirme uzmanısın. Sana verilen DevOps/Altyapı PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- envComplexity: 1=tek servis, 2=birkaç servis, 3=orta, 4=çok servisli, 5=çoklu cluster/region
- productionRisk: 1=prod'u etkilemez, 2=düşük risk, 3=orta, 4=yüksek risk, 5=kritik servis kesintisi
- rollbackComplexity: 1=tek komut, 2=basit, 3=orta, 4=karmaşık, 5=rollback mümkün değil
- crossTeamCoordination: 1=tek ekip, 2=koordinasyon az, 3=orta, 4=çok ekip, 5=kurum geneli
- techDebtRisk: 1=temiz, 2=az risk, 3=orta, 4=yüksek borç, 5=legacy cehennem
- dependencyCount: bağımlı servis/ekip sayısı (0,1,2,3...)
- domainKnowledge: 1=basit, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık
- requiresDowntime: sistem kesintisi gerekiyor mu (true/false)

ÇIKTI: SADECE JSON:
{"detectedTaskType":"DEVOPS","criteria":{"envComplexity":2,"productionRisk":2,"rollbackComplexity":2,"crossTeamCoordination":1,"techDebtRisk":2,"dependencyCount":1,"domainKnowledge":3,"requiresDowntime":false}}`,

  SPIKE: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Spike/PoC PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- ambiguityLevel: 1=net hedef, 2=büyük ihtimal net, 3=bazı belirsizlikler, 4=belirsiz, 5=tamamen muğlak
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık
- dataAccessDifficulty: 1=bilgi hazır, 2=kolay erişim, 3=orta çaba, 4=zor erişim, 5=erişilmez
- scopeClarity: 1=araştırma hedefi net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=muğlak
- stakeholderCount: etkilenen paydaş/ekip sayısı (1,2,3...)

ÇIKTI: SADECE JSON:
{"detectedTaskType":"SPIKE","criteria":{"ambiguityLevel":4,"domainKnowledge":4,"dataAccessDifficulty":3,"scopeClarity":3,"stakeholderCount":2}}`,

  SUB_TASK: `Sen bir yazılım geliştirme uzmanısın. Sana verilen Alt Görev PBI'sını analiz edeceksin.

KRİTERLER (metinden çıkarabildiğin kadarını doldur, emin olmadığını yazma):
- technicalComplexity: 1=basit CRUD, 2=orta, 3=karmaşık mantık, 4=çok karmaşık, 5=araştırma gerektirir
- scopeClarity: 1=kristal net, 2=açık, 3=bazı belirsizlikler, 4=belirsiz, 5=muğlak
- domainKnowledge: 1=basit domain, 2=öğrenilebilir, 3=orta uzmanlık, 4=derin bilgi, 5=nadir uzmanlık

ÇIKTI: SADECE JSON:
{"detectedTaskType":"SUB_TASK","criteria":{"technicalComplexity":2,"scopeClarity":1,"domainKnowledge":2}}`,
};

const DEFAULT_PROMPT = PROMPTS.USER_STORY!;

export async function analyzeText(
  title: string,
  description?: string,
  hintTaskType?: string,
): Promise<AnalyzeTextResult> {
  const signals = extractSignals(title, description);
  const VALID_TASK_TYPES = new Set(['USER_STORY', 'BUG', 'ANALYSIS', 'TEST_TASK', 'DESIGN', 'DEVOPS', 'SPIKE', 'SUB_TASK']);

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
    return { detectedTaskType: hintTaskType ?? signals.detectedTaskType, suggestedCriteria, sources, groqAvailable: false };
  }

  try {
    const validHint = hintTaskType && VALID_TASK_TYPES.has(hintTaskType) ? hintTaskType : null;
    const systemPrompt = validHint ? (PROMPTS[validHint] ?? DEFAULT_PROMPT) : DEFAULT_PROMPT;
    const userMessage = `Başlık: ${title}\nAçıklama: ${description ?? '(yok)'}`;

    async function callGemini(attempt = 0): Promise<any> {
      if (!env.GEMINI_API_KEY) { console.warn('[gemini] no API key'); return null; }
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userMessage }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1500 },
            }),
            signal: controller.signal,
          },
        );
      } catch (e: any) {
        console.warn('[gemini] fetch error:', e.message);
        return null;
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[gemini] HTTP ${res.status}: ${errText.slice(0, 200)}`);
        if (res.status === 503 && attempt === 0) {
          console.log('[gemini] 503 — 3s bekleyip retry yapılıyor');
          await new Promise(r => setTimeout(r, 3000));
          return callGemini(1);
        }
        return null;
      }
      const json = await res.json() as any;
      const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) {
        console.warn('[gemini] empty content, candidates:', JSON.stringify(json.candidates).slice(0, 400));
        return null;
      }
      try {
        const direct = JSON.parse(content);
        const criteriaCount = Object.keys(direct.criteria ?? {}).length;
        console.log(`[gemini] direct parse ok — type=${direct.detectedTaskType} criteria=${criteriaCount}`);
        return direct;
      } catch { /* fallthrough to regex */ }
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { console.warn('[gemini] no JSON found in content'); return null; }
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log(`[gemini] ok — type=${parsed.detectedTaskType} criteria=${Object.keys(parsed.criteria ?? {}).length}`);
        return parsed;
      } catch { console.warn('[gemini] JSON parse failed'); return null; }
    }

    async function callGroq(model: string): Promise<any> {
      if (!env.GROQ_API_KEY) return null;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      let res: Response;
      try {
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
            response_format: { type: 'json_object' },
            temperature: 0.1,
            max_tokens: 600,
          }),
          signal: controller.signal,
        });
      } catch (e: any) {
        console.warn(`[groq] model=${model} fetch error:`, e.message);
        return null;
      } finally {
        clearTimeout(timer);
      }
      if (!res.ok) { console.warn(`[groq] model=${model} failed with ${res.status}`); return null; }
      const json = await res.json() as any;
      const content = json.choices?.[0]?.message?.content;
      if (!content) return null;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      try { return JSON.parse(jsonMatch[0]); } catch { return null; }
    }

    const attempts: Array<() => Promise<any>> = [
      () => callGemini(),
      () => callGroq('groq/compound'),
      () => callGroq('groq/compound-mini'),
    ];
    const modelNames = ['gemini-flash-lite', 'groq/compound', 'groq/compound-mini'];

    let parsed: any = null;
    let usedModel = '';

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
    const detectedTaskType =
      validHint ??
      (rawDetected && rawDetected !== 'null' && VALID_TASK_TYPES.has(rawDetected) ? rawDetected : signals.detectedTaskType);

    for (const [key, val] of Object.entries(parsed.criteria ?? {})) {
      if (key in suggestedCriteria) continue;
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
    return { detectedTaskType: hintTaskType ?? signals.detectedTaskType, suggestedCriteria, sources, groqAvailable: false };
  }
}
