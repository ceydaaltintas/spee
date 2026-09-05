const SPEE_URL = 'https://spee-app.vercel.app';

const TASK_TYPE_MAP = {
  'bug': 'BUG', 'hata': 'BUG',
  'user story': 'USER_STORY', 'kullanici hikayesi': 'USER_STORY', 'product backlog item': 'USER_STORY', 'pbi': 'USER_STORY',
  'task': 'SUB_TASK', 'görev': 'SUB_TASK', 'gorev': 'SUB_TASK',
  'test case': 'TEST_TASK', 'test': 'TEST_TASK',
  'feature': 'USER_STORY', 'epic': 'USER_STORY',
  'spike': 'SPIKE',
  'analysis': 'ANALYSIS', 'analiz': 'ANALYSIS',
};

let workItem = null;

function setText(id, text, fallback = '—') {
  const el = document.getElementById(id);
  if (!text) { el.textContent = fallback; el.classList.add('muted'); return; }
  el.textContent = text;
  el.classList.remove('muted');
}

function truncate(str, max = 80) {
  if (!str) return null;
  return str.length > max ? str.slice(0, max) + '…' : str;
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? '';

  let data = null;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        function getWorkItemId() {
          const urlMatch = window.location.href.match(/workitems\/edit\/(\d+)/i)
            || window.location.href.match(/[?&]id=(\d+)/i);
          if (urlMatch) return urlMatch[1];
          const titleMatch = document.title.match(/^(\d+)\s*[–\-]/);
          if (titleMatch) return titleMatch[1];
          return null;
        }
        function getTitle() {
          const selectors = ['input.work-item-form-title','[aria-label="Title"]','.work-item-form-title input','.title-area input','input[id*="title"]'];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.value) return el.value.trim();
          }
          const titleMatch = document.title.match(/^\d+\s*[–\-]\s*(.+)/);
          if (titleMatch) return titleMatch[1].trim();
          return null;
        }
        function getWorkItemType() {
          const selectors = ['.work-item-type-name','.work-item-form-header .wit-type-name','[class*="workItemTypeName"]','[aria-label="Work item type"] .combo-drop-call'];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) return el.textContent.trim();
          }
          return null;
        }
        function getDescription() {
          const selectors = ['.work-item-form-description .richeditor-text','[aria-label="Description"] .richeditor-text','.richeditor-text','[data-field-name="System.Description"] .richeditor-text'];
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
            '[data-field-name="System.IterationPath"] span',
          ];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent) {
              const parts = el.textContent.trim().split(/[\\\/]/);
              return parts[parts.length - 1].trim() || null;
            }
          }
          return null;
        }
        return { id: getWorkItemId(), title: getTitle(), type: getWorkItemType(), desc: getDescription(), sprint: getSprint() };
      },
    });
    data = results?.[0]?.result ?? null;
  } catch (e) {
    console.error('executeScript failed:', e);
  }

  document.getElementById('loading').style.display = 'none';

  if (!data || !data.title) {
    document.getElementById('not-tfs').style.display = 'block';
    document.getElementById('not-tfs').innerHTML =
      '<p style="color:#999;font-size:12px;text-align:center;padding:20px 0">İş kalemi bilgisi okunamadı.<br/>Sayfayı yenileyip tekrar deneyin.</p>';
    return;
  }

  workItem = data;
  document.getElementById('content').style.display = 'block';

  setText('wi-id', data.id);
  setText('wi-title', truncate(data.title, 60));
  setText('wi-sprint', data.sprint);
  setText('wi-desc', truncate(data.desc, 80));

  const typeEl = document.getElementById('wi-type');
  if (data.type) {
    typeEl.innerHTML = `<span class="badge">${data.type}</span>`;
  } else {
    typeEl.textContent = '—';
    typeEl.classList.add('muted');
  }

  document.getElementById('open-btn').addEventListener('click', openInSpee);
}

function openInSpee() {
  if (!workItem) return;
  const params = new URLSearchParams();
  if (workItem.title) params.set('title', workItem.title);
  if (workItem.desc)  params.set('desc', workItem.desc);
  if (workItem.id)    params.set('id', workItem.id);
  if (workItem.sprint) params.set('sprint', workItem.sprint);
  if (workItem.type) {
    const mapped = TASK_TYPE_MAP[workItem.type.toLowerCase()];
    if (mapped) params.set('type', mapped);
  }
  chrome.tabs.create({ url: `${SPEE_URL}/estimate?${params.toString()}` });
  window.close();
}

init();
