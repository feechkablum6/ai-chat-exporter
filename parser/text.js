/**
 * parser/text.js
 * Базовые текстовые утилиты.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.normalizeText && parser.isSameText && parser.normalizeUserText) {
    return;
  }

  /**
   * Приводит текст к компактному виду (пробелы/переносы).
   */
  function normalizeText(text) {
    if (!text) return '';
    return String(text).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Нормализация текста пользователя без схлопывания переносов строк.
   * Важно: сохраняем структуру (\n, <br> в innerText и т.п.).
   */
  function normalizeUserText(text) {
    if (!text) return '';
    var value = String(text);
    value = value.replace(/\u00a0/g, ' ');
    value = value.replace(/\r\n?/g, '\n');
    return value.trim();
  }

  /**
   * Проверяет, совпадают ли два текста после нормализации.
   */
  function isSameText(a, b) {
    var left = normalizeText(a).toLowerCase();
    var right = normalizeText(b).toLowerCase();

    if (!left || !right) {
      return false;
    }

    return left === right;
  }

  parser.normalizeText = normalizeText;
  parser.normalizeUserText = normalizeUserText;
  parser.isSameText = isSameText;
})();
