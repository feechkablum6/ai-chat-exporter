/**
 * parser/constants.js
 * Константы и паттерны для парсера Google AI Mode.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var parser = root.parser;
  if (!parser) return;

  if (parser.constants && parser.constants.__loaded) {
    return;
  }

  var GOOGLE_UI_TEXTS = [
    'полезный',
    'предложение бесполезно',
    'создание общедоступной ссылки',
    'спасибо!',
    'ваши отзывы помогают',
    'политикой конфиденциальности',
    'политика конфиденциальности',
    'копировать',
    'поделиться',
    'показать все',
    'показать ещё',
    'свернуть',
    'развернуть',
    'закрыть',
    'отмена',
    'удалить',
    'история режима ии',
    'вход не выполнен',
    'войти',
    'режим ии',
    'задать вопрос по теме',
    'используйте код с осторожностью',
    'скопировано в буфер обмена',
    'скопировать код в буфер обмена',
    'думаю…',
    'думаю...',
    'thinking…',
    'thinking...',
    'хороший ответ',
    'плохой ответ',
    'good answer',
    'bad answer'
  ];

  var AI_DISCLAIMER_PATTERNS = [
    'в ответах искусственного интеллекта могут быть ошибки',
    'ответы ии могут содержать ошибки',
    'ии может ошибаться',
    'советуем проверять его ответы',
    'ai responses may include mistakes',
    'ai responses may contain mistakes',
    'ai may make mistakes',
    'ai can make mistakes'
  ];

  var CODE_LANGUAGE_NAMES = new Set([
    'python',
    'javascript',
    'js',
    'typescript',
    'ts',
    'java',
    'kotlin',
    'swift',
    'rust',
    'go',
    'golang',
    'php',
    'ruby',
    'perl',
    'lua',
    'dart',
    'scala',
    'r',
    'matlab',
    'sql',
    'html',
    'css',
    'xml',
    'json',
    'yaml',
    'yml',
    'bash',
    'shell',
    'sh',
    'powershell',
    'ps1',
    'c',
    'c++',
    'cpp',
    'c#',
    'cs',
    'objective-c',
    'objc',
    'plaintext',
    'text'
  ]);

  var CODE_LANGUAGE_DISPLAY = {
    js: 'JavaScript',
    javascript: 'JavaScript',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    kotlin: 'Kotlin',
    swift: 'Swift',
    rust: 'Rust',
    go: 'Go',
    golang: 'Go',
    php: 'PHP',
    ruby: 'Ruby',
    perl: 'Perl',
    lua: 'Lua',
    dart: 'Dart',
    scala: 'Scala',
    r: 'R',
    matlab: 'MATLAB',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
    xml: 'XML',
    json: 'JSON',
    yaml: 'YAML',
    yml: 'YAML',
    bash: 'Bash',
    shell: 'Shell',
    sh: 'Shell',
    powershell: 'PowerShell',
    ps1: 'PowerShell',
    c: 'C',
    'c++': 'C++',
    cpp: 'C++',
    'c#': 'C#',
    cs: 'C#',
    'objective-c': 'Objective-C',
    objc: 'Objective-C',
    plaintext: 'Text',
    text: 'Text'
  };

  var TURN_CONTAINER_SELECTORS = [
    'div.tonYlb',
    'div[data-tr-rsts]',
    '[jsmodel*="CPTaDd"][data-tr-rsts]'
  ];

  var QUESTION_SELECTORS = [
    '.sUKAcb span.VndcI > span',
    '.sUKAcb span.VndcI',
    'span.VndcI > span',
    'span.VndcI',
    '.tbIZh span[role="heading"] span',
    '.tbIZh [role="heading"]',
    '[role="heading"][aria-level="2"] span',
    '[role="heading"][aria-level="2"]'
  ];

  var QUESTION_SCOPE_SELECTORS = ['.ilZyRc', '.tbIZh', '.sUKAcb'];

  var ANSWER_SCOPE_SELECTORS = ['[data-subtree="aimc"]', '[data-aimmrs="true"]', '.Zkbeff'];

  var SOURCE_PANEL_SELECTORS = [
    '.ofHStc',
    '.NGHFcc',
    '.W94uae',
    '.iqGHOe',
    '.MUZtye',
    '.U9BD8',
    '.Wsaimf',
    '.QyEYne',
    'img.sGgDgb',
    'img.aWLPic',
    '.wDa0n',
    '.HWMcu',
    '.jKhXsc',
    '.bTFeG',
    '.CyMdWb'
  ];

  var USER_ATTACHMENT_ALT_HINTS = ['визуального поиска', 'visual search', 'по изображению', 'image search'];

  var USER_ATTACHMENT_SELECTORS = [
    'div.irXdnc.UpF4j img',
    'div.CKgc1d img.taqkMe',
    'div.CKgc1d img.Tbpky',
    '[data-scope-id="turn"] .irXdnc img',
    'img.taqkMe',
    'img.Tbpky'
  ];

  var FALLBACK_HEADING_SELECTORS = [
    'span.VndcI',
    '[role="heading"][aria-level="2"] span',
    '[role="heading"] span',
    'h2 span',
    'h1 span'
  ];

  var MATH_FUNCTION_NAMES = ['log', 'ln', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc'];
  var MATH_FUNCTION_SET = new Set(MATH_FUNCTION_NAMES);
  var MATH_FUNCTION_PATTERN = MATH_FUNCTION_NAMES.join('|');
  var MATH_FN_BEFORE_REGEX = new RegExp('([A-Za-z0-9])(' + MATH_FUNCTION_PATTERN + ')(?=[A-Za-z0-9])', 'gi');
  var MATH_FN_AFTER_REGEX = new RegExp('\\b(' + MATH_FUNCTION_PATTERN + ')(?=[A-Za-z0-9])', 'gi');
  var MATH_THIN_SPACE = '\u2009';
  var MATHML_NS = 'http://www.w3.org/1998/Math/MathML';
  var MATH_ATOMIC_TAGS = new Set([
    'MI',
    'MN',
    'MROW',
    'MFRAC',
    'MSUP',
    'MSUB',
    'MSUBSUP',
    'MSQRT',
    'MROOT',
    'MFENCED',
    'MTEXT'
  ]);

  var SUPERSCRIPT_CHAR_MAP = {
    '0': '⁰',
    '1': '¹',
    '2': '²',
    '3': '³',
    '4': '⁴',
    '5': '⁵',
    '6': '⁶',
    '7': '⁷',
    '8': '⁸',
    '9': '⁹',
    '+': '⁺',
    '-': '⁻'
  };

  var SUBSCRIPT_CHAR_MAP = {
    '0': '₀',
    '1': '₁',
    '2': '₂',
    '3': '₃',
    '4': '₄',
    '5': '₅',
    '6': '₆',
    '7': '₇',
    '8': '₈',
    '9': '₉',
    '+': '₊',
    '-': '₋'
  };

  // Паттерны для блоков-замечаний (caveat)
  var CAVEAT_PATTERNS = [
    'важное замечание',
    'важно:',
    'примечание:',
    'обратите внимание:',
    'предупреждение:',
    'совет:',
    'подсказка:',
    'note:',
    'important:',
    'warning:',
    'tip:'
  ];

  parser.constants = {
    __loaded: true,

    GOOGLE_UI_TEXTS: GOOGLE_UI_TEXTS,
    AI_DISCLAIMER_PATTERNS: AI_DISCLAIMER_PATTERNS,

    CODE_LANGUAGE_NAMES: CODE_LANGUAGE_NAMES,
    CODE_LANGUAGE_DISPLAY: CODE_LANGUAGE_DISPLAY,

    TURN_CONTAINER_SELECTORS: TURN_CONTAINER_SELECTORS,
    QUESTION_SELECTORS: QUESTION_SELECTORS,
    QUESTION_SCOPE_SELECTORS: QUESTION_SCOPE_SELECTORS,
    ANSWER_SCOPE_SELECTORS: ANSWER_SCOPE_SELECTORS,
    SOURCE_PANEL_SELECTORS: SOURCE_PANEL_SELECTORS,

    USER_ATTACHMENT_ALT_HINTS: USER_ATTACHMENT_ALT_HINTS,
    USER_ATTACHMENT_SELECTORS: USER_ATTACHMENT_SELECTORS,
    FALLBACK_HEADING_SELECTORS: FALLBACK_HEADING_SELECTORS,

    MATH_FUNCTION_NAMES: MATH_FUNCTION_NAMES,
    MATH_FUNCTION_SET: MATH_FUNCTION_SET,
    MATH_FUNCTION_PATTERN: MATH_FUNCTION_PATTERN,
    MATH_FN_BEFORE_REGEX: MATH_FN_BEFORE_REGEX,
    MATH_FN_AFTER_REGEX: MATH_FN_AFTER_REGEX,
    MATH_THIN_SPACE: MATH_THIN_SPACE,
    MATHML_NS: MATHML_NS,
    MATH_ATOMIC_TAGS: MATH_ATOMIC_TAGS,
    SUPERSCRIPT_CHAR_MAP: SUPERSCRIPT_CHAR_MAP,
    SUBSCRIPT_CHAR_MAP: SUBSCRIPT_CHAR_MAP,

    CAVEAT_PATTERNS: CAVEAT_PATTERNS
  };
})();
