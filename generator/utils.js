/**
 * generator/utils.js
 * Небольшие утилиты генератора.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.escapeForHTML && gen.normalizeSimpleText) {
    return;
  }

  function escapeForHTML(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSimpleText(text) {
    return String(text || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  gen.escapeForHTML = escapeForHTML;
  gen.normalizeSimpleText = normalizeSimpleText;
})();
