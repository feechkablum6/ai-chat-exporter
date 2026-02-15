/**
 * generator/viewer.js
 * HTML модального просмотрщика изображений.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.buildImageViewer) {
    return;
  }

  function buildImageViewer() {
    return `
<div class="image-viewer" id="imageViewer" hidden>
    <button class="image-viewer-close" id="imageViewerClose" title="Закрыть">&times;</button>
    <img class="image-viewer-img" id="imageViewerImg" alt="Полноразмерное изображение">
</div>`;
  }

  gen.buildImageViewer = buildImageViewer;
})();
