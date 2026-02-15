/**
 * generator/quote.js
 * Построение блока цитаты/вложений из пользовательского вопроса.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.buildQuoteBlock) {
    return;
  }

  var constants = gen.constants || {};
  var MAX_EMPTY_NODE_PASSES = constants.MAX_EMPTY_NODE_PASSES || 5;
  var MIN_DATA_URI_LENGTH = constants.MIN_DATA_URI_LENGTH || 180;

  var normalizeSimpleText = gen.normalizeSimpleText;

  function isLikelyPlaceholderQuoteImage(source) {
    var value = String(source || '').trim().toLowerCase();
    if (!value) {
      return true;
    }

    if (value === 'about:blank') {
      return true;
    }

    if (/^[0-9]+$/.test(value)) {
      return true;
    }

    if (value === 'true' || value === 'false' || value === 'undefined' || value === 'null') {
      return true;
    }

    if (value.startsWith('data:image/gif;base64,r0lgod')) {
      return true;
    }

    if (value.startsWith('data:image/png;base64,ivborw0kggoaaaansuheugaaaaeaaaab')) {
      return true;
    }

    if (value.startsWith('data:image/') && value.length < MIN_DATA_URI_LENGTH) {
      return true;
    }

    return false;
  }

  function getQuoteImageSourceFromSrcset(srcset) {
    var value = String(srcset || '').trim();
    if (!value) {
      return '';
    }

    var parts = value
      .split(',')
      .map(function(part) {
        return part.trim();
      })
      .filter(Boolean);
    if (!parts.length) {
      return '';
    }

    for (var i = parts.length - 1; i >= 0; i--) {
      var url = (parts[i].split(/\s+/)[0] || '').trim();
      if (url) {
        return url;
      }
    }

    return '';
  }

  function getQuoteImageSource(imgEl) {
    if (!imgEl) return '';

    var srcsetSource = getQuoteImageSourceFromSrcset(imgEl.getAttribute('srcset') || imgEl.srcset || '');

    var candidates = [
      imgEl.currentSrc,
      srcsetSource,
      imgEl.getAttribute('data-src'),
      imgEl.getAttribute('data-original'),
      imgEl.getAttribute('data-lzy_'),
      imgEl.getAttribute('src'),
      imgEl.src
    ];

    var fallbackSource = '';

    for (var idx = 0; idx < candidates.length; idx++) {
      var normalized = String(candidates[idx] || '').trim();
      if (!normalized) {
        continue;
      }

      if (!fallbackSource) {
        fallbackSource = normalized;
      }

      if (isLikelyPlaceholderQuoteImage(normalized)) {
        continue;
      }

      return normalized;
    }

    return fallbackSource;
  }

  function removeEmptyQuoteTextNodes(container) {
    for (var pass = 0; pass < MAX_EMPTY_NODE_PASSES; pass++) {
      var changed = false;

      container.querySelectorAll('div, span, p').forEach(function(el) {
        if (el.querySelector('pre, code, ul, ol, table, math, hr, blockquote')) {
          return;
        }

        var text = normalizeSimpleText(el.textContent || '');
        if (!text && el.children.length === 0) {
          el.remove();
          changed = true;
        }
      });

      if (!changed) {
        break;
      }
    }
  }

  function splitQuoteContent(quoteHtml) {
    var container = document.createElement('div');
    container.innerHTML = String(quoteHtml || '');

    var mediaHost = document.createElement('div');
    var mediaCount = 0;

    container.querySelectorAll('img').forEach(function(imgEl) {
      var source = getQuoteImageSource(imgEl);
      if (!source) {
        imgEl.remove();
        return;
      }

      var copyEl = document.createElement('img');
      copyEl.setAttribute('src', source);

      var alt = (imgEl.getAttribute('alt') || '').trim();
      if (alt) {
        copyEl.setAttribute('alt', alt);
      }

      mediaHost.appendChild(copyEl);
      mediaCount += 1;
      imgEl.remove();
    });

    removeEmptyQuoteTextNodes(container);

    return {
      textHtml: container.innerHTML.trim(),
      mediaHtml: mediaHost.innerHTML.trim(),
      mediaCount: mediaCount
    };
  }

  function buildQuoteBlock(quoteHtml) {
    if (!quoteHtml || !String(quoteHtml).trim()) {
      return '';
    }

    var quoteParts = splitQuoteContent(quoteHtml);
    if (!quoteParts.textHtml && !quoteParts.mediaHtml) {
      return '';
    }

    var html = '';

    if (quoteParts.textHtml) {
      html += `    <div class="user-quote user-quote-text">\n`;
      html += `      <div class="user-quote-mark">&ldquo;</div>\n`;
      html += `      <div class="user-quote-body">${quoteParts.textHtml}</div>\n`;
      html += `    </div>\n`;
    }

    if (quoteParts.mediaHtml) {
      var mediaLabel = quoteParts.mediaCount > 1 ? 'Прикрепленные изображения' : 'Прикрепленное изображение';
      html += `    <div class="user-media-block">\n`;
      html += `      <div class="user-media-label">${mediaLabel}</div>\n`;
      html += `      <div class="user-media-grid">${quoteParts.mediaHtml}</div>\n`;
      html += `    </div>\n`;
    }

    return html;
  }

  gen.isLikelyPlaceholderQuoteImage = isLikelyPlaceholderQuoteImage;
  gen.getQuoteImageSourceFromSrcset = getQuoteImageSourceFromSrcset;
  gen.getQuoteImageSource = getQuoteImageSource;
  gen.removeEmptyQuoteTextNodes = removeEmptyQuoteTextNodes;
  gen.splitQuoteContent = splitQuoteContent;
  gen.buildQuoteBlock = buildQuoteBlock;
})();
