/**
 * generator/answer.js
 * Разделение ответа на основной контент и панель источников.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.splitAnswerContent) {
    return;
  }

  function splitAnswerContent(answerHtml) {
    var host = document.createElement('div');
    host.innerHTML = String(answerHtml || '');

    var sourceDetailsEls = Array.from(host.querySelectorAll('details[data-ai-sources="true"]'));
    var bestSourceEl = null;

    for (var i = sourceDetailsEls.length - 1; i >= 0; i--) {
      var candidateEl = sourceDetailsEls[i];
      var hasSourceItems = !!candidateEl.querySelector('[data-ai-sources-list="true"], [data-ai-source-item="true"]');
      if (hasSourceItems) {
        bestSourceEl = candidateEl;
        break;
      }
    }

    // Убираем лишние/пустые блоки источников, если они по ошибке присутствуют.
    sourceDetailsEls.forEach(function(detailsEl) {
      if (!detailsEl) {
        return;
      }

      if (bestSourceEl && detailsEl === bestSourceEl) {
        return;
      }

      detailsEl.remove();
    });

    // Важно: источники должны идти ниже блока изображений ответа (если он есть).
    if (bestSourceEl && bestSourceEl.parentNode) {
      var galleries = Array.from(host.querySelectorAll('details[data-ai-gallery="true"]'));
      var lastGallery = galleries.length ? galleries[galleries.length - 1] : null;

      if (lastGallery && lastGallery.parentNode === bestSourceEl.parentNode) {
        // Если источники стоят ДО галереи, переносим их ПОСЛЕ галереи.
        var sourcesBeforeGallery =
          !!(bestSourceEl.compareDocumentPosition(lastGallery) & Node.DOCUMENT_POSITION_FOLLOWING);

        if (sourcesBeforeGallery) {
          lastGallery.insertAdjacentElement('afterend', bestSourceEl);
        }
      }
    }

    return {
      mainHtml: host.innerHTML.trim(),
      sourceHtml: ''
    };
  }

  gen.splitAnswerContent = splitAnswerContent;
})();
