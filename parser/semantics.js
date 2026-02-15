/**
 * parser/semantics.js
 * Семантические улучшения: headings и caveat-блоки.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.convertRoleHeadings && parser.markCaveatBlocks) {
    return;
  }

  var c = parser.constants || {};
  var CAVEAT_PATTERNS = c.CAVEAT_PATTERNS || [];

  /**
   * Конвертирует Google-элементы с role="heading" в семантические h-теги.
   */
  function convertRoleHeadings(container) {
    container.querySelectorAll('[role="heading"]').forEach(function(el) {
      var level = parseInt(el.getAttribute('aria-level') || '3', 10);
      var tag = level >= 1 && level <= 6 ? 'h' + level : 'h3';

      // Не конвертируем если это часть вопроса (уже удалён removeQuestionTextNodes)
      // или содержит сложную вложенную структуру
      if (el.querySelector('ul, ol, table, pre, img')) return;

      var heading = document.createElement(tag);
      while (el.firstChild) {
        heading.appendChild(el.firstChild);
      }
      el.replaceWith(heading);
    });
  }

  /**
   * Помечает блоки-замечания (caveat) специальным классом.
   */
  function markCaveatBlocks(container) {
    container.querySelectorAll('strong, b').forEach(function(el) {
      var text = (el.innerText || '').toLowerCase().trim();
      for (var i = 0; i < CAVEAT_PATTERNS.length; i++) {
        var pattern = CAVEAT_PATTERNS[i];
        if (text.startsWith(pattern) || text === pattern.replace(':', '')) {
          el.setAttribute('data-caveat', 'label');

          var parent = el.parentElement;
          for (var j = 0; j < 3 && parent; j++) {
            if (parent.tagName === 'DIV' || parent.tagName === 'P') {
              parent.setAttribute('data-caveat', 'block');
              break;
            }
            parent = parent.parentElement;
          }
          break;
        }
      }
    });
  }

  parser.convertRoleHeadings = convertRoleHeadings;
  parser.markCaveatBlocks = markCaveatBlocks;
})();
