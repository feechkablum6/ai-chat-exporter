/**
 * parser/images.js
 * Обработка изображений: вложения пользователя, изображения ответа, нормализация src,
 * конвертация blob -> data URL.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  var MODULE_VERSION = 3;
  if (parser._imagesModuleVersion && parser._imagesModuleVersion >= MODULE_VERSION) {
    return;
  }
  parser._imagesModuleVersion = MODULE_VERSION;

  var c = parser.constants || {};
  var normalizeText = parser.normalizeText;
  var isInsideTag = parser.isInsideTag;
  var removeNode = parser.removeNode;
  var getDirectChildInContainer = parser.getDirectChildInContainer;

  var USER_ATTACHMENT_ALT_HINTS = c.USER_ATTACHMENT_ALT_HINTS || [];
  var USER_ATTACHMENT_SELECTORS = c.USER_ATTACHMENT_SELECTORS || [];

  var deferredImageSourceMapCache = null;

  /**
   * Определяет изображения, прикрепленные пользователем к запросу.
   */
  function isLikelyUserAttachmentImage(imgEl) {
    if (!imgEl) {
      return false;
    }

    var hasStrongClass = !!(imgEl.classList && (imgEl.classList.contains('taqkMe') || imgEl.classList.contains('Tbpky')));
    var inExactAttachmentShell = !!imgEl.closest('div.irXdnc.UpF4j');
    var inQuestionAttachmentScope = !!imgEl.closest('div.ilZyRc.R7mRQb, [jscontroller="TB3Kme"]');
    var insideLink = !!imgEl.closest('a[href]');

    var alt = normalizeText(imgEl.getAttribute('alt') || '').toLowerCase();
    var hasAltHint = !!alt && USER_ATTACHMENT_ALT_HINTS.some(function(pattern) {
      return alt.includes(pattern);
    });

    if (insideLink) {
      return false;
    }

    if (inExactAttachmentShell) {
      return true;
    }

    if (hasStrongClass && (inQuestionAttachmentScope || hasAltHint)) {
      return true;
    }

    if (hasAltHint && inQuestionAttachmentScope) {
      return true;
    }

    return false;
  }

  /**
   * Определяет canvas, который может быть пользовательским вложением.
   */
  function isLikelyUserAttachmentCanvas(canvasEl) {
    if (!canvasEl) {
      return false;
    }

    var inAttachmentShell = !!canvasEl.closest('div.irXdnc.UpF4j');
    var insideLink = !!canvasEl.closest('a[href]');

    return inAttachmentShell && !insideLink;
  }

  /**
   * Преобразует canvas в data URL.
   */
  function canvasToDataUrl(canvasEl) {
    if (!canvasEl) {
      return '';
    }

    var width = Number(canvasEl.width || canvasEl.clientWidth || 0);
    var height = Number(canvasEl.height || canvasEl.clientHeight || 0);
    if (!width || !height) {
      return '';
    }

    try {
      return canvasEl.toDataURL('image/png');
    } catch (err) {
      return '';
    }
  }

  /**
   * Возвращает Set URL-источников изображений из контейнера.
   */
  function collectImageSources(container) {
    var sources = new Set();
    if (!container) {
      return sources;
    }

    container.querySelectorAll('img').forEach(function(imgEl) {
      var source = getImageSource(imgEl).toLowerCase();
      if (!source) {
        return;
      }

      sources.add(source);
    });

    return sources;
  }

  /**
   * Преобразует список источников изображений в Set.
   */
  function toSourceSet(sources) {
    var set = new Set();
    if (!sources) {
      return set;
    }

    // sources может быть Array или Set (или любым iterable)
    for (var _iterator = sources[Symbol.iterator](), _step; !(_step = _iterator.next()).done; ) {
      var source = _step.value;
      var normalized = String(source || '').trim().toLowerCase();
      if (normalized) {
        set.add(normalized);
      }
    }

    return set;
  }

  /**
   * Собирает изображения, которые явно относятся к пользовательскому вложению.
   */
  function collectDirectQuestionAttachmentImages(container) {
    if (!container) {
      return [];
    }

    var imageEls = [];
    var seen = new Set();

    USER_ATTACHMENT_SELECTORS.forEach(function(selector) {
      container.querySelectorAll(selector).forEach(function(imgEl) {
        if (!imgEl || seen.has(imgEl)) {
          return;
        }

        seen.add(imgEl);
        imageEls.push(imgEl);
      });
    });

    return imageEls;
  }

  /**
   * Собирает изображения вне контейнера ответа ИИ.
   */
  function collectImagesOutsideAnswerScope(container, answerScope) {
    if (!container || !answerScope) {
      return [];
    }

    var images = [];
    var answerBranch = getDirectChildInContainer(answerScope, container);

    if (answerBranch) {
      Array.from(container.children).forEach(function(childEl) {
        if (childEl === answerBranch) {
          return;
        }

        childEl.querySelectorAll('img').forEach(function(imgEl) {
          images.push(imgEl);
        });
      });
    }

    if (images.length > 0) {
      return images.filter(function(imgEl) {
        return isLikelyUserAttachmentImage(imgEl);
      });
    }

    return Array.from(container.querySelectorAll('img')).filter(function(imgEl) {
      if (answerScope.contains(imgEl)) {
        return false;
      }

      return isLikelyUserAttachmentImage(imgEl);
    });
  }

  /**
   * Выносит изображения ответа в отдельный сворачиваемый блок.
   */
  function compactAnswerMedia(container) {
    var answerImages = collectAnswerImages(container);
    if (answerImages.length === 0) {
      return;
    }

    var detailsEl = document.createElement('details');
    detailsEl.setAttribute('data-ai-gallery', 'true');

    var summaryEl = document.createElement('summary');
    summaryEl.textContent = 'Изображения ответа (' + answerImages.length + ')';

    var galleryEl = document.createElement('div');
    galleryEl.setAttribute('data-ai-gallery-content', 'true');

    answerImages.forEach(function(imageEl) {
      var source = getImageSource(imageEl);

      if (source) {
        appendImageToGallery(galleryEl, imageEl, source);
      }

      removeImageWithCard(imageEl);
    });

    removeImageSourceLinks(container);

    if (!galleryEl.querySelector('img')) {
      return;
    }

    detailsEl.appendChild(summaryEl);
    detailsEl.appendChild(galleryEl);

    container.appendChild(detailsEl);
  }

  /**
   * Добавляет изображение в блок галереи ответа.
   */
  function appendImageToGallery(galleryEl, imageEl, source) {
    if (!galleryEl || !imageEl || !source) {
      return;
    }

    var imageItemEl = document.createElement('div');
    imageItemEl.setAttribute('data-ai-gallery-item', 'true');

    var card = extractImageCardData(imageEl);

    if (card && card.href) {
      var linkEl = document.createElement('a');
      linkEl.setAttribute('href', card.href);
      linkEl.setAttribute('target', '_blank');
      linkEl.setAttribute('rel', 'noopener noreferrer');

      var thumbEl = document.createElement('div');
      thumbEl.setAttribute('data-ai-gallery-thumb', 'true');

      var imgEl = document.createElement('img');
      imgEl.setAttribute('src', source);
      var cardAlt = normalizeText(imageEl.getAttribute('alt') || '');
      imgEl.setAttribute('alt', cardAlt || card.title || 'Изображение');
      thumbEl.appendChild(imgEl);

      var metaEl = document.createElement('div');
      metaEl.setAttribute('data-ai-gallery-meta', 'true');

      var titleEl = document.createElement('div');
      titleEl.setAttribute('data-ai-gallery-title', 'true');
      titleEl.textContent = card.title || buildHostnameLabel(card.href) || 'Источник';

      var siteEl = document.createElement('div');
      siteEl.setAttribute('data-ai-gallery-site', 'true');
      var siteText = card.site || buildHostnameLabel(card.href) || '';
      siteEl.textContent = siteText;

      metaEl.appendChild(titleEl);
      if (siteText) {
        metaEl.appendChild(siteEl);
      }

      linkEl.appendChild(thumbEl);
      linkEl.appendChild(metaEl);

      imageItemEl.appendChild(linkEl);
    } else {
      var thumbOnlyEl = document.createElement('div');
      thumbOnlyEl.setAttribute('data-ai-gallery-thumb', 'true');

      var copyEl = document.createElement('img');
      copyEl.setAttribute('src', source);

      var alt = normalizeText(imageEl.getAttribute('alt') || '');
      copyEl.setAttribute('alt', alt || 'Изображение из ответа');

      thumbOnlyEl.appendChild(copyEl);
      imageItemEl.appendChild(thumbOnlyEl);
    }

    galleryEl.appendChild(imageItemEl);
  }

  function extractImageCardData(imageEl) {
    if (!imageEl) {
      return null;
    }

    var cardEl = findImageCardContainer(imageEl);
    if (!cardEl) {
      return null;
    }

    var linkEl = selectBestCardLink(cardEl, imageEl);
    if (!linkEl) {
      return null;
    }

    var rawHref = (linkEl.getAttribute('href') || '').trim();
    if (!rawHref) {
      return null;
    }

    var href = normalizeSourceHref(rawHref);
    if (!href || !/^https?:/i.test(href)) {
      return null;
    }

    var host = buildHostnameLabel(href);
    var hostToken = buildHostTokenLabel(host);
    var site = buildCardSite(cardEl, linkEl, href, host, hostToken);
    var title = buildCardTitle(cardEl, linkEl, imageEl, href, host, hostToken, site);

    return {
      href: href,
      title: title,
      site: site
    };
  }

  function selectBestCardLink(cardEl, imageEl) {
    if (!cardEl) {
      return null;
    }

    var links = Array.from(cardEl.querySelectorAll('a[href]')).filter(function(a) {
      if (!a) {
        return false;
      }

      if (isInsideTag(a, ['PRE', 'CODE', 'MATH'])) {
        return false;
      }

      var href = (a.getAttribute('href') || '').trim();
      if (!href || isSkippableHref(href)) {
        return false;
      }

      return true;
    });

    if (!links.length) {
      return null;
    }

    var directLink = imageEl ? imageEl.closest('a[href]') : null;
    var best = null;
    var bestScore = -999999;

    links.forEach(function(a) {
      var rawHref = (a.getAttribute('href') || '').trim();
      var href = normalizeSourceHref(rawHref);
      if (!href || !/^https?:/i.test(href)) {
        return;
      }

      var score = 0;

      var textLen = normalizeText(a.textContent || '').length;
      if (textLen > 2) score += 15;
      if (textLen > 10) score += 10;

      if (a.querySelector('img')) score += 6;
      if (imageEl && a.contains(imageEl)) score += 25;
      if (directLink && a === directLink) score += 40;

      var host = getHostnameFromHref(href).toLowerCase();
      if (host && !isLikelyGoogleHost(host)) {
        score += 120;
      } else {
        score -= 30;
      }

      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    });

    return best || links[0];
  }

  function getHostnameFromHref(href) {
    try {
      var url = new URL(href, window.location.href);
      return normalizeText(url.hostname || '').replace(/^www\./i, '');
    } catch (err) {
      return '';
    }
  }

  function isLikelyGoogleHost(host) {
    var value = String(host || '').trim().toLowerCase();
    if (!value) return false;
    if (value === 'google.com' || value === 'google.ru') return true;
    if (value.endsWith('.google.com') || value.endsWith('.google.ru')) return true;
    if (value.endsWith('.gstatic.com')) return true;
    return false;
  }

  function isSkippableHref(href) {
    var value = String(href || '').trim().toLowerCase();
    if (!value) return true;
    if (value === '#') return true;
    if (value.startsWith('javascript:')) return true;
    if (value.startsWith('data:')) return true;
    if (value.startsWith('mailto:')) return true;
    if (value.startsWith('tel:')) return true;
    return false;
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

      // Google Images redirect format.
      if (url.pathname === '/imgres') {
        var imgref = url.searchParams.get('imgrefurl') || url.searchParams.get('imgref');
        if (imgref) {
          try {
            var refCandidate = new URL(imgref, window.location.href);
            if (refCandidate.protocol === 'http:' || refCandidate.protocol === 'https:') {
              return refCandidate.href;
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

  function buildCardTitle(cardEl, linkEl, imageEl, href, host, hostToken, siteLabel) {
    var labels = [host, hostToken, siteLabel, buildHostTokenLabel(siteLabel)].filter(Boolean);

    // 1) Link attributes are often the cleanest title.
    var ariaLabel = normalizeText(linkEl ? linkEl.getAttribute('aria-label') : '');
    if (ariaLabel && ariaLabel.length >= 4) {
      var cleanedAria = sanitizeCardText(ariaLabel, labels);
      if (cleanedAria) {
        return shortenCardTitle(cleanedAria);
      }
    }

    var titleAttr = normalizeText(linkEl ? linkEl.getAttribute('title') : '');
    if (titleAttr && titleAttr.length >= 4) {
      var cleanedTitleAttr = sanitizeCardText(titleAttr, labels);
      if (cleanedTitleAttr) {
        return shortenCardTitle(cleanedTitleAttr);
      }
    }

    // 2) Try structured headings.
    var selectors = ['h3', 'h4', '[role="heading"]', '.Nn35F', '.nPDzT'];
    for (var i = 0; i < selectors.length; i++) {
      var el = cardEl.querySelector(selectors[i]);
      if (!el) {
        continue;
      }

      var text = getSmartText(el);
      if (text && text.length >= 4) {
        var cleaned = sanitizeCardText(text, labels);
        if (cleaned) {
          return shortenCardTitle(cleaned);
        }
      }
    }

    // 3) Use first line from the card text (innerText preserves natural line breaks/spaces).
    var lines = extractCardLines(linkEl);
    if (!lines.length) {
      lines = extractCardLines(cardEl);
    }
    var firstLine = pickFirstTitleLine(lines, labels);
    if (firstLine) {
      return shortenCardTitle(firstLine);
    }

    // 4) Fallback: link text.
    var linkText = getSmartText(linkEl);
    if (linkText && linkText.length >= 4 && linkText.length <= 220) {
      var cleanedLinkText = sanitizeCardText(linkText, labels);
      if (cleanedLinkText) {
        return shortenCardTitle(cleanedLinkText);
      }
    }

    // 5) Fallback: image alt.
    var alt = normalizeText(imageEl ? imageEl.getAttribute('alt') : '');
    if (alt && alt.length >= 4) {
      var cleanedAlt = sanitizeCardText(alt, labels);
      if (cleanedAlt) {
        return shortenCardTitle(cleanedAlt);
      }
    }

    return host || href;
  }

  function buildCardSite(cardEl, linkEl, href, host, hostToken) {
    var hostname = host || buildHostnameLabel(href);
    var token = hostToken || buildHostTokenLabel(hostname);
    var labels = [hostname, token].filter(Boolean);

    // Prefer a short last line from the card (often matches Google: author/brand like "Sigra").
    var lines = extractCardLines(linkEl);
    if (!lines.length) {
      lines = extractCardLines(cardEl);
    }
    var picked = pickSourceLine(lines, labels);
    if (picked) {
      return picked;
    }

    // Otherwise, show the hostname (like Google cards do).
    return hostname;
  }

  function sanitizeCardText(text, labels) {
    var value = normalizeText(text);
    if (!value) {
      return '';
    }

    value = collapseRepeatedSuffix(value);

    var list = Array.isArray(labels) ? labels : [labels];
    list
      .map(function(l) {
        return normalizeText(l || '');
      })
      .filter(Boolean)
      .forEach(function(label) {
        value = insertSpaceBeforeTrailingLabel(value, label);
        value = stripTrailingLabel(value, label);
      });

    value = normalizeText(value);
    if (!value) {
      return '';
    }

    for (var i = 0; i < list.length; i++) {
      var lab = normalizeText(list[i] || '');
      if (!lab) continue;
      if (value.toLowerCase() === lab.toLowerCase()) {
        return '';
      }
    }

    return value;
  }

  function getSmartText(el) {
    if (!el) {
      return '';
    }
    // innerText better preserves spaces between inline elements like "how" + "Pkautosmart".
    var raw = el.innerText || el.textContent || '';
    return normalizeText(raw);
  }

  function extractCardLines(cardEl) {
    if (!cardEl) {
      return [];
    }

    var raw = cardEl.innerText || cardEl.textContent || '';
    var text = String(raw || '').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n');
    var lines = text
      .split(/\n+/g)
      .map(function(line) {
        return normalizeText(line);
      })
      .filter(Boolean);

    return lines;
  }

  function pickFirstTitleLine(lines, labels) {
    if (!lines || !lines.length) {
      return '';
    }

    var list = Array.isArray(labels) ? labels : [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line || line.length < 4) {
        continue;
      }

      if (isDomainLike(line)) {
        continue;
      }

      var cleaned = sanitizeCardText(line, list);
      if (cleaned && cleaned.length >= 4) {
        return cleaned;
      }
    }

    return '';
  }

  function pickSourceLine(lines, labels) {
    if (!lines || !lines.length) {
      return '';
    }

    // 1) Prefer a domain-looking line (pkautosmart.co.uk).
    for (var i = lines.length - 1; i >= 0; i--) {
      var line = normalizeText(lines[i]);
      if (!line) continue;
      if (isDomainLike(line)) {
        return line.replace(/^www\./i, '');
      }
    }

    // 2) Prefer a short label at the end (Sigra).
    for (var j = lines.length - 1; j >= 0; j--) {
      var value = normalizeText(lines[j]);
      if (!value) continue;
      if (value.length < 2 || value.length > 40) continue;
      if (value.indexOf(' ') !== -1 && value.split(' ').filter(Boolean).length > 3) continue;

      var cleaned = sanitizeSourceLabel(value);
      if (!cleaned) continue;

      // Keep original casing for labels.
      return cleaned;
    }

    return '';
  }

  function sanitizeSourceLabel(text) {
    var value = normalizeText(text);
    if (!value) {
      return '';
    }

    value = collapseRepeatedSuffix(value);
    value = normalizeText(value);
    value = value.replace(/[;,.]+\s*$/g, '').trim();

    return value;
  }

  function isDomainLike(text) {
    var value = String(text || '').trim();
    if (!value) return false;
    if (value.indexOf(' ') !== -1) return false;
    if (value.length < 4 || value.length > 80) return false;
    // basic host.tld pattern
    return /^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);
  }

  function insertSpaceBeforeTrailingLabel(text, label) {
    var value = String(text || '');
    var lab = String(label || '');
    if (!value || !lab) {
      return value;
    }

    var lower = value.toLowerCase();
    var labLower = lab.toLowerCase();

    if (!lower.endsWith(labLower)) {
      return value;
    }

    if (value.length <= lab.length) {
      return value;
    }

    var start = value.length - lab.length;
    if (start <= 0) {
      return value;
    }

    var prev = value.charAt(start - 1);
    if (!prev) {
      return value;
    }

    if (/\s/.test(prev)) {
      return value;
    }

    // If there's already a separator, don't add a space.
    if (
      prev === '|' ||
      prev === '-' ||
      prev === ':' ||
      prev === ';' ||
      prev === ',' ||
      prev === '.' ||
      prev === ')' ||
      prev === ']' ||
      prev === '}' ||
      prev === '/'
    ) {
      return value;
    }

    if (/^[A-Za-z0-9]$/.test(prev)) {
      return value.slice(0, start) + ' ' + value.slice(start);
    }

    return value;
  }

  function stripTrailingLabel(text, label) {
    var value = String(text || '').trim();
    var lab = String(label || '').trim();
    if (!value || !lab) {
      return value;
    }

    var lower = value.toLowerCase();
    var labLower = lab.toLowerCase();
    if (lower === labLower) {
      return value;
    }

    // Убираем повторяющийся hostname в хвосте заголовка.
    for (var i = 0; i < 3; i++) {
      lower = value.toLowerCase();
      if (!lower.endsWith(labLower)) {
        break;
      }

      value = value.slice(0, value.length - lab.length).trim();
      value = value.replace(/[|\-–—:;,.]+\s*$/g, '').trim();
    }

    // Убираем одинокую точку/запятую в конце после обрезки.
    value = value.replace(/[;,.]+\s*$/g, '').trim();

    return value;
  }

  function shortenCardTitle(text) {
    var value = normalizeText(text);
    if (!value) {
      return '';
    }

    // Titles in Google cards are typically short; long strings usually include snippets.
    // Try to cut at common separators first.
    var cutCandidates = [' | ', ' - ', ' — ', ' – ', ' · ', ' • '];
    for (var i = 0; i < cutCandidates.length; i++) {
      var sep = cutCandidates[i];
      var idx = value.indexOf(sep);
      if (idx > 18) {
        value = value.slice(0, idx).trim();
        break;
      }
    }

    // If still very long, cut at first sentence end.
    if (value.length > 110) {
      var dot = value.indexOf('. ');
      if (dot > 30 && dot < 110) {
        value = value.slice(0, dot).trim();
      }
    }

    // Final clamp by words/chars.
    var words = value.split(' ').filter(Boolean);
    if (words.length > 18) {
      value = words.slice(0, 18).join(' ').trim() + '...';
      return value;
    }

    if (value.length > 95) {
      value = value.slice(0, 92).trim() + '...';
    }

    return value;
  }

  function collapseRepeatedSuffix(text) {
    var value = String(text || '').trim();
    if (!value) {
      return '';
    }

    // 1) Схлопываем повторяющееся слово в конце: "X X X" -> "X".
    var words = value.split(' ').filter(Boolean);
    if (words.length >= 2) {
      var last = words[words.length - 1];
      var count = 1;
      for (var i = words.length - 2; i >= 0; i--) {
        if (words[i].toLowerCase() !== last.toLowerCase()) {
          break;
        }
        count++;
      }

      if (count >= 2) {
        value = words.slice(0, words.length - (count - 1)).join(' ');
      }
    }

    // 2) Схлопываем повторяющуюся подстроку без пробелов: "FreepikFreepikFreepik" -> "Freepik".
    // Ограничиваем длины, чтобы не делать тяжелых проверок.
    for (var len = 3; len <= 18; len++) {
      if (value.length < len * 2) {
        continue;
      }

      var chunk = value.slice(value.length - len);
      // пропускаем, если chunk выглядит как мусор
      if (!/^[A-Za-z0-9._-]+$/.test(chunk)) {
        continue;
      }

      var repeats = 1;
      var pos = value.length - len;
      while (pos - len >= 0) {
        var prev = value.slice(pos - len, pos);
        if (prev.toLowerCase() !== chunk.toLowerCase()) {
          break;
        }
        repeats++;
        pos -= len;
      }

      if (repeats >= 2) {
        value = value.slice(0, value.length - len * (repeats - 1));
        value = value.trim();
        break;
      }
    }

    return value;
  }

  function buildHostnameLabel(href) {
    try {
      var url = new URL(href, window.location.href);
      return normalizeText(url.hostname || '').replace(/^www\./i, '');
    } catch (err) {
      return '';
    }
  }

  function buildHostTokenLabel(hostname) {
    var host = normalizeText(hostname || '').replace(/^www\./i, '').toLowerCase();
    if (!host) {
      return '';
    }

    var parts = host.split('.').filter(Boolean);
    if (parts.length < 2) {
      return host;
    }

    var sld = parts[parts.length - 2];
    var commonSecond = ['co', 'com', 'org', 'net', 'gov', 'edu'];
    if (commonSecond.indexOf(sld) !== -1 && parts.length >= 3) {
      sld = parts[parts.length - 3];
    }

    return sld;
  }

  function capitalizeSiteLabel(value) {
    var text = String(value || '').trim();
    if (!text) {
      return '';
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Собирает изображения ответа, исключая служебные и мелкие иконки.
   */
  function collectAnswerImages(container) {
    var seenSources = new Set();

    return Array.from(container.querySelectorAll('img')).filter(function(imageEl) {
      if (!imageEl) {
        return false;
      }

      if (imageEl.getAttribute('data-xpm-latex')) {
        return false;
      }

      var source = getImageSource(imageEl).toLowerCase();
      if (!source || source.includes('favicon')) {
        return false;
      }

      if (seenSources.has(source)) {
        return false;
      }

      var width = imageEl.naturalWidth || imageEl.width || 0;
      var height = imageEl.naturalHeight || imageEl.height || 0;
      if (width && height && (width < 48 || height < 48)) {
        return false;
      }

      seenSources.add(source);
      return true;
    });
  }

  /**
   * Удаляет изображение вместе с карточкой-оберткой, если она найдена.
   */
  function removeImageWithCard(imageEl) {
    if (!imageEl) {
      return;
    }

    var cardEl = findImageCardContainer(imageEl);
    if (cardEl && cardEl.parentNode) {
      cardEl.parentNode.removeChild(cardEl);
      return;
    }

    removeNode(imageEl);
  }

  /**
   * Пытается найти контейнер карточки изображения с ссылкой на источник.
   */
  function findImageCardContainer(imageEl) {
    var current = imageEl;

    for (var i = 0; i < 6 && current && current.parentElement; i++) {
      var parent = current.parentElement;
      var hasImage = !!parent.querySelector('img');
      var hasLink = !!parent.querySelector('a[href]');

      if (hasImage && hasLink) {
        return parent;
      }

      current = parent;
    }

    var listItem = imageEl.closest('li');
    if (listItem && listItem.querySelector('a[href]')) {
      return listItem;
    }

    return null;
  }

  /**
   * Удаляет ссылки, связанные с карточками изображений.
   */
  function removeImageSourceLinks(container) {
    container.querySelectorAll('a[href]').forEach(function(anchorEl) {
      if (isInsideTag(anchorEl, ['PRE', 'CODE', 'MATH'])) {
        return;
      }

      if (anchorEl.querySelector('img')) {
        anchorEl.remove();
        return;
      }

      var prevEl = anchorEl.previousElementSibling;
      var nextEl = anchorEl.nextElementSibling;
      var hasImageNear =
        !!(prevEl && prevEl.querySelector && prevEl.querySelector('img')) ||
        !!(nextEl && nextEl.querySelector && nextEl.querySelector('img'));

      if (hasImageNear) {
        anchorEl.remove();
      }
    });
  }

  /**
   * Нормализует src/srcset у картинок до чистого src.
   */
  function normalizeImageSources(container) {
    if (!container) {
      return;
    }

    container.querySelectorAll('img').forEach(function(imgEl) {
      var source = getImageSource(imgEl);
      if (!source) {
        return;
      }

      imgEl.setAttribute('src', source);
      imgEl.removeAttribute('srcset');
    });
  }

  /**
   * Конвертирует blob-изображения в data URL для автономного HTML.
   */
  function embedBlobImagesAsDataUrls(container) {
    var imageEls = Array.from(container.querySelectorAll('img'));

    imageEls.forEach(function(imgEl) {
      var source = getImageSource(imgEl);
      if (!source || !source.startsWith('blob:')) {
        return;
      }

      var sourceImage = findImageBySource(source);
      var dataUrl = imageToDataUrl(sourceImage || imgEl);
      if (!dataUrl) {
        return;
      }

      imgEl.setAttribute('src', dataUrl);
      imgEl.removeAttribute('srcset');
    });
  }

  /**
   * Возвращает URL изображения из src/currentSrc.
   */
  function getImageSource(imgEl) {
    if (!imgEl) return '';

    var srcsetSource = getImageSourceFromSrcset(imgEl.getAttribute('srcset') || imgEl.srcset || '');
    var deferredSource = getDeferredImageSource(imgEl);
    var candidates = [
      imgEl.currentSrc,
      srcsetSource,
      imgEl.getAttribute('data-src'),
      imgEl.getAttribute('data-original'),
      imgEl.getAttribute('data-iurl'),
      imgEl.getAttribute('data-image-url'),
      imgEl.getAttribute('data-thumbnail-url'),
      deferredSource,
      imgEl.getAttribute('src'),
      imgEl.src
    ];

    var fallbackSource = '';

    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var normalized = String(candidate || '').trim();
      if (!normalized) {
        continue;
      }

      if (!fallbackSource) {
        fallbackSource = normalized;
      }

      if (isLikelyPlaceholderSource(normalized)) {
        continue;
      }

      return normalized;
    }

    return fallbackSource;
  }

  /**
   * Возвращает source для лениво загружаемых img, если URL хранится в inline-script.
   */
  function getDeferredImageSource(imgEl) {
    if (!imgEl) {
      return '';
    }

    var imageId = normalizeText(imgEl.getAttribute('id') || imgEl.id || '');
    if (!imageId) {
      return '';
    }

    var sourceMap = collectDeferredImageSources();
    return sourceMap.get(imageId) || '';
  }

  /**
   * Собирает карту id -> src из вызовов window.sn._setImageSrc(...).
   */
  function collectDeferredImageSources() {
    if (deferredImageSourceMapCache) {
      return deferredImageSourceMapCache;
    }

    var sourceMap = new Map();
    var callPattern = /_setImageSrc\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]((?:\\.|[^'\"])*)['\"]\s*\)/g;

    document.querySelectorAll('script').forEach(function(scriptEl) {
      var scriptText = scriptEl && scriptEl.textContent ? scriptEl.textContent : '';
      if (!scriptText || scriptText.indexOf('_setImageSrc(') === -1) {
        return;
      }

      callPattern.lastIndex = 0;
      var match = callPattern.exec(scriptText);
      while (match) {
        var imageId = normalizeText(match[1] || '');
        var rawSource = match[2] || '';
        var source = decodeEscapedScriptString(rawSource);

        if (imageId && source && !sourceMap.has(imageId)) {
          sourceMap.set(imageId, source);
        }

        match = callPattern.exec(scriptText);
      }
    });

    deferredImageSourceMapCache = sourceMap;
    return sourceMap;
  }

  /**
   * Декодирует escape-последовательности из inline-script строки.
   */
  function decodeEscapedScriptString(value) {
    if (!value) {
      return '';
    }

    return String(value)
      .replace(/\\x([0-9a-fA-F]{2})/g, function(_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      })
      .replace(/\\u([0-9a-fA-F]{4})/g, function(_, hex) {
        return String.fromCharCode(parseInt(hex, 16));
      })
      .replace(/\\\//g, '/')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\')
      .trim();
  }

  /**
   * Отбрасывает плейсхолдеры изображений от ленивой загрузки.
   */
  function isLikelyPlaceholderSource(source) {
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

    if (value.startsWith('data:image/') && value.length < 180) {
      return true;
    }

    return false;
  }

  /**
   * Берет наиболее качественный URL из srcset.
   */
  function getImageSourceFromSrcset(srcset) {
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

  /**
   * Находит исходный img-элемент страницы по URL.
   */
  function findImageBySource(source) {
    if (!source) return null;

    var allImages = document.images || [];
    for (var i = 0; i < allImages.length; i++) {
      var imageEl = allImages[i];
      if (!imageEl) continue;

      var current = imageEl.currentSrc || imageEl.src || imageEl.getAttribute('src') || '';
      if (current === source) {
        return imageEl;
      }
    }

    return null;
  }

  /**
   * Преобразует изображение в base64 data URL через canvas.
   */
  function imageToDataUrl(imageEl) {
    if (!imageEl) return '';

    var width = imageEl.naturalWidth || imageEl.width || 0;
    var height = imageEl.naturalHeight || imageEl.height || 0;
    if (!width || !height) {
      return '';
    }

    var canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    try {
      ctx.drawImage(imageEl, 0, 0, width, height);
      return canvas.toDataURL('image/png');
    } catch (err) {
      return '';
    }
  }

  parser.isLikelyUserAttachmentImage = isLikelyUserAttachmentImage;
  parser.isLikelyUserAttachmentCanvas = isLikelyUserAttachmentCanvas;
  parser.canvasToDataUrl = canvasToDataUrl;
  parser.collectImageSources = collectImageSources;
  parser.toSourceSet = toSourceSet;
  parser.collectDirectQuestionAttachmentImages = collectDirectQuestionAttachmentImages;
  parser.collectImagesOutsideAnswerScope = collectImagesOutsideAnswerScope;

  parser.compactAnswerMedia = compactAnswerMedia;
  parser.appendImageToGallery = appendImageToGallery;
  parser.collectAnswerImages = collectAnswerImages;
  parser.removeImageWithCard = removeImageWithCard;
  parser.findImageCardContainer = findImageCardContainer;
  parser.removeImageSourceLinks = removeImageSourceLinks;

  parser.normalizeImageSources = normalizeImageSources;
  parser.embedBlobImagesAsDataUrls = embedBlobImagesAsDataUrls;
  parser.getImageSource = getImageSource;
  parser.getDeferredImageSource = getDeferredImageSource;
  parser.collectDeferredImageSources = collectDeferredImageSources;
  parser.decodeEscapedScriptString = decodeEscapedScriptString;
  parser.isLikelyPlaceholderSource = isLikelyPlaceholderSource;
  parser.getImageSourceFromSrcset = getImageSourceFromSrcset;
  parser.findImageBySource = findImageBySource;
  parser.imageToDataUrl = imageToDataUrl;
})();
