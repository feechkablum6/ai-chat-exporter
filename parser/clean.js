/**
 * parser/clean.js
 * Сборка и очистка HTML ответа.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.extractCleanHTML) {
    return;
  }

  var removeUIElements = parser.removeUIElements;
  var removeAiDisclaimerBlocks = parser.removeAiDisclaimerBlocks;
  var removeFeedbackUiBlocks = parser.removeFeedbackUiBlocks;
  var markCaveatBlocks = parser.markCaveatBlocks;
  var convertRoleHeadings = parser.convertRoleHeadings;
  var processLatexFormulas = parser.processLatexFormulas;
  var processCodeBlocks = parser.processCodeBlocks;
  var normalizeImageSources = parser.normalizeImageSources;
  var embedBlobImagesAsDataUrls = parser.embedBlobImagesAsDataUrls;
  var compactAnswerMedia = parser.compactAnswerMedia;
  var appendSourcePanelBlock = parser.appendSourcePanelBlock;
  var buildSourcePanelBlock = parser.buildSourcePanelBlock;
  var wrapTablesForScroll = parser.wrapTablesForScroll;
  var normalizeInlineWrappers = parser.normalizeInlineWrappers;
  var normalizeTextNodes = parser.normalizeTextNodes;
  var removeLeafUiTextNodes = parser.removeLeafUiTextNodes;
  var removeOrphanedPunctuation = parser.removeOrphanedPunctuation;
  var removeCommentNodes = parser.removeCommentNodes;
  var stripGoogleAttributes = parser.stripGoogleAttributes;
  var removeEmptyElements = parser.removeEmptyElements;

  /**
   * Извлекает очищенный HTML из элемента.
   */
  function extractCleanHTML(container, externalSourcePanelBlockEl) {
    var clone = container.cloneNode(true);
    var sourcePanelBlockEl = externalSourcePanelBlockEl || buildSourcePanelBlock(clone);

    // Удаляем UI-элементы
    removeUIElements(clone);
    removeAiDisclaimerBlocks(clone);
    removeFeedbackUiBlocks(clone);

    // Удаляем служебные теги
    clone
      .querySelectorAll(
        'button, svg, script, style, input, textarea, ' +
          '[role="navigation"], [role="dialog"], ' +
          '[role="status"], nav, header, footer, link[href*="gstatic.com/external_hosted"]'
      )
      .forEach(function(el) {
        el.remove();
      });

    // Помечаем блоки-замечания (caveat) перед очисткой атрибутов
    markCaveatBlocks(clone);

    // Конвертируем Google heading-ролевые div в семантические h-теги
    convertRoleHeadings(clone);

    // Обрабатываем LaTeX формулы (img с data-xpm-latex)
    processLatexFormulas(clone);

    // Обрабатываем блоки кода (добавляем метку языка)
    processCodeBlocks(clone);

    // Нормализуем src/srcset у картинок до чистого src
    normalizeImageSources(clone);

    // Конвертируем blob-изображения в data URL для standalone-файла
    embedBlobImagesAsDataUrls(clone);

    // Собираем изображения ответа в отдельный сворачиваемый блок
    compactAnswerMedia(clone);

    // Добавляем отдельный сворачиваемый блок с источниками Google (если есть)
    appendSourcePanelBlock(clone, sourcePanelBlockEl);

    // Оборачиваем таблицы для горизонтального скролла
    wrapTablesForScroll(clone);

    // Нормализация обёрток и текста
    normalizeInlineWrappers(clone);
    normalizeTextNodes(clone);
    removeLeafUiTextNodes(clone);
    removeOrphanedPunctuation(clone);

    // Финальная очистка
    removeCommentNodes(clone);
    stripGoogleAttributes(clone);
    removeEmptyElements(clone);

    return clone.innerHTML.trim();
  }

  parser.extractCleanHTML = extractCleanHTML;
})();
