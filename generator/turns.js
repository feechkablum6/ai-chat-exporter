/**
 * generator/turns.js
 * Сборка HTML одного хода и навигация.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.buildTurnBlock) {
    return;
  }

  var escapeForHTML = gen.escapeForHTML;
  var buildQuoteBlock = gen.buildQuoteBlock;
  var splitAnswerContent = gen.splitAnswerContent;

  function formatTurnNumber(value) {
    var safeValue = Number.isFinite(value) ? value : 0;
    return String(Math.max(0, safeValue)).padStart(2, '0');
  }

  function buildNavArrow(direction, turnIndex, isDisabled) {
    var label = direction === 'prev' ? 'Предыдущий ход' : 'Следующий ход';
    var symbol = direction === 'prev' ? '&lt;' : '&gt;';
    var disabledAttr = isDisabled ? ' disabled aria-disabled="true"' : '';
    return `<button type="button" class="turn-counter-btn turn-counter-arrow" data-turn-nav="${direction}" data-turn-index="${turnIndex}" aria-label="${label}"${disabledAttr}>${symbol}</button>`;
  }

  function buildTurnBlock(turn, num, total) {
    var quoteBlock = buildQuoteBlock(turn.quoteHtml);
    var answerParts = splitAnswerContent(turn.answerHtml);
    var formattedCurrent = formatTurnNumber(num);
    var formattedTotal = formatTurnNumber(total);
    var hasSidePanel = !!answerParts.sourceHtml;

     var questionHtml = turn && turn.questionHtml ? String(turn.questionHtml).trim() : '';
     var hasRichBreaks = /<(br\s*\/?>|p\b|pre\b|div\b|li\b|ul\b|ol\b|blockquote\b|h[1-6]\b)/i.test(questionHtml);
     var questionMarkup = questionHtml && hasRichBreaks ? questionHtml : escapeForHTML(turn.question);

    var prevArrow = buildNavArrow('prev', num, num <= 1);
    var nextArrow = buildNavArrow('next', num, num >= total);

    var html = '';
    html += `<div class="turn-row${hasSidePanel ? ' has-side' : ''}">\n`;
    html += `  <div class="turn" id="turn-${num}">\n`;
    html += `    <div class="turn-header">\n`;
    html += `      <span class="turn-counter">${prevArrow}<span class="turn-number">${formattedCurrent}~${formattedTotal}</span>${nextArrow}</span>\n`;
    html += `    </div>\n`;
    html += `    <div class="user-block">\n`;
    html += quoteBlock;
    html += `      <div class="user-query">${questionMarkup}</div>\n`;
    html += `    </div>\n`;
    html += `    <div class="ai-block">\n`;
    html += `      <div class="ai-answer">${answerParts.mainHtml}</div>\n`;
    html += `    </div>\n`;
    html += `  </div>\n`;
    if (hasSidePanel) {
      html += `  <div class="turn-sources">${answerParts.sourceHtml}</div>\n`;
    }
    html += `</div>`;

    return html;
  }

  gen.formatTurnNumber = formatTurnNumber;
  gen.buildNavArrow = buildNavArrow;
  gen.buildTurnBlock = buildTurnBlock;
})();
