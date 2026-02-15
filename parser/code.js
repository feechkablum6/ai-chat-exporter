/**
 * parser/code.js
 * Нормализация блоков кода и детект языка.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.processCodeBlocks) {
    return;
  }

  var c = parser.constants || {};
  var CODE_LANGUAGE_NAMES = c.CODE_LANGUAGE_NAMES;
  var CODE_LANGUAGE_DISPLAY = c.CODE_LANGUAGE_DISPLAY || {};
  var normalizeText = parser.normalizeText;

  /**
   * Обрабатывает блоки кода - извлекает язык из комментариев и структурирует.
   */
  function processCodeBlocks(container) {
    var codeBlocks = Array.from(container.querySelectorAll('pre'));
    if (codeBlocks.length === 0) return;

    var payloads = extractCodePayloads(container);
    var payloadIndex = 0;

    codeBlocks.forEach(function(preEl) {
      var codeEl = preEl.querySelector('code') || preEl;
      var payload = payloads[payloadIndex] || null;

      if (payload) {
        payloadIndex += 1;
      }

      var langKey = null;
      if (payload) {
        langKey = normalizeLanguageName(payload.language);
      } else {
        langKey = detectCodeLanguageNear(preEl);
      }

      var displayLangSource = null;
      if (langKey) {
        displayLangSource = langKey;
      } else if (payload) {
        displayLangSource = payload.language;
      }

      var displayLang = formatLanguageLabel(displayLangSource);

      if (payload && payload.code) {
        codeEl.textContent = normalizeCodeText(payload.code);
      } else {
        codeEl.textContent = normalizeCodeText(codeEl.textContent || '');
      }

      if (displayLang) {
        preEl.setAttribute('data-lang', displayLang);
      }

      if (langKey) {
        var labelNode = findClosestLanguageLabel(preEl, langKey);
        if (labelNode) {
          labelNode.remove();
        }
      }
    });

    container.querySelectorAll('code.o8j0Mc').forEach(function(codeEl) {
      if (codeEl.closest('pre')) return;
      codeEl.textContent = normalizeCodeText(codeEl.textContent || '');
    });
  }

  /**
   * Извлекает payload с исходным кодом из комментариев Sv6Kpe.
   */
  function extractCodePayloads(container) {
    var payloads = [];
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT, null, false);

    while (walker.nextNode()) {
      var commentText = walker.currentNode.nodeValue || '';
      var payload = parseCodeCommentPayload(commentText);
      if (payload) {
        payloads.push(payload);
      }
    }

    return payloads;
  }

  /**
   * Парсит комментарий Google формата Sv6Kpe и возвращает код/язык.
   */
  function parseCodeCommentPayload(commentText) {
    if (!commentText || commentText.indexOf('Sv6Kpe[') === -1) {
      return null;
    }

    var payloadStart = commentText.indexOf('[');
    if (payloadStart === -1) {
      return null;
    }

    var rawPayload = commentText
      .slice(payloadStart)
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    var parsed;
    try {
      parsed = JSON.parse(rawPayload);
    } catch (err) {
      return null;
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return null;
    }

    var first = parsed[0];
    if (!Array.isArray(first) || first.length < 2) {
      return null;
    }

    var language = typeof first[0] === 'string' ? first[0].trim() : '';
    var code = typeof first[1] === 'string' ? first[1] : '';

    if (!/^[a-z0-9+#.\-]{1,20}$/i.test(language)) {
      return null;
    }

    if (!language || !code) {
      return null;
    }

    return {
      language: language,
      code: code
    };
  }

  /**
   * Нормализует текст кода с сохранением переносов.
   */
  function normalizeCodeText(text) {
    if (!text) return '';
    return String(text)
      .replace(/\u00a0/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\t/g, '    ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/g, '');
  }

  /**
   * Нормализует имя языка программирования.
   */
  function normalizeLanguageName(language) {
    var normalized = normalizeText(language).toLowerCase();
    if (!normalized) return null;
    if (!CODE_LANGUAGE_NAMES || !CODE_LANGUAGE_NAMES.has(normalized)) return null;
    return normalized;
  }

  /**
   * Возвращает отображаемое название языка для UI.
   */
  function formatLanguageLabel(language) {
    if (!language) return null;

    var normalized = normalizeLanguageName(language) || normalizeText(language).toLowerCase();
    if (!normalized || normalized.length > 20) {
      return null;
    }

    if (CODE_LANGUAGE_DISPLAY[normalized]) {
      return CODE_LANGUAGE_DISPLAY[normalized];
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  /**
   * Возвращает потенциальный DOM-узел с подписью языка перед pre-блоком.
   */
  function getLanguageLabelCandidate(preEl) {
    var parent = preEl.parentElement;
    if (!parent) return null;

    return parent.previousElementSibling;
  }

  /**
   * Пытается найти язык рядом с pre-блоком, если комментарий недоступен.
   */
  function detectCodeLanguageNear(preEl) {
    var candidate = getLanguageLabelCandidate(preEl);
    if (!candidate) return null;

    var text = normalizeText(candidate.textContent || '').toLowerCase();
    if (!text || text.length > 20) return null;

    if (CODE_LANGUAGE_NAMES && CODE_LANGUAGE_NAMES.has(text)) {
      return text;
    }

    return null;
  }

  /**
   * Находит ближайший standalone-лейбл языка перед pre и возвращает его.
   */
  function findClosestLanguageLabel(preEl, languageKey) {
    var candidate = getLanguageLabelCandidate(preEl);
    if (!candidate) return null;

    if (isStandaloneLanguageLabelNode(candidate, languageKey)) {
      return candidate;
    }

    return null;
  }

  /**
   * Проверяет, что узел является отдельным лейблом языка.
   */
  function isStandaloneLanguageLabelNode(node, languageKey) {
    if (!node) return false;
    if (node.querySelector('pre, code, table, ul, ol, button, svg')) return false;

    var text = normalizeText(node.textContent || '').toLowerCase();
    if (!text || text.length > 20) return false;

    return text === languageKey;
  }

  parser.processCodeBlocks = processCodeBlocks;
  parser.extractCodePayloads = extractCodePayloads;
  parser.parseCodeCommentPayload = parseCodeCommentPayload;
  parser.normalizeCodeText = normalizeCodeText;
  parser.normalizeLanguageName = normalizeLanguageName;
  parser.formatLanguageLabel = formatLanguageLabel;
  parser.getLanguageLabelCandidate = getLanguageLabelCandidate;
  parser.detectCodeLanguageNear = detectCodeLanguageNear;
  parser.findClosestLanguageLabel = findClosestLanguageLabel;
  parser.isStandaloneLanguageLabelNode = isStandaloneLanguageLabelNode;
})();
