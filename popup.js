/**
 * popup.js
 * Управляет кнопками popup-окна расширения.
 * По клику инжектирует parser.js и generator.js в страницу,
 * запускает парсинг и скачивает результат.
 */

const statusEl = document.getElementById('status');

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = type || '';
}


/**
 * Основная функция: парсит чат и генерирует файл.
 */
async function saveChat(format) {
  try {
    setStatus('Извлечение данных...');

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.url || !tab.url.includes('google.')) {
      setStatus('Откройте Google AI Mode', 'error');
      return;
    }

    // Важно: скрипты могут быть уже загружены в таб (content_script / предыдущий инжект).
    // Сбрасываем наш неймспейс, чтобы гарантированно применялись актуальные версии модулей.
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        try {
          delete window.__googleAIChatSaver;
        } catch (err) {
          window.__googleAIChatSaver = undefined;
        }

        try {
          delete window.__googleAIChatParser;
        } catch (err) {
          window.__googleAIChatParser = undefined;
        }

        try {
          delete window.__googleAIChatGenerator;
        } catch (err) {
          window.__googleAIChatGenerator = undefined;
        }
      }
    });

    // Инжектируем скрипты парсера и генератора (модульная версия)
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        'shared/ns.js',

        // Parser modules
        'parser/constants.js',
        'parser/text.js',
        'parser/dom.js',
        'parser/images.js',
        'parser/sources.js',
        'parser/ui.js',
        'parser/table.js',
        'parser/math.js',
        'parser/code.js',
        'parser/semantics.js',
        'parser/clean.js',
        'parser/core.js',
        'parser.js',

        // Generator modules
        'generator/constants.js',
        'generator/utils.js',
        'generator/quote.js',
        'generator/answer.js',
        'generator/turns.js',
        'generator/viewer.js',
        'generator/styles.js',
        'generator/runtime.js',
        'generator/core.js',
        'generator.js'
      ]
    });

    // Запускаем парсинг и генерацию
    const dataResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runParseAndGenerate
    });

    if (!dataResults || !dataResults[0] || !dataResults[0].result) {
      setStatus('Не удалось извлечь чат', 'error');
      return;
    }

    const htmlContent = dataResults[0].result;

    if (htmlContent.startsWith('ERROR:')) {
      setStatus(htmlContent, 'error');
      return;
    }

    // Оборачиваем в PHP если нужно
    const finalContent = format === 'php'
      ? wrapInPHP(htmlContent)
      : htmlContent;

    const extension = format === 'php' ? 'php' : 'html';
    const filename = `google_ai_chat_${Date.now()}.${extension}`;

    downloadFile(finalContent, filename, 'text/html');
    setStatus('Файл сохранен!', 'success');

  } catch (err) {
    console.error('Ошибка расширения:', err);
    setStatus('Ошибка: ' + err.message, 'error');
  }
}


/**
 * Функция, выполняемая в контексте страницы.
 * Вызывает парсер и генератор.
 */
function runParseAndGenerate() {
  if (typeof window.__googleAIChatParser !== 'function') {
    return 'ERROR: Парсер не загружен';
  }
  if (typeof window.__googleAIChatGenerator !== 'function') {
    return 'ERROR: Генератор не загружен';
  }

  const turns = window.__googleAIChatParser();

  if (!turns || turns.length === 0) {
    return 'ERROR: Ходы чата не найдены. Убедитесь что вы на странице Google AI Mode с перепиской.';
  }

  return window.__googleAIChatGenerator(turns);
}


/**
 * Оборачивает HTML в минимальный PHP (для хостинга).
 */
function wrapInPHP(html) {
  return `<?php
// Google AI Chat - сохранено расширением Google AI Chat Saver
header('Content-Type: text/html; charset=utf-8');
?>
${html}`;
}


/**
 * Скачивает содержимое как файл.
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}


// Обработчики кнопок
document.getElementById('saveHtml').addEventListener('click', () => {
  saveChat('html');
});

document.getElementById('savePhp').addEventListener('click', () => {
  saveChat('php');
});

// DEBUG MODE START
document.getElementById('debugBtn').addEventListener('click', async () => {
  try {
    setStatus('Сбор данных...');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function() {
        // Helper to find the best container
        function findBestContainer() {
          try {
            // 1. Try standard AI container selector (prioritize the one with actual content)
            const aiContainers = Array.from(document.querySelectorAll('[data-subtree="aimc"], [data-aimmrs="true"]'));
            if (aiContainers.length > 0) {
               // Return the last one that has reasonable size
               return aiContainers[aiContainers.length - 1];
            }

            // 2. Try the turn containers known to parser
            const turnSelector = 'div.tonYlb, div[data-tr-rsts], [jsmodel*="CPTaDd"][data-tr-rsts]';
            const turns = Array.from(document.querySelectorAll(turnSelector));
            if (turns.length > 0) {
              return turns[turns.length - 1];
            }

            // 3. Fallback: try to find heading-like elements often used in Google Cards
            const specificHeadings = Array.from(document.querySelectorAll('div[role="heading"], h3'));
            const likelyCardHeading = specificHeadings.find(h =>
              (h.innerText && (h.innerText.includes('Central Park') || h.innerText.includes('Town Lake')))
            );

            if (likelyCardHeading) {
               // Traverse up to find a container
               let p = likelyCardHeading.parentElement;
               while (p && p !== document.body) {
                 if (p.classList.contains('tonYlb') || p.getAttribute('data-subtree') === 'aimc') {
                   return p;
                 }
                 // If it looks like a card list container
                 if (p.children.length > 1 && p.innerText.length > 200) {
                    return p;
                 }
                 p = p.parentElement;
               }
               return likelyCardHeading.parentElement;
            }

            // 4. Last resort: Return main content area
            const main = document.querySelector('main') || document.querySelector('[role="main"]');
            if (main) return main;

            return document.body;
          } catch (e) {
            return document.body;
          }
        }

        const container = findBestContainer();
        if (!container) return 'ERROR: Container not found';

        // Return outerHTML
        return container.outerHTML;
      }
    });

    if (!results || !results[0] || !results[0].result) {
      setStatus('Ошибка: Данные не найдены', 'error');
      return;
    }

    const html = results[0].result;

    // Copy to clipboard
    await navigator.clipboard.writeText(html);
    setStatus('HTML скопирован в буфер!', 'success');

  } catch (err) {
    console.error(err);
    setStatus('Ошибка: ' + err.message, 'error');
  }
});
// DEBUG MODE END
