/**
 * generator/runtime.js
 * Встраиваемый JS для навигации и просмотрщика изображений.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.buildScript) {
    return;
  }

  function buildScript(totalTurns) {
    return `
<script>
(function() {
    var total = ${totalTurns};

    initImageViewer();
    initSidePanels();
    initTurnCounterButtons();

    function initSidePanels() {
        var rows = document.querySelectorAll('.turn-row.has-side');
        if (!rows.length) {
            return;
        }

        function syncRow(row) {
            var turnEl = row.querySelector('.turn');
            var detailsEl = row.querySelector('.turn-sources details[data-ai-sources="true"]');
            var listEl = row.querySelector('.turn-sources [data-ai-sources-list="true"]');

            if (!turnEl || !detailsEl || !listEl) {
                return;
            }

            var turnHeight = Math.ceil(turnEl.getBoundingClientRect().height || 0);
            var viewportHeight = Math.max(220, Math.floor((window.innerHeight || 0) * 0.62));
            var panelHeight = window.matchMedia('(max-width: 979px)').matches
                ? viewportHeight
                : (turnHeight || viewportHeight);

            if (!panelHeight) {
                panelHeight = 220;
            }

            detailsEl.style.maxHeight = panelHeight + 'px';

            if (!detailsEl.hasAttribute('open')) {
                listEl.style.maxHeight = '';
                return;
            }

            var summaryEl = detailsEl.querySelector('summary');
            var summaryHeight = summaryEl ? Math.ceil(summaryEl.getBoundingClientRect().height || 0) : 0;
            var listMaxHeight = Math.max(120, panelHeight - summaryHeight - 2);
            listEl.style.maxHeight = listMaxHeight + 'px';
        }

        function syncAllRows() {
            rows.forEach(function(row) {
                syncRow(row);
            });
        }

        rows.forEach(function(row) {
            var detailsEl = row.querySelector('.turn-sources details[data-ai-sources="true"]');
            if (!detailsEl || detailsEl.dataset.sideBound === '1') {
                return;
            }

            detailsEl.dataset.sideBound = '1';
            detailsEl.addEventListener('toggle', function() {
                syncRow(row);
            });
        });

        window.addEventListener('resize', syncAllRows);
        setTimeout(syncAllRows, 0);
    }

    function initTurnCounterButtons() {
        var btnEls = document.querySelectorAll('.turn-counter-btn[data-turn-nav][data-turn-index]');
        if (!btnEls.length) {
            return;
        }

        btnEls.forEach(function(btnEl) {
            if (!btnEl || btnEl.dataset.turnBound === '1') {
                return;
            }

            btnEl.dataset.turnBound = '1';
            btnEl.addEventListener('click', function() {
                if (btnEl.disabled) {
                    return;
                }

                var currentTurn = Number(btnEl.getAttribute('data-turn-index')) || 0;
                if (!currentTurn) {
                    return;
                }

                var direction = btnEl.getAttribute('data-turn-nav') === 'prev' ? -1 : 1;
                goTo(currentTurn + direction);
            });
        });
    }

    function goTo(n) {
        if (n < 1) n = 1;
        if (n > total) n = total;
        var el = document.getElementById('turn-' + n);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    function initImageViewer() {
        var viewerEl = document.getElementById('imageViewer');
        var viewerImgEl = document.getElementById('imageViewerImg');
        var closeBtnEl = document.getElementById('imageViewerClose');

        if (!viewerEl || !viewerImgEl || !closeBtnEl) {
            return;
        }

        var imageEls = document.querySelectorAll('.user-media-grid img, .user-quote-body img, .ai-answer img');
        imageEls.forEach(function(imgEl) {
            if (imgEl.dataset.viewerBound === '1') {
                return;
            }

            // В галерее ответа клик по превью должен открывать ссылку, как в Google,
            // а не модальный просмотрщик.
            if (imgEl.closest('details[data-ai-gallery="true"] a[href]')) {
                return;
            }

            // Источники: логотипы/иконки не должны открываться в просмотрщике.
            if (imgEl.closest('[data-ai-source-item="true"], details[data-ai-sources="true"]')) {
                return;
            }

            imgEl.dataset.viewerBound = '1';
            imgEl.addEventListener('click', function() {
                openViewer(imgEl);
            });
        });

        closeBtnEl.addEventListener('click', function() {
            closeViewer();
        });

        viewerEl.addEventListener('click', function(event) {
            if (event.target === viewerEl) {
                closeViewer();
            }
        });

        window.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && !viewerEl.hidden) {
                closeViewer();
            }
        });

        function openViewer(imgEl) {
            var source = imgEl.getAttribute('src') || imgEl.currentSrc || imgEl.src || '';
            if (!source) {
                return;
            }

            viewerImgEl.setAttribute('src', source);
            viewerImgEl.setAttribute('alt', imgEl.getAttribute('alt') || 'Изображение');
            viewerEl.hidden = false;
            document.body.classList.add('image-viewer-open');
        }

        function closeViewer() {
            viewerEl.hidden = true;
            viewerImgEl.setAttribute('src', '');
            document.body.classList.remove('image-viewer-open');
        }
    }
})();
<\/script>`;
  }

  gen.buildScript = buildScript;
})();
