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
