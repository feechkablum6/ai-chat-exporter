/**
 * parser.js (entry)
 *
 * Раньше здесь был монолитный парсер на ~3200 строк.
 * Теперь логика разнесена по модулям в папке `parser/`.
 * Этот файл оставлен как тонкая точка входа для content_script и инжекта.
 */

(function() {
  'use strict';

  // Предотвращаем повторную загрузку
  if (window.__googleAIChatParser) {
    return;
  }

  var root = window.__googleAIChatSaver;
  var api = root && root.parser ? root.parser : null;

  if (!api || typeof api.parseGoogleAIChat !== 'function') {
    // Модули не загрузились / порядок файлов нарушен.
    window.__googleAIChatParser = function() {
      return 'ERROR: Парсер не инициализирован (модули parser/* не загружены)';
    };
    return;
  }

  window.__googleAIChatParser = api.parseGoogleAIChat;
})();
