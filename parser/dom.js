/**
 * parser/dom.js
 * DOM-утилиты и общая очистка клонированного HTML.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  var MODULE_VERSION = 2;
  if (parser._domModuleVersion && parser._domModuleVersion >= MODULE_VERSION) {
    return;
  }
  parser._domModuleVersion = MODULE_VERSION;

  var c = parser.constants || {};
  var GOOGLE_UI_TEXTS = c.GOOGLE_UI_TEXTS || [];
  var normalizeText = parser.normalizeText;

  /**
   * Безопасно удаляет DOM-узел.
   */
  function removeNode(node) {
    if (!node || !node.parentNode) {
      return;
    }

    node.parentNode.removeChild(node);
  }

  /**
   * Добавляет HTML-фрагмент в контейнер.
   */
  function appendHTMLFragment(container, html) {
    if (!container || !html) {
      return;
    }

    var host = document.createElement('div');
    host.innerHTML = html;

    while (host.firstChild) {
      container.appendChild(host.firstChild);
    }
  }

  /**
   * Находит прямого потомка container, в котором расположен узел.
   */
  function getDirectChildInContainer(node, container) {
    if (!node || !container) {
      return null;
    }

    var current = node;
    while (current && current.parentElement && current.parentElement !== container) {
      current = current.parentElement;
    }

    if (current && current.parentElement === container) {
      return current;
    }

    return null;
  }

  /**
   * Проверяет, находится ли узел внутри одного из тегов.
   */
  function isInsideTag(node, tagNames) {
    var names = Array.isArray(tagNames) ? tagNames : [tagNames];
    var current = node && node.parentElement ? node.parentElement : null;

    while (current) {
      if (names.includes(current.tagName)) {
        return true;
      }
      current = current.parentElement;
    }

    return false;
  }

  /**
   * Нормализует текстовые узлы (кроме pre/code).
   */
  function normalizeTextNodes(container) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);

    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach(function(node) {
      if (!node.nodeValue) return;

      if (isInsideTag(node, ['PRE', 'CODE', 'MATH'])) {
        node.nodeValue = node.nodeValue.replace(/\u00a0/g, ' ');
        return;
      }

      node.nodeValue = node.nodeValue.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
    });
  }

  /**
   * Заменяет NBSP на обычные пробелы, не трогая переносы/пробелы.
   * Полезно для пользовательского ввода, где важна структура.
   */
  function normalizeNBSPTextNodes(container) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);

    var textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach(function(node) {
      if (!node.nodeValue) return;
      node.nodeValue = node.nodeValue.replace(/\u00a0/g, ' ');
    });
  }

  /**
   * Преобразует блоковые div внутри inline-контекстов в span.
   */
  function normalizeInlineWrappers(container) {
    var inlineParentSelectors = [
      'span > div',
      'strong > div',
      'b > div',
      'em > div',
      'a > div',
      'mark > div'
    ];
    var selector = inlineParentSelectors.join(', ');

    for (var i = 0; i < 6; i++) {
      var changed = false;

      container.querySelectorAll(selector).forEach(function(divEl) {
        if (!divEl.parentElement) return;
        if (divEl.querySelector('pre, code, ul, ol, table, hr')) return;

        var span = document.createElement('span');

        // Preserve attributes; they will be sanitized later by stripGoogleAttributes.
        // This is important for our own `data-ai-*` markers (gallery, sources, etc.).
        Array.from(divEl.attributes || []).forEach(function(attr) {
          try {
            span.setAttribute(attr.name, attr.value);
          } catch (err) {
            // ignore
          }
        });

        while (divEl.firstChild) {
          span.appendChild(divEl.firstChild);
        }

        divEl.replaceWith(span);
        changed = true;
      });

      if (!changed) break;
    }
  }

  /**
   * Удаляет HTML-комментарии из DOM.
   */
  function removeCommentNodes(container) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT, null, false);

    var comments = [];
    while (walker.nextNode()) {
      comments.push(walker.currentNode);
    }

    comments.forEach(function(comment) {
      comment.remove();
    });
  }

  /**
   * Удаляет лишние атрибуты Google, оставляя только нужные.
   */
  function stripGoogleAttributes(container) {
    container.querySelectorAll('*').forEach(function(el) {
      var tagName = el.tagName.toUpperCase();
      var insideMath = tagName === 'MATH' || !!el.closest('math');

      Array.from(el.attributes).forEach(function(attr) {
        var name = attr.name.toLowerCase();
        var value = (attr.value || '').trim().toLowerCase();

        if (insideMath) {
          if (
            name === 'class' ||
            name === 'style' ||
            name === 'id' ||
            name === 'tabindex' ||
            name === 'role' ||
            name.startsWith('aria-') ||
            name.startsWith('js') ||
            (name.startsWith('data-') && name !== 'data-formula')
          ) {
            el.removeAttribute(attr.name);
          }
          return;
        }

        if (
          name === 'data-caveat' ||
          name === 'data-formula' ||
          name === 'data-lang' ||
          name === 'data-table-shell' ||
          name === 'data-table-scroll' ||
          name === 'data-ai-gallery' ||
          name === 'data-ai-gallery-content' ||
          name === 'data-ai-gallery-item' ||
          name === 'data-ai-gallery-thumb' ||
          name === 'data-ai-gallery-meta' ||
          name === 'data-ai-gallery-title' ||
          name === 'data-ai-gallery-site' ||
          name === 'data-ai-sources' ||
          name === 'data-ai-sources-list' ||
          name === 'data-ai-source-item' ||
          name === 'data-ai-source-has-thumb' ||
          name === 'data-ai-source-icon' ||
          name === 'data-ai-source-thumb'
        ) {
          return;
        }

        if (tagName === 'A' && (name === 'href' || name === 'target' || name === 'rel')) {
          return;
        }

        if (tagName === 'IMG' && (name === 'src' || name === 'alt')) {
          return;
        }

        if ((tagName === 'TD' || tagName === 'TH') && (name === 'colspan' || name === 'rowspan')) {
          if (value && value !== 'undefined') {
            return;
          }
        }

        el.removeAttribute(attr.name);
      });
    });
  }

  /**
   * Удаляет осиротевшие текстовые узлы с пунктуацией между блочными элементами.
   */
  function removeOrphanedPunctuation(container) {
    var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);

    var toRemove = [];
    while (walker.nextNode()) {
      var node = walker.currentNode;
      if (isInsideTag(node, ['PRE', 'CODE', 'MATH'])) continue;

      var text = (node.nodeValue || '').trim();
      if (!text) continue;
      if (text.length > 3) continue;

      if (!/^[.,;:!?…·•–—]+$/.test(text)) continue;

      var parent = node.parentElement;
      if (!parent) continue;

      var isOrphaned = (parent.tagName === 'DIV' || parent.tagName === 'SECTION') && parent.children.length >= 1;
      if (isOrphaned) {
        toRemove.push(node);
      }
    }

    toRemove.forEach(function(node) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }

  /**
   * Удаляет пустые обёртки после чистки DOM.
   */
  function removeEmptyElements(container) {
    for (var i = 0; i < 6; i++) {
      var changed = false;

      container.querySelectorAll('span, div, p, a').forEach(function(el) {
        if (el.getAttribute('data-formula') || el.getAttribute('data-caveat')) return;
        if (el.tagName === 'A' && el.getAttribute('href')) return;
        if (el.querySelector('pre, code, ul, ol, table, hr, img, math')) return;

        var text = normalizeText(el.textContent || '');
        if (!text && el.children.length === 0) {
          el.remove();
          changed = true;
        }
      });

      if (!changed) break;
    }
  }

  /**
   * Удаляет leaf-узлы, содержащие только UI-текст Google.
   */
  function removeLeafUiTextNodes(container) {
    container.querySelectorAll('div, span, p').forEach(function(el) {
      if (el.children.length > 0) return;
      if (isInsideTag(el, ['PRE', 'CODE', 'MATH'])) return;

      var text = normalizeText(el.textContent || '').toLowerCase();
      if (!text) return;

      if (GOOGLE_UI_TEXTS.includes(text)) {
        el.remove();
      }
    });
  }

  parser.removeNode = removeNode;
  parser.appendHTMLFragment = appendHTMLFragment;
  parser.getDirectChildInContainer = getDirectChildInContainer;
  parser.isInsideTag = isInsideTag;
  parser.normalizeTextNodes = normalizeTextNodes;
  parser.normalizeNBSPTextNodes = normalizeNBSPTextNodes;
  parser.normalizeInlineWrappers = normalizeInlineWrappers;
  parser.removeCommentNodes = removeCommentNodes;
  parser.stripGoogleAttributes = stripGoogleAttributes;
  parser.removeOrphanedPunctuation = removeOrphanedPunctuation;
  parser.removeEmptyElements = removeEmptyElements;
  parser.removeLeafUiTextNodes = removeLeafUiTextNodes;
})();
