/**
 * generator.js (entry)
 *
 * Раньше здесь был монолитный генератор на ~1500 строк.
 * Сейчас логика разнесена по модулям в папке `generator/`.
 * Этот файл оставлен как тонкая точка входа.
 */

(function() {
  'use strict';

  // Предотвращаем повторную загрузку
  if (window.__googleAIChatGenerator) {
    return;
  }

  var root = window.__googleAIChatSaver;
  var api = root && root.generator ? root.generator : null;

  if (!api || typeof api.generateHTML !== 'function') {
    window.__googleAIChatGenerator = function() {
      return 'ERROR: Генератор не инициализирован (модули generator/* не загружены)';
    };
    return;
  }

  window.__googleAIChatGenerator = api.generateHTML;
})();
