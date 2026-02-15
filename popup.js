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
        'parser/places.js',
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

/**
 * Запускает отладку изображений в источниках.
 */
async function debugImages() {
  try {
    setStatus('Запуск отладки...');

    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab || !tab.url || !tab.url.includes('google.')) {
      setStatus('Откройте Google AI Mode', 'error');
      return;
    }

    // Инжектируем скрипты (те же, что и для парсинга, чтобы была доступна логика)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        'shared/ns.js',
        'parser/constants.js',
        'parser/text.js',
        'parser/dom.js',
        'parser/images.js',
        'parser/sources.js',
        'parser/places.js',
        'parser/ui.js',
        'parser/table.js',
        'parser/math.js',
        'parser/code.js',
        'parser/semantics.js',
        'parser/clean.js',
        'parser/core.js',
        'parser.js'
      ]
    });

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: runDebugImagesContentScript
    });

    setStatus('Отчет создан на странице!', 'success');

  } catch (err) {
    console.error('Debug error:', err);
    setStatus('Ошибка отладки: ' + err.message, 'error');
  }
}

function runDebugImagesContentScript() {
  var root = window.__googleAIChatSaver;
  if (!root || !root.parser) {
    alert('Parser not loaded properly.');
    return;
  }
  var parser = root.parser;

  // 1. Find candidates
  // Search entire body for source panels
  var candidates = parser.collectSourcePanelCandidates(document.body);

  var report = [];

  candidates.forEach(function(candidate, index) {
    var imgs = parser.collectSourceImageCandidates(candidate);
    var icon = parser.pickSourceIconCandidate(imgs);
    var iconLower = icon ? icon.srcLower : '';

    // Replicate pickSourceThumbCandidate logic to log scores
    var thumbScores = [];
    var excluded = iconLower;
    var pool = (imgs || []).filter(function(item) {
      if (!item) return false;
      if (excluded && item.srcLower === excluded) return false;
      if (item.isFavicon) return false;
      return true;
    });

    pool.forEach(function(item) {
      var area = Number(item.area || 0);
      var len = Number(item.srcLen || 0);
      var score = 0;
      var reason = '';

      if (area > 0) {
        score = area * 10 + len;
        reason = 'Area * 10 + Len';
      } else {
        if (len > 60 && item.srcLower.indexOf('data:') !== 0) {
          score = 5000 + len;
          reason = 'Lazy (>60 chars) + Len + 5000';
        } else {
          score = len;
          reason = 'Len only';
        }
      }
      thumbScores.push({ src: item.src.substring(0, 50) + '...', score: score, reason: reason, area: area, len: len });
    });

    var pickedThumb = parser.pickSourceThumbCandidate(candidate, imgs, iconLower);

    report.push({
      index: index,
      htmlSnippet: candidate.outerHTML.substring(0, 300) + '...',
      imagesFound: imgs.length,
      iconPicked: icon ? { src: icon.src, w: icon.w, h: icon.h } : 'None',
      thumbPicked: pickedThumb ? { src: pickedThumb.src, isFallback: pickedThumb.isFallback } : 'None',
      thumbScores: thumbScores
    });
  });

  var json = JSON.stringify(report, null, 2);

  // Create overlay
  var div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '100%';
  div.style.height = '100%';
  div.style.backgroundColor = 'rgba(0,0,0,0.8)';
  div.style.zIndex = '999999';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.padding = '20px';
  div.style.boxSizing = 'border-box';

  var textarea = document.createElement('textarea');
  textarea.style.width = '80%';
  textarea.style.height = '80%';
  textarea.value = json;
  textarea.style.marginBottom = '10px';

  var closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close Debug';
  closeBtn.style.padding = '10px 20px';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = function() { document.body.removeChild(div); };

  var info = document.createElement('div');
  info.style.color = '#fff';
  info.style.marginBottom = '10px';
  info.style.fontSize = '18px';
  info.style.fontWeight = 'bold';
  info.textContent = 'Копирование...';

  // Try copy
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(json).then(function() {
      info.textContent = 'Отчет скопирован в буфер! Отправьте его разработчику.';
      info.style.color = '#81c784';
    }).catch(function(err) {
      info.textContent = 'Не удалось скопировать автоматически. Скопируйте текст ниже вручную.';
      info.style.color = '#e57373';
    });
  } else {
    info.textContent = 'Скопируйте текст ниже вручную и отправьте разработчику.';
  }

  div.appendChild(info);
  div.appendChild(textarea);
  div.appendChild(closeBtn);
  document.body.appendChild(div);
}

document.getElementById('debugImages').addEventListener('click', debugImages);
