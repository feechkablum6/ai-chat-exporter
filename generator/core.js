/**
 * generator/core.js
 * Сборка полной HTML-страницы и публичная generateHTML(turns).
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.generateHTML && gen.buildFullPage) {
    return;
  }

  var constants = gen.constants || {};
  var TURN_SOURCE_SPACER = constants.TURN_SOURCE_SPACER || '\n\n\n\n\n';

  var buildTurnBlock = gen.buildTurnBlock;
  var buildImageViewer = gen.buildImageViewer;
  var buildStyles = gen.buildStyles;
  var buildScript = gen.buildScript;

  function buildFullPage(turnsHtml, totalTurns) {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="google-ai-chat-saver-build" content="gallery-cards-2026-02-14">
    <title>Google AI Chat</title>
${buildStyles()}
</head>
<body>

<div class="container">
${turnsHtml}
</div>

${buildImageViewer()}
${buildScript(totalTurns)}

</body>
</html>`;
  }

  function generateHTML(turns) {
    var total = turns.length;
    var turnsHtml = '';

    for (var i = 0; i < total; i++) {
      var turn = turns[i];
      var num = i + 1;

      turnsHtml += TURN_SOURCE_SPACER;
      turnsHtml += `<!-- ========================== ХОД ${num} / ${total} ========================== -->\n`;
      turnsHtml += buildTurnBlock(turn, num, total);
      turnsHtml += `\n<!-- ====================== КОНЕЦ ХОДА ${num} / ${total} ====================== -->`;
      turnsHtml += TURN_SOURCE_SPACER;
    }

    return buildFullPage(turnsHtml, total);
  }

  gen.TURN_SOURCE_SPACER = TURN_SOURCE_SPACER;
  gen.buildFullPage = buildFullPage;
  gen.generateHTML = generateHTML;
})();
