/**
 * parser/math.js
 * Обработка MathML и LaTeX (fallback-текст для автономного HTML).
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.processLatexFormulas) {
    return;
  }

  var c = parser.constants || {};
  var normalizeText = parser.normalizeText;

  var MATH_FUNCTION_SET = c.MATH_FUNCTION_SET;
  var MATH_FN_BEFORE_REGEX = c.MATH_FN_BEFORE_REGEX;
  var MATH_FN_AFTER_REGEX = c.MATH_FN_AFTER_REGEX;
  var MATH_THIN_SPACE = c.MATH_THIN_SPACE;
  var MATHML_NS = c.MATHML_NS;
  var MATH_ATOMIC_TAGS = c.MATH_ATOMIC_TAGS;
  var SUPERSCRIPT_CHAR_MAP = c.SUPERSCRIPT_CHAR_MAP;
  var SUBSCRIPT_CHAR_MAP = c.SUBSCRIPT_CHAR_MAP;

  /**
   * Обрабатывает LaTeX формулы - заменяет img на читаемый текст.
   */
  function processLatexFormulas(container) {
    container.querySelectorAll('link[href*="gstatic.com/external_hosted"]').forEach(function(el) {
      el.remove();
    });
    container.querySelectorAll('annotation').forEach(function(el) {
      el.remove();
    });

    container.querySelectorAll('img[data-xpm-latex]').forEach(function(img) {
      var latex = img.getAttribute('data-xpm-latex');
      if (latex) {
        var span = document.createElement('span');
        span.setAttribute('data-formula', 'true');
        span.textContent = formatLatex(latex);
        img.replaceWith(span);
      }
    });

    container.querySelectorAll('math').forEach(function(mathEl) {
      var text = normalizeMathText(mathEl.textContent || '');
      if (!text) {
        mathEl.remove();
        return;
      }

      normalizeMathMarkup(mathEl);

      var plainFormulaEl = findNearbyPlainFormulaEl(mathEl);
      if (plainFormulaEl) {
        plainFormulaEl.remove();
      }

      unwrapFormulaBlockParents(mathEl, container);
    });

    container.querySelectorAll('[data-formula]').forEach(function(formulaEl) {
      if (formulaEl.tagName && formulaEl.tagName.toUpperCase() === 'MATH') return;

      formulaEl.textContent = normalizeFormulaFallbackText(formulaEl.textContent || '');
      if (!formulaEl.textContent) {
        formulaEl.remove();
        return;
      }

      unwrapFormulaBlockParents(formulaEl, container);
    });
  }

  /**
   * Нормализует MathML-узел и добавляет тонкие интервалы.
   */
  function normalizeMathMarkup(mathEl) {
    mathEl.querySelectorAll('mi').forEach(function(miEl) {
      var token = normalizeMathText(miEl.textContent || '');
      if (!token) {
        miEl.remove();
        return;
      }

      miEl.textContent = token;

      var lower = token.toLowerCase();
      if (token.length > 1 || (MATH_FUNCTION_SET && MATH_FUNCTION_SET.has(lower))) {
        miEl.setAttribute('mathvariant', 'normal');
      }
    });

    insertThinSpacesIntoMath(mathEl);
  }

  /**
   * Добавляет узкие интервалы после функций в MathML (log n, sin x).
   */
  function insertThinSpacesIntoMath(mathEl) {
    var miNodes = Array.from(mathEl.querySelectorAll('mi'));

    miNodes.forEach(function(miEl) {
      var token = normalizeMathText(miEl.textContent || '').toLowerCase();
      if (!token) return;

      var nextEl = miEl.nextElementSibling;
      if (!nextEl) return;
      if (nextEl.tagName && nextEl.tagName.toUpperCase() === 'MSPACE') return;

      if (!needsThinSpaceAfterMi(token, nextEl)) return;

      var mspace = document.createElementNS(MATHML_NS, 'mspace');
      mspace.setAttribute('width', '0.14em');
      miEl.parentNode.insertBefore(mspace, nextEl);
    });
  }

  /**
   * Проверяет, нужен ли тонкий интервал после <mi> токена.
   */
  function needsThinSpaceAfterMi(token, nextEl) {
    if (!token || !nextEl || !nextEl.tagName) return false;

    var nextTag = nextEl.tagName.toUpperCase();
    if (nextTag === 'MSPACE') return false;
    if (nextTag === 'MO') return false;
    if (!MATH_ATOMIC_TAGS || !MATH_ATOMIC_TAGS.has(nextTag)) {
      return false;
    }

    return (MATH_FUNCTION_SET && MATH_FUNCTION_SET.has(token)) || token.length > 1;
  }

  /**
   * Находит рядом текстовую копию формулы, если есть MathML.
   */
  function findNearbyPlainFormulaEl(mathEl) {
    var parent = mathEl.parentElement;

    for (var i = 0; i < 4 && parent; i++) {
      var formulaEls = parent.querySelectorAll('[data-formula]');
      for (var j = 0; j < formulaEls.length; j++) {
        var formulaEl = formulaEls[j];
        if (formulaEl === mathEl) continue;
        if (formulaEl.tagName && formulaEl.tagName.toUpperCase() === 'MATH') continue;
        if (formulaEl.contains(mathEl) || mathEl.contains(formulaEl)) continue;
        return formulaEl;
      }

      parent = parent.parentElement;
    }

    return null;
  }

  /**
   * Нормализует текст формулы, извлеченный из MathML.
   */
  function normalizeMathText(text) {
    return normalizeText(text);
  }

  /**
   * Нормализует fallback-текст формулы и добавляет тонкие интервалы.
   */
  function normalizeFormulaFallbackText(text) {
    var normalized = normalizeMathText(text);
    if (!normalized) return '';

    return normalized
      .replace(MATH_FN_BEFORE_REGEX, '$1' + MATH_THIN_SPACE + '$2')
      .replace(MATH_FN_AFTER_REGEX, '$1' + MATH_THIN_SPACE)
      .trim();
  }

  /**
   * Убирает лишние div-обертки вокруг inline-формул.
   */
  function unwrapFormulaBlockParents(formulaEl, rootEl) {
    var parent = formulaEl.parentElement;

    for (var i = 0; i < 4 && parent && parent !== rootEl; i++) {
      if (parent.tagName !== 'DIV') break;
      if (parent.children.length !== 1) break;

      var grand = parent.parentElement;
      if (!grand) break;

      grand.insertBefore(formulaEl, parent);
      parent.remove();
      parent = formulaEl.parentElement;
    }
  }

  /**
   * Форматирует LaTeX в читаемый текст.
   */
  function formatLatex(latex) {
    if (!latex) return '';

    var formatted = String(latex)
      .replace(/\u00a0/g, ' ')
      .replace(/\\left/g, '')
      .replace(/\\right/g, '')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\operatorname\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
      .replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)')
      .replace(/\^\{([^}]+)\}/g, function(_, exp) {
        return formatLatexExponent(exp);
      })
      .replace(/\^([A-Za-z0-9+\-]+)/g, function(_, exp) {
        return formatLatexExponent(exp);
      })
      .replace(/_\{([^}]+)\}/g, function(_, sub) {
        return formatLatexSubscript(sub);
      })
      .replace(/_([A-Za-z0-9+\-]+)/g, function(_, sub) {
        return formatLatexSubscript(sub);
      })
      .replace(/\\([a-zA-Z]+)/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    return normalizeFormulaFallbackText(formatted);
  }

  /**
   * Форматирует степень в fallback-представлении LaTeX.
   */
  function formatLatexExponent(value) {
    var normalized = normalizeMathText(value);
    if (!normalized) return '';

    if (/^[0-9+\-]+$/.test(normalized)) {
      return toSuperscript(normalized);
    }

    return '^(' + normalized + ')';
  }

  /**
   * Форматирует нижний индекс в fallback-представлении LaTeX.
   */
  function formatLatexSubscript(value) {
    var normalized = normalizeMathText(value);
    if (!normalized) return '';

    if (/^[0-9+\-]+$/.test(normalized)) {
      return toSubscript(normalized);
    }

    return '_(' + normalized + ')';
  }

  /**
   * Преобразует число в верхний индекс.
   */
  function toSuperscript(str) {
    return String(str)
      .split('')
      .map(function(ch) {
        return (SUPERSCRIPT_CHAR_MAP && SUPERSCRIPT_CHAR_MAP[ch]) || ch;
      })
      .join('');
  }

  /**
   * Преобразует число в нижний индекс.
   */
  function toSubscript(str) {
    return String(str)
      .split('')
      .map(function(ch) {
        return (SUBSCRIPT_CHAR_MAP && SUBSCRIPT_CHAR_MAP[ch]) || ch;
      })
      .join('');
  }

  parser.processLatexFormulas = processLatexFormulas;
  parser.normalizeMathMarkup = normalizeMathMarkup;
  parser.insertThinSpacesIntoMath = insertThinSpacesIntoMath;
  parser.needsThinSpaceAfterMi = needsThinSpaceAfterMi;
  parser.findNearbyPlainFormulaEl = findNearbyPlainFormulaEl;
  parser.normalizeMathText = normalizeMathText;
  parser.normalizeFormulaFallbackText = normalizeFormulaFallbackText;
  parser.unwrapFormulaBlockParents = unwrapFormulaBlockParents;
  parser.formatLatex = formatLatex;
  parser.formatLatexExponent = formatLatexExponent;
  parser.formatLatexSubscript = formatLatexSubscript;
  parser.toSuperscript = toSuperscript;
  parser.toSubscript = toSubscript;
})();
