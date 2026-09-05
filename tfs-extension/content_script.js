// TFS iş kalemi sayfasından veri okur ve popup'a iletir

function getWorkItemId() {
  // URL'den: /workitems/edit/1234 veya ?id=1234
  const urlMatch = window.location.href.match(/workitems\/edit\/(\d+)/i)
    || window.location.href.match(/[?&]id=(\d+)/i);
  if (urlMatch) return urlMatch[1];

  // Sayfa başlığından: "1234 - Login düzeltme"
  const titleMatch = document.title.match(/^(\d+)\s*[–\-]/);
  if (titleMatch) return titleMatch[1];

  return null;
}

function getTitle() {
  // TFS 2018+ / Azure DevOps Server
  const selectors = [
    'input.work-item-form-title',
    '[aria-label="Title"]',
    '.work-item-form-title input',
    '.title-area input',
    '[data-is-focusable="true"][class*="title"]',
    'input[id*="title"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.value) return el.value.trim();
    if (el && el.textContent) return el.textContent.trim();
  }
  // Fallback: sayfa başlığından
  const titleMatch = document.title.match(/^\d+\s*[–\-]\s*(.+)/);
  if (titleMatch) return titleMatch[1].trim();
  return null;
}

function getWorkItemType() {
  const selectors = [
    '[aria-label="Work item type"] .combo-drop-call',
    '.work-item-type-name',
    '.work-item-form-header .wit-type-name',
    '[class*="workItemTypeName"]',
    '.wit-type-icon-wrapper + span',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent) return el.textContent.trim();
  }
  return null;
}

function getDescription() {
  const selectors = [
    '.work-item-form-description .richeditor-text',
    '[aria-label="Description"] .richeditor-text',
    '.description-area .richeditor-text',
    '[data-field-name="System.Description"] .richeditor-text',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el.innerText?.trim() || null;
  }
  return null;
}

function getSprint() {
  const selectors = [
    '[aria-label="Iteration Path"] .combo-drop-call',
    '.combo-drop-call[aria-label="Iteration Path"]',
    'span[aria-label="Iteration Path"]',
    '[aria-label="Sprint"] .combo-drop-call',
    '.combo-drop-call[aria-label="Sprint"]',
    '.work-item-form-iteration-path .combo-drop-call',
    '[data-field-name="System.IterationPath"] span',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent) {
      // "Proje\Sprint-42" → "Sprint-42" (son parça)
      const parts = el.textContent.trim().split(/[\\\/]/);
      return parts[parts.length - 1].trim() || null;
    }
  }
  return null;
}

// Popup mesaj dinleyici
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'GET_WORK_ITEM') {
    sendResponse({
      id: getWorkItemId(),
      title: getTitle(),
      type: getWorkItemType(),
      desc: getDescription(),
      sprint: getSprint(),
    });
  }
  return true;
});
