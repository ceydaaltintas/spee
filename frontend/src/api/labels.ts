export const CRITERIA_LABELS: Record<string, { label: string; description: string }> = {
  technicalComplexity:      { label: 'Teknik Karmaşıklık',             description: '1=basit, 5=çok karmaşık' },
  scopeClarity:             { label: 'Kapsam Netliği',                 description: '1=çok net, 5=belirsiz' },
  dependencyCount:          { label: 'Bağımlılık Sayısı',              description: 'Kaç farklı sisteme/modüle bağımlı' },
  integrationPoints:        { label: 'Entegrasyon Noktası',            description: 'Kaç dış servis/API ile konuşuyor' },
  techDebtRisk:             { label: 'Teknik Borç Riski',              description: '1=temiz kod, 5=borç yığını' },
  testLoad:                 { label: 'Test Yükü',                      description: '1=az test yeter, 5=kapsamlı test gerek' },
  affectedModuleCount:      { label: 'Etkilenen Modül Sayısı',         description: 'Kaç modül/bileşen değişecek' },
  domainKnowledge:          { label: 'Takım Alan Bilgisi',             description: '1=kimse bilmiyor, 5=takım uzman (ters: uzman=kolay)' },
  hasSimilarHistory:        { label: 'Benzer Geçmiş Var mı',           description: 'Daha önce benzer iş yapıldı mı' },
  hasSecurityConstraint:    { label: 'Güvenlik Kısıtı',                description: 'Yetkilendirme, şifreleme vb. güvenlik gereksinimleri' },
  hasPerformanceConstraint: { label: 'Performans Kısıtı',              description: 'Gecikme, işlem hızı vb. performans hedefi' },
  reproductionDifficulty:   { label: 'Tekrarlama Zorluğu',             description: '1=kolayca tekrarlanır, 5=nadiren oluşur' },
  rootCauseClarity:         { label: 'Kök Neden Netliği',              description: '1=hiç fikir yok, 5=neden belli (ters: belli=kolay)' },
  fixImpactScope:           { label: 'Düzeltme Etki Alanı',            description: '1=izole, 5=her yeri etkiler' },
  regressionRisk:           { label: 'Regresyon Riski',                description: '1=düşük risk, 5=çok şey bozulabilir' },
  ambiguityLevel:           { label: 'Belirsizlik Seviyesi',           description: '1=her şey net, 5=tamamen belirsiz' },
  stakeholderCount:         { label: 'Paydaş Sayısı',                  description: 'Kaç kişi/ekip onay verecek' },
  dataAccessDifficulty:     { label: 'Veri Erişim Zorluğu',            description: '1=kolay erişim, 5=çok zor' },
  outputFormality:          { label: 'Çıktı Formalitesi',              description: '1=kısa not, 5=resmî doküman' },
  testCaseCount:            { label: 'Test Senaryosu Sayısı',          description: 'Yazılması gereken test sayısı' },
  envSetupComplexity:       { label: 'Ortam Hazırlık Zorluğu',         description: '1=hemen hazır, 5=karmaşık kurulum' },
  automationFeasibility:    { label: 'Otomasyon Kolaylığı',             description: '1=manuel şart, 5=kolayca otomatize edilir (ters: kolay=az efor)' },
  regressionScope:          { label: 'Regresyon Kapsamı',               description: '1=dar alan, 5=geniş etki' },
  testDataComplexity:       { label: 'Test Verisi Karmaşıklığı',       description: '1=basit veri, 5=karmaşık hazırlık' },
  screenCount:              { label: 'Ekran/Bileşen Sayısı',           description: 'Tasarlanacak ekran adedi' },
  approvalRounds:           { label: 'Onay Turu Sayısı',               description: 'Beklenen revizyon/onay sayısı' },
  userResearchNeeded:       { label: 'Kullanıcı Araştırması Gerekli',   description: 'Kullanıcı testi/görüşmesi gerekiyor mu' },
  designSystemFit:          { label: 'Tasarım Sistemi Uyumu',          description: '1=mevcut tasarım sistemi yeter, 5=sıfırdan çizmek gerek' },
  platformDiversity:        { label: 'Platform Çeşitliliği',           description: '1=tek platform, 5=çoklu platform/uyumlu tasarım' },
  envComplexity:            { label: 'Ortam Karmaşıklığı',             description: '1=tek ortam, 5=çoklu ortam' },
  requiresDowntime:         { label: 'Kesinti Gerektirir mi',          description: 'Yayınlama sırasında kesinti olacak mı' },
  rollbackComplexity:       { label: 'Geri Alma Zorluğu',              description: '1=tek tıkla geri alınır, 5=geri alınamaz' },
  crossTeamCoordination:    { label: 'Ekipler Arası Koordinasyon',     description: '1=bağımsız, 5=çok ekip koordinasyonu' },
  productionRisk:           { label: 'Canlı Ortam Riski',              description: '1=düşük risk, 5=kritik sistem etkisi' },
  teamMemberCount:          { label: 'Çalışan Kişi Sayısı',            description: 'Bu iş üzerinde kaç kişi çalışacak (varsayılan: 1)' },
};

export const TECHNIQUE_LABELS: Record<string, string> = {
  FIBONACCI: 'Fibonacci',
  MODIFIED_FIBONACCI: 'Değiştirilmiş Fibonacci',
  TSHIRT: 'Tişört Boyutlandırma',
  POWERS_OF_TWO: 'İkinin Kuvvetleri',
  LINEAR: 'Doğrusal (1–10)',
  CUSTOM: 'Özel',
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  USER_STORY: 'Kullanıcı Hikâyesi / Özellik',
  BUG: 'Hata / Kusur',
  ANALYSIS: 'Analiz / Araştırma',
  TEST_TASK: 'Test Görevi',
  DESIGN: 'Tasarım / Kullanıcı Deneyimi',
  DEVOPS: 'Altyapı / DevOps',
  SPIKE: 'Araştırma / Kavram İspatı',
  SUB_TASK: 'Alt Görev',
};

export function criteriaLabel(key: string): string {
  return CRITERIA_LABELS[key]?.label ?? key;
}

export function criteriaDescription(key: string): string {
  return CRITERIA_LABELS[key]?.description ?? '';
}
