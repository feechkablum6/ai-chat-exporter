/**
 * shared/ns.js
 *
 * Единый неймспейс для модульного кода расширения.
 * Скрипты расширения исполняются как обычные (не ES modules), поэтому
 * используем общий объект на window.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) {
    root = {};
    window.__googleAIChatSaver = root;
  }

  if (!root.parser) root.parser = {};
  if (!root.generator) root.generator = {};
})();
