/**
 * generator/constants.js
 * Константы и конфиг генератора HTML.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.constants && gen.constants.__loaded) {
    return;
  }

  gen.constants = {
    __loaded: true,

    // Максимальное количество проходов очистки пустых узлов цитаты
    MAX_EMPTY_NODE_PASSES: 5,

    // Минимальная длина data-URI, чтобы не считаться плейсхолдером
    MIN_DATA_URI_LENGTH: 180,

    // Разделитель между ходами в исходном коде (для карты документа Notepad++)
    TURN_SOURCE_SPACER: '\n\n\n\n\n'
  };
})();
