/**
 * parser/table.js
 * Таблицы: оборачивание в горизонтальный скролл.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.wrapTablesForScroll) {
    return;
  }

  function wrapTablesForScroll(container) {
    container.querySelectorAll('table').forEach(function(tableEl) {
      if (
        tableEl.parentElement &&
        (tableEl.parentElement.getAttribute('data-table-scroll') === 'true' ||
          tableEl.parentElement.classList.contains('table-scroll'))
      ) {
        return;
      }

      var shell = document.createElement('div');
      shell.className = 'table-shell';
      shell.setAttribute('data-table-shell', 'true');

      var scrollEl = document.createElement('div');
      scrollEl.className = 'table-scroll';
      scrollEl.setAttribute('data-table-scroll', 'true');

      tableEl.parentNode.insertBefore(shell, tableEl);
      shell.appendChild(scrollEl);
      scrollEl.appendChild(tableEl);
    });
  }

  parser.wrapTablesForScroll = wrapTablesForScroll;
})();
