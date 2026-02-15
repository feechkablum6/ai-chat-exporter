/**
 * parser/core.js
 * Основная логика парсинга: поиск ходов, извлечение вопроса/цитаты/ответа.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.parseGoogleAIChat) {
    return;
  }

  var c = parser.constants || {};

  var TURN_CONTAINER_SELECTORS = c.TURN_CONTAINER_SELECTORS || [];
  var QUESTION_SELECTORS = c.QUESTION_SELECTORS || [];
  var QUESTION_SCOPE_SELECTORS = c.QUESTION_SCOPE_SELECTORS || [];
  var ANSWER_SCOPE_SELECTORS = c.ANSWER_SCOPE_SELECTORS || [];
  var FALLBACK_HEADING_SELECTORS = c.FALLBACK_HEADING_SELECTORS || [];

  var normalizeText = parser.normalizeText;
  var normalizeUserText = parser.normalizeUserText || parser.normalizeText;
  var isSameText = parser.isSameText;
  var isGoogleUI = parser.isGoogleUI;

  var removeNode = parser.removeNode;
  var appendHTMLFragment = parser.appendHTMLFragment;

  var normalizeImageSources = parser.normalizeImageSources;
  var embedBlobImagesAsDataUrls = parser.embedBlobImagesAsDataUrls;
  var getImageSource = parser.getImageSource;
  var collectImageSources = parser.collectImageSources;
  var toSourceSet = parser.toSourceSet;

  var normalizeInlineWrappers = parser.normalizeInlineWrappers;
  var normalizeTextNodes = parser.normalizeTextNodes;
  var normalizeNBSPTextNodes = parser.normalizeNBSPTextNodes;
  var removeLeafUiTextNodes = parser.removeLeafUiTextNodes;
  var removeCommentNodes = parser.removeCommentNodes;
  var stripGoogleAttributes = parser.stripGoogleAttributes;
  var removeEmptyElements = parser.removeEmptyElements;

  var removeUIElements = parser.removeUIElements;
  var buildSourcePanelBlock = parser.buildSourcePanelBlock;
  var extractCleanHTML = parser.extractCleanHTML;

  var isLikelyUserAttachmentImage = parser.isLikelyUserAttachmentImage;
  var isLikelyUserAttachmentCanvas = parser.isLikelyUserAttachmentCanvas;
  var canvasToDataUrl = parser.canvasToDataUrl;
  var collectDirectQuestionAttachmentImages = parser.collectDirectQuestionAttachmentImages;
  var collectImagesOutsideAnswerScope = parser.collectImagesOutsideAnswerScope;

  /**
   * Главная функция парсинга.
   * Находит все ходы чата и возвращает массив.
   */
  function parseGoogleAIChat() {
    var turnContainers = findTurnContainers();

    if (!turnContainers || turnContainers.length === 0) {
      // Fallback: пробуем старый метод для одиночного ответа
      return parseSingleTurn();
    }

    var turns = [];

    for (var i = 0; i < turnContainers.length; i++) {
      var container = turnContainers[i];
      var turn = extractTurnFromContainer(container);
      if (turn) {
        turns.push(turn);
      }
    }

    if (turns.length === 0) {
      return parseSingleTurn();
    }

    return turns;
  }

  /**
   * Находит контейнеры ходов по нескольким стратегиям.
   */
  function findTurnContainers() {
    var containers = [];
    var seen = new Set();

    TURN_CONTAINER_SELECTORS.forEach(function(selector) {
      document.querySelectorAll(selector).forEach(function(el) {
        if (seen.has(el)) return;
        seen.add(el);
        containers.push(el);
      });
    });

    if (containers.length === 0) {
      return [];
    }

    return containers.filter(function(container) {
      if (extractQuestionText(container)) {
        return true;
      }

      var answerScope = findAnswerScope(container);
      return !!(answerScope && hasRealContent(answerScope));
    });
  }

  /**
   * Извлекает вопрос и ответ из контейнера хода.
   */
  function extractTurnFromContainer(container) {
    var questionPayload = extractQuestionPayload(container);
    var question = (questionPayload && questionPayload.text) || findUserQuestion() || '(вопрос не найден)';
    var questionHtml = (questionPayload && questionPayload.html) || '';

    var quoteHtml = extractQuotedQuestionHTML(container, question);
    var answerHtml = extractAnswerHTML(container);

    if (!answerHtml || answerHtml.length < 10) {
      return null;
    }

    return {
      question: question,
      questionHtml: questionHtml,
      quoteHtml: quoteHtml,
      answerHtml: answerHtml
    };
  }

  /**
   * Извлекает текст вопроса пользователя из контейнера.
   */
  function extractQuestionText(container) {
    var payload = extractQuestionPayload(container);
    return payload ? payload.text : null;
  }

  /**
   * Извлекает текст и HTML вопроса пользователя.
   * HTML нужен, чтобы не терять <br>/<p>/<pre> и структуру строк.
   */
  function extractQuestionPayload(container) {
    if (!container) {
      return null;
    }

    var questionScope = findQuestionScope(container) || container;

    for (var s = 0; s < QUESTION_SELECTORS.length; s++) {
      var selector = QUESTION_SELECTORS[s];
      var questionEls = Array.from(questionScope.querySelectorAll(selector));
      if (questionEls.length === 0) continue;

      for (var i = questionEls.length - 1; i >= 0; i--) {
        var questionEl = questionEls[i];
        if (!questionEl) {
          continue;
        }

        var rawText = questionEl.innerText || questionEl.textContent || '';
        var questionText = normalizeUserText(rawText);
        if (!questionText) continue;
        if (questionText.length < 2 || questionText.length > 4000) continue;
        if (isGoogleUI(questionText)) continue;

        var questionHtml = extractQuestionHTML(questionEl);

        return {
          text: questionText,
          html: questionHtml
        };
      }
    }

    return null;
  }

  function extractQuestionHTML(questionEl) {
    if (!questionEl) {
      return '';
    }

    var clone = questionEl.cloneNode(true);
    clone
      .querySelectorAll(
        'button, svg, script, style, input, textarea, [role="button"], [role="dialog"], [role="status"]'
      )
      .forEach(function(el) {
        el.remove();
      });

    if (normalizeNBSPTextNodes) {
      normalizeNBSPTextNodes(clone);
    }

    removeCommentNodes(clone);
    stripGoogleAttributes(clone);
    removeEmptyElements(clone);

    var html = clone.outerHTML || clone.innerHTML || '';
    return String(html).trim();
  }

  /**
   * Находит область DOM, где расположен блок вопроса пользователя.
   */
  function findQuestionScope(container) {
    var richQuestionBlock = container.querySelector(QUESTION_SCOPE_SELECTORS[0]);
    if (richQuestionBlock) {
      return richQuestionBlock;
    }

    var questionHost = container.querySelector(QUESTION_SCOPE_SELECTORS[1]);
    if (questionHost) {
      return questionHost;
    }

    var compactQuestionBlock = container.querySelector(QUESTION_SCOPE_SELECTORS[2]);
    if (!compactQuestionBlock) {
      return null;
    }

    if (compactQuestionBlock.parentElement && compactQuestionBlock.parentElement !== container) {
      return compactQuestionBlock.parentElement;
    }

    return compactQuestionBlock;
  }

  /**
   * Находит область, где может быть цитата выбранного текста.
   */
  function findQuoteScope(container) {
    var tbizhBlock = container.querySelector('.tbIZh');
    if (tbizhBlock) {
      return tbizhBlock;
    }

    var compactQuestionBlock = container.querySelector('.sUKAcb');
    if (!compactQuestionBlock) {
      return null;
    }

    if (compactQuestionBlock.parentElement && compactQuestionBlock.parentElement !== container) {
      return compactQuestionBlock.parentElement;
    }

    return compactQuestionBlock;
  }

  /**
   * Возвращает список областей, где могут находиться вложения пользователя.
   */
  function collectQuestionMediaScopes(container, includeParents) {
    var scopes = [];
    var seen = new Set();

    var quoteScope = findQuoteScope(container);
    var questionScope = findQuestionScope(container);

    var candidates = [quoteScope, questionScope];

    if (includeParents) {
      candidates.push(quoteScope ? quoteScope.parentElement : null);
      candidates.push(questionScope ? questionScope.parentElement : null);
    }

    candidates.forEach(function(scopeEl) {
      if (!scopeEl || seen.has(scopeEl)) {
        return;
      }

      seen.add(scopeEl);
      scopes.push(scopeEl);
    });

    return scopes;
  }

  /**
   * Извлекает HTML цитаты из пользовательского запроса (если есть).
   */
  function extractQuotedQuestionHTML(container, questionText) {
    var quoteScope = findQuoteScope(container) || findQuestionScope(container);
    if (!quoteScope) {
      return extractQuestionMediaOnlyHTML(container);
    }

    var quoteClone = quoteScope.cloneNode(true);
    removeQuestionTextNodes(quoteClone, questionText);

    removeUIElements(quoteClone);
    quoteClone
      .querySelectorAll(
        'button, svg, script, style, input, textarea, [role="button"], [role="dialog"], [role="status"]'
      )
      .forEach(function(el) {
        el.remove();
      });

    normalizeImageSources(quoteClone);
    embedBlobImagesAsDataUrls(quoteClone);
    normalizeInlineWrappers(quoteClone);
    normalizeTextNodes(quoteClone);
    removeLeafUiTextNodes(quoteClone);
    removeCommentNodes(quoteClone);
    stripGoogleAttributes(quoteClone);
    removeEmptyElements(quoteClone);

    var existingSources = collectImageSources(quoteClone);
    var additionalMediaHtml = extractQuestionMediaOnlyHTML(container, existingSources);
    appendHTMLFragment(quoteClone, additionalMediaHtml);

    var hasMedia = !!quoteClone.querySelector('img');
    var text = normalizeText(quoteClone.textContent || '');
    if (!text && !hasMedia) {
      return '';
    }

    if (!hasMedia && isSameText(text, questionText)) {
      return '';
    }

    return quoteClone.innerHTML.trim();
  }

  /**
   * Извлекает только пользовательские изображения вне области ответа ИИ.
   */
  function extractQuestionMediaOnlyHTML(container, excludedSources) {
    var answerScope = findAnswerScope(container);
    var mediaScopes = collectQuestionMediaScopes(container, !!answerScope);
    var excludedSet = toSourceSet(excludedSources);

    var imageCandidates = [];
    var canvasCandidates = [];

    collectDirectQuestionAttachmentImages(container).forEach(function(imgEl) {
      imageCandidates.push(imgEl);
    });

    mediaScopes.forEach(function(scopeEl) {
      scopeEl.querySelectorAll('img').forEach(function(imgEl) {
        if (!isLikelyUserAttachmentImage(imgEl)) {
          return;
        }

        imageCandidates.push(imgEl);
      });

      scopeEl.querySelectorAll('canvas').forEach(function(canvasEl) {
        if (!isLikelyUserAttachmentCanvas(canvasEl)) {
          return;
        }

        canvasCandidates.push(canvasEl);
      });
    });

    container.querySelectorAll('img').forEach(function(imgEl) {
      if (!isLikelyUserAttachmentImage(imgEl)) {
        return;
      }

      imageCandidates.push(imgEl);
    });

    container.querySelectorAll('canvas').forEach(function(canvasEl) {
      if (!isLikelyUserAttachmentCanvas(canvasEl)) {
        return;
      }

      canvasCandidates.push(canvasEl);
    });

    if (imageCandidates.length === 0 && answerScope) {
      imageCandidates = collectImagesOutsideAnswerScope(container, answerScope);
    }

    if (imageCandidates.length === 0 && canvasCandidates.length === 0) {
      return '';
    }

    var mediaClone = document.createElement('div');
    var seenSources = new Set();

    imageCandidates.forEach(function(imgEl) {
      if (!imgEl) {
        return;
      }

      if (imgEl.getAttribute('data-xpm-latex')) {
        return;
      }

      if (!isLikelyUserAttachmentImage(imgEl)) {
        return;
      }

      if (answerScope && answerScope.contains(imgEl)) {
        return;
      }

      var source = getImageSource(imgEl);
      var sourceLower = source.toLowerCase();
      if (!sourceLower || sourceLower.includes('favicon')) {
        return;
      }

      if (excludedSet.has(sourceLower)) {
        return;
      }

      var width = imgEl.naturalWidth || imgEl.width || 0;
      var height = imgEl.naturalHeight || imgEl.height || 0;
      if (width && height && (width < 24 || height < 24)) {
        return;
      }

      if (seenSources.has(sourceLower)) {
        return;
      }
      seenSources.add(sourceLower);

      var copyEl = document.createElement('img');
      copyEl.setAttribute('src', source);

      var alt = normalizeText(imgEl.getAttribute('alt') || '');
      if (alt) {
        copyEl.setAttribute('alt', alt);
      }

      mediaClone.appendChild(copyEl);
    });

    canvasCandidates.forEach(function(canvasEl) {
      if (!canvasEl) {
        return;
      }

      if (!isLikelyUserAttachmentCanvas(canvasEl)) {
        return;
      }

      if (answerScope && answerScope.contains(canvasEl)) {
        return;
      }

      var source = canvasToDataUrl(canvasEl);
      var sourceLower = source.toLowerCase();
      if (!sourceLower) {
        return;
      }

      if (excludedSet.has(sourceLower) || seenSources.has(sourceLower)) {
        return;
      }
      seenSources.add(sourceLower);

      var copyEl = document.createElement('img');
      copyEl.setAttribute('src', source);
      copyEl.setAttribute('alt', 'Прикрепленное изображение');
      mediaClone.appendChild(copyEl);
    });

    if (!mediaClone.querySelector('img')) {
      return '';
    }

    embedBlobImagesAsDataUrls(mediaClone);
    stripGoogleAttributes(mediaClone);
    removeEmptyElements(mediaClone);

    return mediaClone.innerHTML.trim();
  }

  /**
   * Удаляет из ответа блок вопроса и соседний блок цитаты/вложений.
   */
  function removeQuestionAndQuoteBlocks(container) {
    var questionBlock = findQuestionScope(container);
    var quoteBlock = findQuoteScope(container);

    removeNode(questionBlock);

    if (!quoteBlock || quoteBlock === questionBlock) {
      return;
    }

    if (questionBlock && (questionBlock.contains(quoteBlock) || quoteBlock.contains(questionBlock))) {
      return;
    }

    removeNode(quoteBlock);
  }

  /**
   * Извлекает и очищает HTML ответа ИИ для одного хода.
   */
  function extractAnswerHTML(container) {
    if (!container) {
      return '';
    }

    var sourcePanelHost = container.cloneNode(true);
    var sourcePanelBlockEl = buildSourcePanelBlock(sourcePanelHost);
    var answerScope = findAnswerScope(container);
    var answerClone = (answerScope || container).cloneNode(true);

    if (!answerScope) {
      removeQuestionAndQuoteBlocks(answerClone);
    }

    return extractCleanHTML(answerClone, sourcePanelBlockEl);
  }

  /**
   * Находит основной контейнер ответа ИИ внутри хода.
   */
  function findAnswerScope(container) {
    if (!container) {
      return null;
    }

    for (var i = 0; i < ANSWER_SCOPE_SELECTORS.length; i++) {
      var selector = ANSWER_SCOPE_SELECTORS[i];
      var found = container.querySelector(selector);
      if (!found) {
        continue;
      }

      if (hasRealContent(found)) {
        return found;
      }
    }

    return null;
  }

  /**
   * Удаляет дублирующий текст вопроса из цитаты/вложений.
   */
  function removeQuestionTextNodes(container, questionText) {
    var normalizedQuestion = normalizeText(questionText);
    if (!normalizedQuestion) {
      return;
    }

    container
      .querySelectorAll('.sUKAcb, span.VndcI, [role="heading"], h1, h2, h3')
      .forEach(function(el) {
        if (el.querySelector && el.querySelector('img')) {
          return;
        }

        var text = normalizeText(el.innerText || el.textContent || '');
        if (isSameText(text, normalizedQuestion)) {
          el.remove();
        }
      });

    container.querySelectorAll('div, span, p').forEach(function(el) {
      if (el.children.length > 0) {
        return;
      }

      var text = normalizeText(el.textContent || '');
      if (isSameText(text, normalizedQuestion)) {
        el.remove();
      }
    });
  }

  /**
   * Fallback: парсинг одиночного ответа (старый метод).
   */
  function parseSingleTurn() {
    var aiContainer = findAIAnswerContainer();
    if (!aiContainer) {
      return 'ERROR: AI-ответ не найден на странице';
    }

    var userQuestion = findUserQuestion();
    var fallbackTurnContainer = findFallbackTurnContainer(aiContainer);
    var quoteHtml = fallbackTurnContainer ? extractQuotedQuestionHTML(fallbackTurnContainer, userQuestion || '') : '';
    var answerHtml = fallbackTurnContainer ? extractAnswerHTML(fallbackTurnContainer) : extractCleanHTML(aiContainer);

    if (!answerHtml || answerHtml.length < 10) {
      return 'ERROR: Не удалось извлечь ответ ИИ';
    }

    return [
      {
        question: userQuestion || '(вопрос не найден)',
        quoteHtml: quoteHtml,
        answerHtml: answerHtml
      }
    ];
  }

  /**
   * Ищет лучший контейнер хода для fallback-режима.
   */
  function findFallbackTurnContainer(aiContainer) {
    var selector = 'div.tonYlb, div[data-tr-rsts], [jsmodel*="CPTaDd"][data-tr-rsts]';
    var candidates = Array.from(document.querySelectorAll(selector));

    var withAttachment = candidates.find(function(container) {
      if (!container || !container.querySelectorAll) {
        return false;
      }

      var attachmentImage = Array.from(container.querySelectorAll('img')).find(function(imgEl) {
        return isLikelyUserAttachmentImage(imgEl);
      });

      if (attachmentImage) {
        return true;
      }

      var attachmentCanvas = Array.from(container.querySelectorAll('canvas')).find(function(canvasEl) {
        return isLikelyUserAttachmentCanvas(canvasEl);
      });

      return !!attachmentCanvas;
    });

    if (withAttachment) {
      return withAttachment;
    }

    if (aiContainer) {
      var parentTurn = aiContainer.closest(selector);
      if (parentTurn) {
        return parentTurn;
      }
    }

    return candidates[0] || null;
  }

  /**
   * Находит контейнер с ответом ИИ (fallback).
   */
  function findAIAnswerContainer() {
    var byData = document.querySelector('[data-subtree="aimc"], [data-aimmrs="true"]');
    if (byData && hasRealContent(byData)) {
      return byData;
    }

    var candidates = document.querySelectorAll('div');
    var best = null;
    var bestScore = 0;

    for (var i = 0; i < candidates.length; i++) {
      var div = candidates[i];
      var score = scoreAsAnswer(div);
      if (score > bestScore) {
        bestScore = score;
        best = div;
      }
    }

    return best;
  }

  /**
   * Оценивает div как потенциальный ответ ИИ.
   */
  function scoreAsAnswer(div) {
    var text = (div.innerText || '').trim();

    var style = window.getComputedStyle(div);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return -1000;
    }

    if (isGoogleUI(text)) {
      return -1000;
    }

    var score = 0;

    if (text.length > 100) score += 30;
    if (text.length > 300) score += 20;
    if (text.length > 500) score += 10;

    if (div.querySelector('strong, b')) score += 15;
    if (div.querySelector('ul, ol')) score += 15;
    if (div.querySelector('code, pre')) score += 15;

    var buttons = div.querySelectorAll('button');
    if (buttons.length > 3) score -= 30;
    if (div.querySelector('input, textarea')) score -= 50;

    if (div.children.length > 20 && text.length < 200) score -= 20;

    return score;
  }

  /**
   * Проверяет, содержит ли элемент реальный контент.
   */
  function hasRealContent(el) {
    var text = (el.innerText || '').trim();
    if (text.length < 20) return false;
    if (isGoogleUI(text)) return false;
    return true;
  }

  /**
   * Ищет вопрос пользователя на странице (fallback).
   */
  function findUserQuestion() {
    var urlParams = new URLSearchParams(window.location.search);
    var q = urlParams.get('q');
    if (q && q.trim().length > 0) {
      return q.trim();
    }

    var searchInput = document.querySelector('input[type="text"], textarea');
    if (searchInput && searchInput.value && searchInput.value.trim().length > 0) {
      return searchInput.value.trim();
    }

    for (var i = 0; i < FALLBACK_HEADING_SELECTORS.length; i++) {
      var sel = FALLBACK_HEADING_SELECTORS[i];
      var el = document.querySelector(sel);
      if (el) {
        var text = (el.innerText || '').trim();
        if (text.length > 0 && text.length < 500 && !isGoogleUI(text)) {
          return text;
        }
      }
    }

    return null;
  }

  parser.parseGoogleAIChat = parseGoogleAIChat;
  parser.findTurnContainers = findTurnContainers;
  parser.extractTurnFromContainer = extractTurnFromContainer;
  parser.extractQuestionText = extractQuestionText;
  parser.extractQuestionPayload = extractQuestionPayload;
  parser.findQuestionScope = findQuestionScope;
  parser.findQuoteScope = findQuoteScope;
  parser.collectQuestionMediaScopes = collectQuestionMediaScopes;
  parser.extractQuotedQuestionHTML = extractQuotedQuestionHTML;
  parser.extractQuestionMediaOnlyHTML = extractQuestionMediaOnlyHTML;
  parser.removeQuestionAndQuoteBlocks = removeQuestionAndQuoteBlocks;
  parser.extractAnswerHTML = extractAnswerHTML;
  parser.findAnswerScope = findAnswerScope;
  parser.removeQuestionTextNodes = removeQuestionTextNodes;
  parser.parseSingleTurn = parseSingleTurn;
  parser.findFallbackTurnContainer = findFallbackTurnContainer;
  parser.findAIAnswerContainer = findAIAnswerContainer;
  parser.scoreAsAnswer = scoreAsAnswer;
  parser.hasRealContent = hasRealContent;
  parser.findUserQuestion = findUserQuestion;
})();
