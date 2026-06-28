import type { CriteriaKey } from './types';

export const SCALE5_LABELS: Partial<Record<CriteriaKey, string[]>> = {
  technicalComplexity:    ['Çok basit', 'Basit', 'Orta', 'Karmaşık', 'Çok karmaşık'],
  scopeClarity:           ['Çok net', 'Net', 'Kısmen net', 'Belirsiz', 'Çok belirsiz'],
  techDebtRisk:           ['Temiz', 'Az borç', 'Orta borç', 'Riskli', 'Borç yığını'],
  testLoad:               ['Minimal test', 'Az test', 'Orta test', 'Kapsamlı test', 'Yoğun test'],
  domainKnowledge:        ['Bilgi yok', 'Az biliyor', 'Orta', 'İyi biliyor', 'Tam uzman'],
  reproductionDifficulty: ['Her zaman', 'Genelde', 'Bazen', 'Nadiren', 'Çok nadir'],
  rootCauseClarity:       ['Hiç fikir yok', 'Tahmin var', 'Kısmen belli', 'Büyük ölçüde belli', 'Tam belli'],
  fixImpactScope:         ['İzole', 'Dar alan', 'Orta alan', 'Geniş alan', 'Her yeri etkiler'],
  regressionRisk:         ['Çok düşük', 'Düşük', 'Orta', 'Yüksek', 'Çok yüksek'],
  ambiguityLevel:         ['Her şey net', 'Az belirsiz', 'Orta', 'Belirsiz', 'Tamamen belirsiz'],
  dataAccessDifficulty:   ['Çok kolay', 'Kolay', 'Orta', 'Zor', 'Çok zor'],
  outputFormality:        ['Kısa not', 'Özet', 'Doküman', 'Resmî rapor', 'Resmî sunum'],
  envSetupComplexity:     ['Hazır', 'Basit kurulum', 'Orta', 'Karmaşık', 'Çok karmaşık'],
  automationFeasibility:  ['Manuel şart', 'Zor', 'Kısmen', 'Kolay', 'Çok kolay'],
  regressionScope:        ['Çok dar', 'Dar', 'Orta', 'Geniş', 'Çok geniş'],
  testDataComplexity:     ['Çok basit', 'Basit', 'Orta', 'Karmaşık', 'Çok karmaşık'],
  designSystemFit:        ['Tam uyumlu', 'Büyük ölçüde', 'Kısmen', 'Az uyumlu', 'Sıfırdan'],
  platformDiversity:      ['Tek platform', 'İki platform', 'Birkaç', 'Çok platform', 'Her platform'],
  envComplexity:          ['Tek ortam', 'İki ortam', 'Birkaç', 'Karmaşık', 'Çok karmaşık'],
  rollbackComplexity:     ['Tek tık', 'Kolay', 'Orta', 'Zor', 'İmkânsız'],
  crossTeamCoordination:  ['Bağımsız', 'Bir ekip', 'Birkaç ekip', 'Çok ekip', 'Tüm organizasyon'],
  productionRisk:         ['Sıfır risk', 'Düşük', 'Orta', 'Yüksek', 'Kritik'],
};

export function getScaleLabel(key: string, value: number): string {
  const labels = SCALE5_LABELS[key as CriteriaKey];
  if (!labels || value < 1 || value > 5) return String(value);
  return `${value} — ${labels[value - 1]}`;
}
