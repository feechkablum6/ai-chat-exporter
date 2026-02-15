/**
 * parser/sources.js
 * Работа с блоком источников Google: удаление панелей, сбор карточек источников.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.buildSourcePanelBlock && parser.removeSourcePanels) {
    return;
  }

  var c = parser.constants || {};
  var SOURCE_PANEL_SELECTORS = c.SOURCE_PANEL_SELECTORS || [];
  var GOOGLE_UI_TEXTS = c.GOOGLE_UI_TEXTS || [];

  var normalizeText = parser.normalizeText;
  var isInsideTag = parser.isInsideTag;
  var getImageSource = parser.getImageSource;
  var embedBlobImagesAsDataUrls = parser.embedBlobImagesAsDataUrls;

  function extractCssUrl(value) {
    var text = String(value || '').trim();
    if (!text || text === 'none') {
      return '';
    }

    var match = /url\(\s*(['"]?)(.*?)\1\s*\)/i.exec(text);
    if (!match) {
      return '';
    }

    return String(match[2] || '').trim();
  }

  function isLikelyFaviconSource(srcLower) {
    var value = String(srcLower || '').trim().toLowerCase();
    if (!value) return false;
    if (value.indexOf('favicon') !== -1) return true;
    if (value.indexOf('s2/favicons') !== -1) return true;
    if (value.indexOf('faviconv2') !== -1) return true;
    return false;
  }

  function collectSourceImageCandidates(candidateEl) {
    if (!candidateEl) {
      return [];
    }

    var images = Array.from(candidateEl.querySelectorAll('img'));
    var items = [];

    images.forEach(function(imgEl) {
      if (!imgEl) {
        return;
      }

      var src = getImageSource(imgEl);
      var srcLower = String(src || '').trim().toLowerCase();
      if (!srcLower) {
        return;
      }

      if (srcLower.indexOf('data:image/gif') === 0) {
        return;
      }

      var w = Number(imgEl.naturalWidth || imgEl.width || imgEl.clientWidth || 0);
      var h = Number(imgEl.naturalHeight || imgEl.height || imgEl.clientHeight || 0);
      var area = (w > 0 && h > 0) ? (w * h) : 0;

      items.push({
        el: imgEl,
        src: src,
        srcLower: srcLower,
        srcLen: String(src || '').length,
        w: w,
        h: h,
        area: area,
        isFavicon: isLikelyFaviconSource(srcLower)
      });
    });

    return items;
  }

  function pickSourceIconCandidate(items) {
    if (!items || !items.length) {
      return null;
    }

    var faviconItems = items.filter(function(item) {
      if (!item) return false;
      if (item.isFavicon) return true;
      // Small images are usually icons.
      if (item.w && item.h && item.w <= 48 && item.h <= 48) return true;
      return false;
    });

    // If nothing looks like an icon, don't force-pick (avoid stealing the thumbnail).
    var pool = faviconItems.length
      ? faviconItems
      : items.filter(function(item) {
          return !!(item && item.w && item.h && item.w <= 48 && item.h <= 48);
        });

    if (!pool.length) {
      return null;
    }
    var best = null;
    var bestScore = 999999999;

    pool.forEach(function(item) {
      var area = item.area || (item.w && item.h ? item.w * item.h : 999999);
      var score = area;
      if (item.isFavicon) {
        score -= 5000;
      }

      if (score < bestScore) {
        bestScore = score;
        best = item;
      }
    });

    return best;
  }

  function pickSourceThumbCandidate(candidateEl, items, excludedLower) {
    var excluded = String(excludedLower || '').trim().toLowerCase();
    var pool = (items || []).filter(function(item) {
      if (!item) return false;
      if (excluded && item.srcLower === excluded) return false;
      if (item.isFavicon) return false;
      return true;
    });

    if (pool.length) {
      var best = null;
      var bestScore = -1;
      pool.forEach(function(item) {
        var area = Number(item.area || 0);
        var len = Number(item.srcLen || 0);
        var score = 0;

        if (area > 0) {
          // If we have dimensions, prefer big images.
          score = area * 10 + len;
        } else {
          // If area is 0 (lazy load or display:none), rely on src length.
          // Long URLs usually mean content images (not simple icons).
          if (len > 60 && item.srcLower.indexOf('data:') !== 0) {
            score = 5000 + len;
          } else {
            score = len;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      });
      if (best) {
        return { src: best.src, srcLower: best.srcLower, el: best.el, isFallback: false };
      }
    }

    // Fallback: sometimes previews are background-image on a div.
    if (candidateEl) {
      var bgCandidates = Array.from(candidateEl.querySelectorAll('[style*="background"], [style*="background-image"]'));
      for (var i = 0; i < bgCandidates.length; i++) {
        var node = bgCandidates[i];
        if (!node) continue;

        var bg = '';
        try {
          bg = node.style && node.style.backgroundImage ? node.style.backgroundImage : '';
        } catch (err) {
          bg = '';
        }

        if (!bg) {
          var styleAttr = String(node.getAttribute('style') || '');
          if (styleAttr && styleAttr.indexOf('url(') !== -1) {
            bg = styleAttr;
          }
        }

        var url = extractCssUrl(bg);
        var urlLower = String(url || '').trim().toLowerCase();
        if (!urlLower) continue;
        if (excluded && urlLower === excluded) continue;
        if (isLikelyFaviconSource(urlLower)) continue;

        return { src: url, srcLower: urlLower, el: node, isFallback: true };
      }
    }

    return null;
  }

  function looksLikeGoogleUiText(text) {
    var lower = normalizeText(text).toLowerCase();
    if (!lower) return false;

    for (var i = 0; i < GOOGLE_UI_TEXTS.length; i++) {
      var ui = GOOGLE_UI_TEXTS[i];
      if (lower === ui) return true;
      if (lower.startsWith(ui) && lower.length < ui.length + 20) return true;
    }

    return false;
  }

  function buildGoogleFaviconUrl(href) {
    try {
      var url = new URL(href, window.location.href);
      var hostname = normalizeText(url.hostname || '').replace(/^www\./i, '');
      if (!hostname) {
        return '';
      }

      // Stable Google favicon proxy.
      return 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostname) + '&sz=64';
    } catch (err) {
      return '';
    }
  }

  function normalizeSourceHref(href) {
    var raw = String(href || '').trim();
    if (!raw) return '';

    try {
      var url = new URL(raw, window.location.href);

      if (url.pathname === '/url') {
        var q = url.searchParams.get('q') || url.searchParams.get('url') || url.searchParams.get('u');
        if (q) {
          try {
            var candidate = new URL(q, window.location.href);
            if (candidate.protocol === 'http:' || candidate.protocol === 'https:') {
              return candidate.href;
            }
          } catch (err) {
            // ignore
          }
        }
      }

      return url.href;
    } catch (err) {
      return raw;
    }
  }

  /**
   * Проверяет, похож ли li-элемент на карточку из блока источников.
   */
  function isLikelySourceListItem(liEl) {
    if (!liEl || isInsideTag(liEl, ['PRE', 'CODE', 'MATH'])) {
      return false;
    }

    if (liEl.querySelector('pre, code, table')) {
      return false;
    }

    var links = Array.from(liEl.querySelectorAll('a[href]'));
    if (links.length === 0) {
      return false;
    }

    var text = normalizeText(liEl.textContent || '');
    if (!text || text.length < 20 || text.length > 700) {
      return false;
    }

    var lower = text.toLowerCase();
    var hasImage = !!liEl.querySelector('img');
    var hasDate = /\b\d{1,2}\s+[а-яёa-z]{3,}\.?\s+\d{4}\s*г?\.?/i.test(text);
    var hasSourceWords = lower.includes('сайтов') || lower.includes('источник') || lower.includes('source');

    var hasOverlayLink = links.some(function(linkEl) {
      return !normalizeText(linkEl.textContent || '');
    });

    if (hasOverlayLink && (hasImage || hasDate)) {
      return true;
    }

    if (hasImage && hasDate && links.length >= 1) {
      return true;
    }

    if (hasSourceWords && hasImage && links.length >= 1) {
      return true;
    }

    return false;
  }

  /**
   * Удаляет правый блок источников и карточки сайтов.
   */
  function removeSourcePanels(container) {
    SOURCE_PANEL_SELECTORS.forEach(function(selector) {
      container.querySelectorAll(selector).forEach(function(el) {
        el.remove();
      });
    });

    container.querySelectorAll('img').forEach(function(imgEl) {
      var src = getImageSource(imgEl).toLowerCase();
      if (!src) return;

      if (src.includes('favicon')) {
        imgEl.remove();
      }
    });

    container.querySelectorAll('li').forEach(function(liEl) {
      if (isLikelySourceListItem(liEl)) {
        liEl.remove();
      }
    });

    container.querySelectorAll('a[href]').forEach(function(anchorEl) {
      if (isInsideTag(anchorEl, ['PRE', 'CODE', 'MATH'])) return;

      var linkText = normalizeText(anchorEl.textContent || '');
      if (linkText) return;

      var sibling = anchorEl.nextElementSibling;
      if (!sibling) return;

      var siblingText = normalizeText(sibling.textContent || '');
      if (!siblingText || siblingText.length < 20) return;

      var hasPreviewImage = !!sibling.querySelector('img');
      var hasDate = /\b\d{1,2}\s+[а-яёa-z]{3,}\.?\s+\d{4}\s*г?\.?/i.test(siblingText);
      if (!hasPreviewImage && !hasDate) return;

      var cardEl = anchorEl.closest('li') || anchorEl.parentElement;
      if (cardEl && cardEl.parentNode) {
        cardEl.parentNode.removeChild(cardEl);
      }
    });
  }

  /**
   * Добавляет в ответ свернутый блок с источниками Google (если он найден).
   */
  function appendSourcePanelBlock(container, sourcePanelBlockEl) {
    if (!container || !sourcePanelBlockEl) {
      return;
    }

    embedBlobImagesAsDataUrls(sourcePanelBlockEl);
    container.appendChild(sourcePanelBlockEl);
  }

  /**
   * Собирает правый блок Google с карточками источников в нормализованный вид.
   */
  function buildSourcePanelBlock(container) {
    if (!container) {
      return null;
    }

    var candidates = collectSourcePanelCandidates(container);
    if (candidates.length === 0) {
      return null;
    }

    var listEl = document.createElement('div');
    listEl.setAttribute('data-ai-sources-list', 'true');

    var order = [];
    var cardMap = new Map();

    candidates.forEach(function(candidateEl) {
      var cardEl = buildSourceCard(candidateEl);
      if (!cardEl) {
        return;
      }

      var key = buildSourceCardStableKey(cardEl);
      if (!key) {
        return;
      }

      var score = scoreSourceCard(cardEl);
      var existing = cardMap.get(key);

      if (!existing) {
        order.push(key);
        cardMap.set(key, { cardEl: cardEl, score: score });
        return;
      }

      if (score > existing.score) {
        cardMap.set(key, { cardEl: cardEl, score: score });
      }
    });

    order.forEach(function(key) {
      var record = cardMap.get(key);
      if (record && record.cardEl) {
        listEl.appendChild(record.cardEl);
      }
    });

    if (!listEl.children.length) {
      return null;
    }

    var detailsEl = document.createElement('details');
    detailsEl.setAttribute('data-ai-sources', 'true');

    var summaryEl = document.createElement('summary');
    summaryEl.textContent = 'Источники и материалы (' + listEl.children.length + ')';

    detailsEl.appendChild(summaryEl);
    detailsEl.appendChild(listEl);

    return detailsEl;
  }

  function buildSourceCardStableKey(cardEl) {
    if (!cardEl) {
      return '';
    }

    var anchorEl = cardEl.querySelector('a[href]');
    var href = normalizeText(normalizeSourceHref(anchorEl ? anchorEl.getAttribute('href') : '')).toLowerCase();
    if (href) {
      return href;
    }

    // Fallback: if href missing for some reason.
    var title = normalizeText(anchorEl ? anchorEl.textContent : '').toLowerCase();
    var snippetEl = cardEl.querySelector('p');
    var snippet = normalizeText(snippetEl ? snippetEl.textContent : '').toLowerCase();
    var iconEl = cardEl.querySelector('img[data-ai-source-icon="true"], img');
    var imgSrc = normalizeText(iconEl ? iconEl.getAttribute('src') : '').toLowerCase();

    return [title, snippet.slice(0, 80), imgSrc.slice(0, 80)].join('|');
  }

  function scoreSourceCard(cardEl) {
    if (!cardEl) {
      return 0;
    }

    var score = 0;

    var hasThumb = !!cardEl.querySelector('img[data-ai-source-thumb="true"]') || cardEl.getAttribute('data-ai-source-has-thumb') === 'true';
    if (hasThumb) {
      score += 1000;
    }

    if (cardEl.querySelector('img[data-ai-source-icon="true"]')) {
      score += 120;
    }

    var thumbEl = cardEl.querySelector('img[data-ai-source-thumb="true"]');
    if (thumbEl) {
      var src = String(thumbEl.getAttribute('src') || '').trim().toLowerCase();
      if (src.indexOf('data:image/') === 0) {
        score += 40;
      }
      score += Math.min(120, src.length / 120);
    }

    var snippetEl = cardEl.querySelector('p');
    var snippetLen = normalizeText(snippetEl ? snippetEl.textContent : '').length;
    if (snippetLen) {
      score += Math.min(240, Math.floor(snippetLen / 2));
    }

    return score;
  }

  /**
   * Находит DOM-узлы карточек из правого блока источников.
   */
  function collectSourcePanelCandidates(container) {
    var candidates = [];
    var seenNodes = new Set();

    container.querySelectorAll('li').forEach(function(liEl) {
      if (isLikelySourceListItem(liEl)) {
        addSourceCandidate(candidates, seenNodes, liEl, container);
      }
    });

    SOURCE_PANEL_SELECTORS.forEach(function(selector) {
      container.querySelectorAll(selector).forEach(function(node) {
        addSourceCandidate(candidates, seenNodes, node, container);
      });
    });

    return candidates;
  }

  /**
   * Добавляет кандидата источника в список, если он валиден.
   */
  function addSourceCandidate(candidates, seenNodes, node, rootEl) {
    var candidateEl = findSourceCandidateRoot(node, rootEl);
    if (!candidateEl || seenNodes.has(candidateEl)) {
      return;
    }

    if (!isValidSourceCandidate(candidateEl, rootEl)) {
      return;
    }

    seenNodes.add(candidateEl);
    candidates.push(candidateEl);
  }

  /**
   * Находит корневой контейнер карточки источника.
   */
  function findSourceCandidateRoot(node, rootEl) {
    if (!node) {
      return null;
    }

    var listItem = node.closest('li');
    if (listItem && rootEl && rootEl.contains(listItem)) {
      return listItem;
    }

    var current = node;
    var candidate = null;

    for (var i = 0; i < 6 && current && current !== rootEl; i++) {
      if (!current.querySelector) {
        current = current.parentElement;
        continue;
      }

      var linksCount = current.querySelectorAll('a[href]').length;
      if (linksCount > 0) {
        var textLength = normalizeText(current.textContent || '').length;
        var hasImage = !!current.querySelector('img');
        if ((hasImage || textLength >= 30) && textLength <= 1200) {
          candidate = current;
        }
      }

      current = current.parentElement;
    }

    return candidate;
  }

  /**
   * Проверяет, что элемент действительно похож на карточку источника.
   */
  function isValidSourceCandidate(candidateEl, rootEl) {
    if (!candidateEl || candidateEl === rootEl) {
      return false;
    }

    if (isInsideTag(candidateEl, ['PRE', 'CODE', 'MATH'])) {
      return false;
    }

    if (candidateEl.querySelector('pre, code, table')) {
      return false;
    }

    var links = candidateEl.querySelectorAll('a[href]');
    if (!links.length) {
      return false;
    }

    var textLength = normalizeText(candidateEl.textContent || '').length;
    if (textLength < 12 || textLength > 1400) {
      return false;
    }

    return true;
  }

  /**
   * Создает нормализованную карточку источника (ссылка + текст + изображение).
   */
  function buildSourceCard(candidateEl) {
    var linkEl = getPrimarySourceLink(candidateEl);
    if (!linkEl) {
      return null;
    }

    var href = normalizeSourceHref((linkEl.getAttribute('href') || '').trim());
    if (!href || isSkippableSourceHref(href)) {
      return null;
    }

    if (!/^https?:/i.test(href)) {
      return null;
    }

    var title = buildSourceTitle(candidateEl, linkEl, href);
    if (!title) {
      return null;
    }

    var normalizedTitle = normalizeText(title).toLowerCase();
    if (
      !normalizedTitle ||
      normalizedTitle === 'подробнее' ||
      normalizedTitle === 'learn more' ||
      looksLikeGoogleUiText(normalizedTitle)
    ) {
      return null;
    }

    var allLinks = Array.from(candidateEl.querySelectorAll('a[href]')).filter(function(a) {
      var rawHref = (a.getAttribute('href') || '').trim();
      if (!rawHref || isSkippableSourceHref(rawHref)) {
        return false;
      }
      return true;
    });

    var hasOverlayLink = allLinks.some(function(a) {
      return !normalizeText(a.textContent || '');
    });

    var candidateText = normalizeText(candidateEl.textContent || '');
    var hasDate = /\b\d{1,2}\s+[а-яёa-z]{3,}\.?(\s+\d{4})\s*г?\.?/i.test(candidateText);
    var imageItems = collectSourceImageCandidates(candidateEl);
    var iconItem = pickSourceIconCandidate(imageItems);
    var iconLower = iconItem ? iconItem.srcLower : '';
    var thumbItem = pickSourceThumbCandidate(candidateEl, imageItems, iconLower);
    var hasVisual = !!((thumbItem && thumbItem.src) || (iconItem && iconItem.src));

    if (
      !hasVisual &&
      !hasOverlayLink &&
      !hasDate &&
      !(candidateEl.tagName === 'LI' && isLikelySourceListItem(candidateEl))
    ) {
      return null;
    }

    if (candidateEl.querySelector('button, [role="button"], [role="dialog"], input, textarea') && !hasVisual) {
      return null;
    }

    var cardEl = document.createElement('article');
    cardEl.setAttribute('data-ai-source-item', 'true');

    // Prefer favicon from the DOM; fallback to Google favicon by hostname.
    var iconSrc = iconItem && iconItem.src ? iconItem.src : buildGoogleFaviconUrl(href);
    if (iconSrc) {
      var iconImgEl = document.createElement('img');
      iconImgEl.setAttribute('src', iconSrc);
      iconImgEl.setAttribute('data-ai-source-icon', 'true');
      iconImgEl.setAttribute('alt', buildSourceHostname(href) || 'Источник');
      cardEl.appendChild(iconImgEl);
    }

    if (thumbItem && thumbItem.src) {
      cardEl.setAttribute('data-ai-source-has-thumb', 'true');

      var thumbImgEl = document.createElement('img');
      thumbImgEl.setAttribute('src', thumbItem.src);
      thumbImgEl.setAttribute('data-ai-source-thumb', 'true');
      thumbImgEl.setAttribute('alt', 'Превью источника');
      cardEl.appendChild(thumbImgEl);
    }

    var titleLinkEl = document.createElement('a');
    titleLinkEl.setAttribute('href', href);
    titleLinkEl.textContent = title;
    cardEl.appendChild(titleLinkEl);

    var snippet = buildSourceSnippet(candidateEl, title);
    if (snippet) {
      var snippetEl = document.createElement('p');
      snippetEl.textContent = snippet;
      cardEl.appendChild(snippetEl);
    }

    return cardEl;
  }

  /**
   * Возвращает основную ссылку карточки источника.
   */
  function getPrimarySourceLink(candidateEl) {
    var links = Array.from(candidateEl.querySelectorAll('a[href]')).filter(function(linkEl) {
      if (isInsideTag(linkEl, ['PRE', 'CODE', 'MATH'])) {
        return false;
      }

      var href = (linkEl.getAttribute('href') || '').trim();
      if (!href || isSkippableSourceHref(href)) {
        return false;
      }

      return true;
    });

    if (!links.length) {
      return null;
    }

    return links.find(function(linkEl) {
      return normalizeText(linkEl.textContent || '').length > 2;
    }) || links[0];
  }

  /**
   * Проверяет, что ссылка служебная и не должна попадать в экспорт.
   */
  function isSkippableSourceHref(href) {
    var value = String(href || '').trim().toLowerCase();
    if (!value) return true;
    if (value === '#') return true;
    if (value.startsWith('javascript:')) return true;
    if (value.startsWith('data:')) return true;
    if (value.startsWith('mailto:')) return true;
    if (value.startsWith('tel:')) return true;
    return false;
  }

  /**
   * Формирует заголовок карточки источника.
   */
  function buildSourceTitle(candidateEl, linkEl, href) {
    var linkText = normalizeText(linkEl.textContent || '');
    if (linkText && linkText.length <= 180) {
      return linkText;
    }

    var structuredTitle = extractSourceTitleFromCandidate(candidateEl);
    if (structuredTitle) {
      return structuredTitle;
    }

    var candidateText = normalizeText(candidateEl.textContent || '');
    if (candidateText) {
      var shortText = candidateText.slice(0, 120).trim();
      if (shortText) {
        return shortText;
      }
    }

    return buildSourceHostname(href) || href;
  }

  /**
   * Формирует подзаголовок карточки источника.
   */
  function buildSourceSnippet(candidateEl, title) {
    var structuredSnippet = extractSourceSnippetFromCandidate(candidateEl, title);
    if (structuredSnippet) {
      return structuredSnippet;
    }

    var fullText = normalizeText(candidateEl.textContent || '');
    if (!fullText) {
      return '';
    }

    var normalizedTitle = normalizeText(title || '');
    var snippet = fullText;

    if (normalizedTitle) {
      var titleLower = normalizedTitle.toLowerCase();
      var fullLower = fullText.toLowerCase();
      if (fullLower.startsWith(titleLower)) {
        snippet = fullText.slice(normalizedTitle.length).trim();
      }
    }

    snippet = normalizeText(snippet);
    if (!snippet || snippet.toLowerCase() === normalizedTitle.toLowerCase()) {
      return '';
    }

    if (snippet.length > 280) {
      snippet = snippet.slice(0, 277).trim() + '...';
    }

    return snippet;
  }

  /**
   * Извлекает короткий заголовок карточки источника из структурированных блоков.
   */
  function extractSourceTitleFromCandidate(candidateEl) {
    if (!candidateEl) {
      return '';
    }

    var selectors = ['.Nn35F', '.nPDzT', 'h3', 'h4', '[role="heading"]'];
    for (var i = 0; i < selectors.length; i++) {
      var selector = selectors[i];
      var titleEl = candidateEl.querySelector(selector);
      if (!titleEl) {
        continue;
      }

      var value = normalizeText(titleEl.textContent || '');
      if (!value || value.length < 4) {
        continue;
      }

      return value.length > 180 ? value.slice(0, 177).trim() + '...' : value;
    }

    return '';
  }

  /**
   * Извлекает описание карточки источника из структурированных блоков.
   */
  function extractSourceSnippetFromCandidate(candidateEl, title) {
    if (!candidateEl) {
      return '';
    }

    var normalizedTitle = normalizeText(title || '').toLowerCase();
    var selectors = ['.vhJ6Pe', '.MUxGbd', '.w8lk7d', '.jEYmO'];

    for (var i = 0; i < selectors.length; i++) {
      var selector = selectors[i];
      var snippetEl = candidateEl.querySelector(selector);
      if (!snippetEl) {
        continue;
      }

      var value = normalizeText(snippetEl.textContent || '');
      if (!value || value.length < 8) {
        continue;
      }

      if (normalizedTitle && value.toLowerCase() === normalizedTitle) {
        continue;
      }

      if (value.length > 280) {
        value = value.slice(0, 277).trim() + '...';
      }

      return value;
    }

    return '';
  }

  /**
   * Возвращает hostname ссылки для fallback-заголовка.
   */
  function buildSourceHostname(href) {
    try {
      var url = new URL(href, window.location.href);
      var hostname = normalizeText(url.hostname || '').replace(/^www\./i, '');
      return hostname;
    } catch (err) {
      return '';
    }
  }

  /**
   * Находит превью-изображение карточки источника.
   */
  function findSourcePreviewImage(candidateEl) {
    var items = collectSourceImageCandidates(candidateEl);
    var iconItem = pickSourceIconCandidate(items);
    var iconLower = iconItem ? iconItem.srcLower : '';
    var picked = pickSourceThumbCandidate(candidateEl, items, iconLower);
    if (!picked || !picked.srcLower) {
      return null;
    }

    // If the thumbnail came from an actual <img>, return the element.
    if (picked.el && picked.el.tagName === 'IMG') {
      return picked.el;
    }

    return null;
  }

  /**
   * Строит ключ карточки источника для дедупликации.
   */
  function buildSourceCardKey(cardEl) {
    if (!cardEl) {
      return '';
    }

    var anchorEl = cardEl.querySelector('a[href]');
    var imageEl = cardEl.querySelector('img');

    var href = normalizeText(normalizeSourceHref(anchorEl ? anchorEl.getAttribute('href') : '')).toLowerCase();
    var title = normalizeText(anchorEl ? anchorEl.textContent : '').toLowerCase();
    var imageSrc = normalizeText(imageEl ? imageEl.getAttribute('src') : '').toLowerCase();

    return [href, title, imageSrc].join('|');
  }

  parser.isLikelySourceListItem = isLikelySourceListItem;
  parser.removeSourcePanels = removeSourcePanels;
  parser.appendSourcePanelBlock = appendSourcePanelBlock;
  parser.buildSourcePanelBlock = buildSourcePanelBlock;
  parser.collectSourcePanelCandidates = collectSourcePanelCandidates;
  parser.addSourceCandidate = addSourceCandidate;
  parser.findSourceCandidateRoot = findSourceCandidateRoot;
  parser.isValidSourceCandidate = isValidSourceCandidate;
  parser.buildSourceCard = buildSourceCard;
  parser.getPrimarySourceLink = getPrimarySourceLink;
  parser.isSkippableSourceHref = isSkippableSourceHref;
  parser.buildSourceTitle = buildSourceTitle;
  parser.buildSourceSnippet = buildSourceSnippet;
  parser.extractSourceTitleFromCandidate = extractSourceTitleFromCandidate;
  parser.extractSourceSnippetFromCandidate = extractSourceSnippetFromCandidate;
  parser.buildSourceHostname = buildSourceHostname;
  parser.findSourcePreviewImage = findSourcePreviewImage;
  parser.buildSourceCardKey = buildSourceCardKey;
  parser.collectSourceImageCandidates = collectSourceImageCandidates;
  parser.pickSourceIconCandidate = pickSourceIconCandidate;
  parser.pickSourceThumbCandidate = pickSourceThumbCandidate;
})();
