/**
 * parser/ui.js
 * Удаление UI-элементов Google и дисклеймеров.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (
    parser.isGoogleUI &&
    parser.removeUIElements &&
    parser.removeAiDisclaimerBlocks &&
    parser.removeFeedbackUiBlocks
  ) {
    return;
  }

  var c = parser.constants || {};
  var GOOGLE_UI_TEXTS = c.GOOGLE_UI_TEXTS || [];
  var AI_DISCLAIMER_PATTERNS = c.AI_DISCLAIMER_PATTERNS || [];

  var normalizeText = parser.normalizeText;
  var isInsideTag = parser.isInsideTag;
  var removeSourcePanels = parser.removeSourcePanels;

  var FEEDBACK_UI_CORE_TOKENS = [
    'positive feedback',
    'negative feedback',
    'saved time',
    'not working',
    'unhelpful',
    'inappropriate',
    'incorrect'
  ];

  // Эти слова встречаются в опциях, но слишком общие, чтобы по ним удалять блоки.
  // Используются только как вспомогательный сигнал/для удаления leaf-элементов в контексте.
  var FEEDBACK_UI_OPTION_TOKENS = ['helpful', 'comprehensive', 'clear', 'other'];

  // Длинные фразы, которые практически не встречаются в нормальном ответе модели.
  var FEEDBACK_UI_STRONG_SNIPPETS = [
    'a copy of this chat will be included with your feedback',
    'a copy of this chat and your uploaded image will be included with your feedback',
    'google may use account and system data to understand your feedback'
  ];

  var FEEDBACK_UI_WEAK_SNIPPETS = [
    'subject to our privacy policy and terms of service',
    'for legal issues, make a legal removal request'
  ];

  /**
   * Проверяет, является ли текст UI-элементом Google.
   */
  function isGoogleUI(text) {
    var lower = normalizeText(text).toLowerCase();

    if (!lower) return true;

    for (var i = 0; i < GOOGLE_UI_TEXTS.length; i++) {
      var ui = GOOGLE_UI_TEXTS[i];
      if (lower === ui) return true;
      if (lower.startsWith(ui) && lower.length < ui.length + 20) return true;
    }

    return false;
  }

  /**
   * Удаляет UI-элементы из клонированного DOM.
   */
  function removeUIElements(container) {
    container
      .querySelectorAll(
        '.P8PNlb, .LIBz9e, .Ev0C3d, .T0PRsc, .Fsg96, ' +
          'aside[popover="manual"], [aria-label*="Скопировать код"], [aria-label*="Copy code"]'
      )
      .forEach(function(el) {
        el.remove();
      });

    removeSourcePanels(container);

    var walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null, false);
    var toRemove = [];

    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (isInsideTag(node, ['PRE', 'CODE', 'MATH'])) {
        continue;
      }

      var text = normalizeText(node.innerText || node.textContent || '').toLowerCase();
      if (!text) {
        continue;
      }

      for (var i = 0; i < GOOGLE_UI_TEXTS.length; i++) {
        var ui = GOOGLE_UI_TEXTS[i];
        if (text === ui || (text.startsWith(ui) && text.length < ui.length + 30)) {
          if (node.children.length < 3) {
            toRemove.push(node);
            break;
          }
        }
      }

      var role = node.getAttribute ? node.getAttribute('role') : null;
      if (role === 'dialog' || role === 'status') {
        toRemove.push(node);
      }

      if (node.matches && node.matches('[popover="manual"]')) {
        toRemove.push(node);
      }
    }

    Array.from(new Set(toRemove)).forEach(function(el) {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    removeSourcePanels(container);
  }

  /**
   * Удаляет дисклеймер Google о возможных ошибках ИИ.
   */
  function removeAiDisclaimerBlocks(container) {
    if (!container) {
      return;
    }

    container.querySelectorAll('div, p, span, li, section').forEach(function(el) {
      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) {
        return;
      }

      if (el.querySelector('pre, code, table, ul, ol, math, details, img, blockquote, h1, h2, h3')) {
        return;
      }

      var text = normalizeText(el.textContent || '').toLowerCase();
      if (!text) {
        return;
      }

      if (text.length > 220) {
        return;
      }

      var isDisclaimer = AI_DISCLAIMER_PATTERNS.some(function(pattern) {
        return (
          text === pattern ||
          text.startsWith(pattern + '.') ||
          text.startsWith(pattern + ' ') ||
          text.includes(pattern + '. подробнее') ||
          text.includes(pattern + '. learn more')
        );
      });

      if (!isDisclaimer) {
        return;
      }

      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }

  /**
   * Удаляет блоки UI-формы фидбека (Positive/Negative feedback и т.п.),
   * которые иногда попадают внутрь DOM ответа.
   * Важно: удаляем только если есть сильные признаки именно UI-фидбека,
   * чтобы не задеть контент ответа.
   */
  function removeFeedbackUiBlocks(container) {
    if (!container) {
      return;
    }

    function countUniqueFeedbackTokenHits(text) {
      var lower = String(text || '').toLowerCase();
      if (!lower) return 0;

      var all = FEEDBACK_UI_CORE_TOKENS.concat(FEEDBACK_UI_OPTION_TOKENS);
      var hits = 0;
      for (var i = 0; i < all.length; i++) {
        if (lower.includes(all[i])) {
          hits++;
        }
      }
      return hits;
    }

    function countFeedbackHits(text, tokens) {
      var lower = String(text || '').toLowerCase();
      if (!lower) return 0;

      var hits = 0;
      for (var i = 0; i < tokens.length; i++) {
        if (lower.includes(tokens[i])) {
          hits++;
        }
      }
      return hits;
    }

    function isFeedbackClusterText(text) {
      var lower = String(text || '').toLowerCase();
      if (!lower) return false;

      // Как у клиента: набор из множества коротких опций в одном месте.
      // Делаем проверку по количеству уникальных токенов + наличие специфичных core-токенов.
      var tokenHits = countUniqueFeedbackTokenHits(lower);
      if (tokenHits < 7) {
        return false;
      }

      var coreHits = countFeedbackHits(lower, FEEDBACK_UI_CORE_TOKENS);
      var hasFeedbackWord = lower.includes('feedback');

      // В меню/подсказках могут отсутствовать оба заголовка (positive/negative),
      // поэтому опираемся на "feedback" и/или набор core-токенов.
      return hasFeedbackWord || coreHits >= 3;
    }

    function getFeedbackTokenStats(rootEl) {
      var out = {
        tokenCount: 0,
        coreCount: 0,
        otherCount: 0,
        otherTextLen: 0,
        hasFeedbackLabel: false,
        uniqueTokenCount: 0,
        uniqueCoreCount: 0,
        uniqueOptionCount: 0,
        hasOtherToken: false
      };

      if (!rootEl) {
        return out;
      }

      var all = FEEDBACK_UI_CORE_TOKENS.concat(FEEDBACK_UI_OPTION_TOKENS);
      var tokenSet = new Set(all);
      var coreSet = new Set(FEEDBACK_UI_CORE_TOKENS);
      var optionSet = new Set(FEEDBACK_UI_OPTION_TOKENS);
      var seen = Object.create(null);
      var seenCore = Object.create(null);
      var seenOption = Object.create(null);

      var walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, null, false);
      while (walker.nextNode()) {
        var node = walker.currentNode;
        var value = normalizeText(node.nodeValue || '').toLowerCase();
        if (!value) continue;

        if (value.includes('feedback')) {
          out.hasFeedbackLabel = true;
        }

        if (tokenSet.has(value)) {
          out.tokenCount++;
          if (coreSet.has(value)) {
            out.coreCount++;
            if (!seenCore[value]) {
              seenCore[value] = 1;
            }
          }

          if (optionSet.has(value)) {
            if (!seenOption[value]) {
              seenOption[value] = 1;
            }
          }

          if (value === 'other') {
            out.hasOtherToken = true;
          }

          if (!seen[value]) {
            seen[value] = 1;
          }
          continue;
        }

        out.otherCount++;
        out.otherTextLen += value.length;
      }

      out.uniqueTokenCount = Object.keys(seen).length;
      out.uniqueCoreCount = Object.keys(seenCore).length;
      out.uniqueOptionCount = Object.keys(seenOption).length;

      return out;
    }

    // 0) Удаляем контейнеры, которые состоят почти полностью из токенов фидбека.
    // Это самый безопасный вариант: вырезаем целиком UI-блок, не трогая ответ.
    var clusterCandidates = [];
    container.querySelectorAll('div, section, aside, form, ul, ol, span, p, li').forEach(function(el) {
      if (!el) return;
      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) return;

      if (el.querySelector('pre, code, table, math, details, img, blockquote')) {
        return;
      }

      var stats = getFeedbackTokenStats(el);
      if (!stats.tokenCount) {
        return;
      }

      var tokenOnly = stats.otherCount === 0 && stats.otherTextLen === 0;

      // Кейс клиента: в DOM остаются только "Clear/Helpful/Comprehensive/Other".
      // Удаляем такой контейнер, только если он состоит ТОЛЬКО из токенов.
      if (tokenOnly && stats.coreCount === 0) {
        // Вариант A: набор опций.
        if (stats.tokenCount >= 3 && stats.uniqueOptionCount >= 2 && stats.hasOtherToken) {
          clusterCandidates.push(el);
        }

        // Вариант B: остаток "Other Other" после частичной очистки.
        if (stats.tokenCount >= 2 && stats.uniqueOptionCount === 1 && stats.hasOtherToken) {
          clusterCandidates.push(el);
        }
        return;
      }

      if (stats.tokenCount < 8) {
        return;
      }

      // Не удаляем, если есть много другого текста (кроме токенов).
      // (Допускаем небольшой мусор/обёртки, чтобы поймать реальные DOM-структуры Google.)
      if (stats.otherTextLen > 12) {
        return;
      }

      // Нужен явный признак именно фидбека.
      var fullText = normalizeText(el.textContent || '').toLowerCase();
      if (!stats.hasFeedbackLabel && stats.coreCount < 4 && !isFeedbackClusterText(fullText)) {
        return;
      }

      clusterCandidates.push(el);
    });

    if (clusterCandidates.length) {
      clusterCandidates.sort(function(a, b) {
        return a.querySelectorAll('*').length - b.querySelectorAll('*').length;
      });

      var clustersToRemove = [];
      clusterCandidates.forEach(function(el) {
        // Если элемент содержит уже выбранный под-блок — не удаляем его (иначе можно снести больше, чем нужно).
        var containsChosen = clustersToRemove.some(function(chosen) {
          return el.contains(chosen);
        });
        if (containsChosen) return;

        // Если элемент уже внутри выбранного блока — пропускаем.
        var insideChosen = clustersToRemove.some(function(chosen) {
          return chosen.contains(el);
        });
        if (insideChosen) return;

        clustersToRemove.push(el);
      });

      clustersToRemove.forEach(function(el) {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }

    // 0b) Удаляем "островки" опций фидбека (Clear/Helpful/Comprehensive/Other),
    // которые могут оставаться без слова "feedback" и появляться только после
    // полного договаривания ответа.
    // Супер-консервативно: удаляем только когда текст узла состоит ТОЛЬКО из
    // этих токенов и их минимум два (например: "Other Other").
    var optionOnlyCandidates = [];
    var optionTokenSet = new Set(FEEDBACK_UI_OPTION_TOKENS);
    container.querySelectorAll('div, span, p, li, section, aside').forEach(function(el) {
      if (!el) return;
      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) return;
      if (el.querySelector('pre, code, table, math, details, img, blockquote')) return;

      var txt = normalizeText(el.textContent || '').toLowerCase();
      if (!txt) return;

      // normalizeText уже схлопывает пробелы, достаточно split(' ')
      var parts = txt.split(' ').filter(Boolean);
      if (parts.length < 2) return;

      var hasOther = false;
      for (var i = 0; i < parts.length; i++) {
        var part = parts[i];
        if (!optionTokenSet.has(part)) {
          return;
        }
        if (part === 'other') {
          hasOther = true;
        }
      }

      if (!hasOther) return;

      optionOnlyCandidates.push(el);
    });

    if (optionOnlyCandidates.length) {
      optionOnlyCandidates.sort(function(a, b) {
        return a.querySelectorAll('*').length - b.querySelectorAll('*').length;
      });

      var optionToRemove = [];
      optionOnlyCandidates.forEach(function(el) {
        var containsChosen = optionToRemove.some(function(chosen) {
          return el.contains(chosen);
        });
        if (containsChosen) return;

        var insideChosen = optionToRemove.some(function(chosen) {
          return chosen.contains(el);
        });
        if (insideChosen) return;

        optionToRemove.push(el);
      });

      optionToRemove.forEach(function(el) {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }

    var candidates = [];
    container.querySelectorAll('div, section, aside, form, ul, ol, p, span').forEach(function(el) {
      if (!el) {
        return;
      }

      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) {
        return;
      }

      // Не трогаем элементы, которые явно содержат структурный контент ответа.
      // Важно: в UI-фидбеке иногда встречаются пустые h-теги, поэтому h1/h2/h3
      // здесь не используем как стоп-сигнал.
      if (el.querySelector('pre, code, table, math, details, img, blockquote')) {
        return;
      }

      var text = normalizeText(el.textContent || '').toLowerCase();
      if (!text) {
        return;
      }

      if (text.length < 20) {
        return;
      }

      var strongSnippetHit = FEEDBACK_UI_STRONG_SNIPPETS.some(function(snippet) {
        return text.includes(snippet);
      });

      var weakSnippetHit = FEEDBACK_UI_WEAK_SNIPPETS.some(function(snippet) {
        return text.includes(snippet);
      });

      var hasPositive = text.includes('positive feedback');
      var hasNegative = text.includes('negative feedback');

      var tokenHits = countUniqueFeedbackTokenHits(text);

      // Достаточно сильные признаки UI-фидбека.
      // Приоритет: длинные дисклеймеры (high precision). Также допускаем оба заголовка вместе + 1 слабый дисклеймер.
      var looksLikeFeedback =
        strongSnippetHit ||
        ((hasPositive && hasNegative) && weakSnippetHit) ||
        (tokenHits >= 4 && weakSnippetHit) ||
        isFeedbackClusterText(text);
      if (!looksLikeFeedback) {
        return;
      }

      candidates.push(el);
    });

    // Удаляем самые маленькие подходящие блоки (чтобы не снести весь ответ).
    var unique = Array.from(new Set(candidates));
    unique.sort(function(a, b) {
      return a.querySelectorAll('*').length - b.querySelectorAll('*').length;
    });

    var toRemove = [];
    unique.forEach(function(el) {
      // Если элемент содержит уже выбранный под-блок фидбека — не удаляем его (иначе можно снести весь ответ).
      var containsChosen = toRemove.some(function(chosen) {
        return el.contains(chosen);
      });
      if (containsChosen) return;

      // Если элемент сам находится внутри уже выбранного блока — тоже пропускаем.
      var isInsideChosen = toRemove.some(function(chosen) {
        return chosen.contains(el);
      });
      if (isInsideChosen) return;

      toRemove.push(el);
    });

    toRemove.forEach(function(el) {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });

    // Иногда после чистки остаются одиночные leaf-элементы с опциями/подсказками фидбека.
    // Для core-токенов (feedback/not working/saved time и т.п.) можно удалять без контекста.
    // Для общих слов (clear/other/helpful/...) удаляем:
    // - либо в контексте "feedback cluster" (есть feedback/core),
    // - либо если рядом найден token-only контейнер из опций (только Clear/Helpful/...)
    var allTokens = FEEDBACK_UI_CORE_TOKENS.concat(FEEDBACK_UI_OPTION_TOKENS);
    var coreSet = new Set(FEEDBACK_UI_CORE_TOKENS);
    container.querySelectorAll('div, span, p, li').forEach(function(el) {
      if (!el || el.children.length > 0) return;
      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) return;

      var t = normalizeText(el.textContent || '').toLowerCase();
      if (!t) return;

      if (!allTokens.includes(t)) {
        return;
      }

      if (coreSet.has(t)) {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        return;
      }

      // Частый остаток после чистки: "Other" (иногда два раза).
      // Удаляем только если найдем ближайший предок, который состоит только из токенов
      // и содержит минимум 2 вхождения "other".
      if (t === 'other') {
        var a = el.parentElement;
        for (var j = 0; j < 12 && a; j++) {
          var st = getFeedbackTokenStats(a);
          var tokenOnlyAncestor = st.otherCount === 0 && st.otherTextLen === 0;
          if (
            tokenOnlyAncestor &&
            st.coreCount === 0 &&
            st.tokenCount >= 2 &&
            st.uniqueOptionCount === 1 &&
            st.hasOtherToken
          ) {
            if (a.parentNode) {
              a.parentNode.removeChild(a);
            }
            return;
          }

          a = a.parentElement;
        }
      }

      var ancestor = el.parentElement;
      for (var i = 0; i < 12 && ancestor; i++) {
        var atext = normalizeText(ancestor.textContent || '').toLowerCase();
        if (isFeedbackClusterText(atext)) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
          break;
        }

        var stats = getFeedbackTokenStats(ancestor);
        var tokenOnly = stats.otherCount === 0 && stats.otherTextLen === 0;
        if (tokenOnly && stats.coreCount === 0 && stats.tokenCount >= 3 && stats.uniqueOptionCount >= 2 && stats.hasOtherToken) {
          if (el.parentNode) {
            el.parentNode.removeChild(el);
          }
          break;
        }

        ancestor = ancestor.parentElement;
      }
    });

    // Последний добивочный слой под реальный кейс клиента:
    // когда после полной генерации ответа остаются ровно 2 текста "Other" (две опции),
    // но без остальных маркеров фидбека.
    // Удаляем только если таких leaf-узлов >= 2 (чтобы не снести одиночное слово Other
    // в обычном контенте).
    var otherLeaves = [];
    container.querySelectorAll('span, div, p, li').forEach(function(el) {
      if (!el || el.children.length > 0) return;
      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) return;

      var t = normalizeText(el.textContent || '').toLowerCase();
      if (t === 'other') {
        otherLeaves.push(el);
      }
    });

    if (otherLeaves.length >= 2) {
      otherLeaves.forEach(function(el) {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });
    }
  }

  parser.isGoogleUI = isGoogleUI;
  parser.removeUIElements = removeUIElements;
  parser.removeAiDisclaimerBlocks = removeAiDisclaimerBlocks;
  parser.removeFeedbackUiBlocks = removeFeedbackUiBlocks;
})();
