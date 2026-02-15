/**
 * generator/styles.js
 * CSS стили итоговой страницы.
 */

(function() {
  'use strict';

  var root = window.__googleAIChatSaver;
  if (!root) return;
  var gen = root.generator;
  if (!gen) return;

  if (gen.buildStyles) {
    return;
  }

  function buildStyles() {
    return `    <style>
        @import url('https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Text:wght@400;500;700&display=swap');

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Google Sans Text', 'Google Sans', 'Roboto', 'Arial', sans-serif;
            background: #f0f2f5;
            color: #1a1a1a;
            line-height: 1.6;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px 15px 100px;
        }

        /* Блок хода */
        .turn-row {
            margin-bottom: 24px;
        }

        .turn {
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .turn-row.has-side {
            display: block;
        }

        .turn-sources {
            margin-top: 14px;
            min-width: 0;
        }

        .turn-header {
            text-align: center;
            margin-bottom: 16px;
        }

        .turn-counter {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            font-size: 22px;
            line-height: 1;
            font-weight: 500;
            letter-spacing: 0.2px;
        }

        .turn-counter-btn {
            border: none;
            background: transparent;
            padding: 0 2px;
            margin: 0;
            font: inherit;
            line-height: 1;
            cursor: pointer;
        }

        .turn-counter-btn:disabled {
            opacity: 0.28;
            pointer-events: none;
            cursor: default;
        }

        .turn-counter-arrow {
            color: #d48e40;
            font-size: 0.9em;
        }

        .turn-counter-btn.turn-counter-arrow:hover:not(:disabled) {
            color: #bc7429;
        }

        .turn-number {
            color: #3154b0;
            font-weight: 500;
        }

        /* Вопрос пользователя */
        .user-block {
            background: #eef2ff;
            border: 1px solid #dbeafe;
            border-radius: 10px;
            padding: 16px 20px;
            margin-bottom: 16px;
        }

        .user-label {
            font-size: 12px;
            font-weight: 700;
            color: #6366f1;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }

        .user-query {
            color: #3730a3;
            font-weight: 500;
            font-size: 1.05em;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        .user-query p {
            margin: 0 0 10px;
        }

        .user-query p:last-child {
            margin-bottom: 0;
        }

        .user-query pre {
            margin: 10px 0 0;
            padding: 12px 14px;
            border: 1px solid #cfe0ef;
            border-radius: 10px;
            background: #ffffff;
            overflow-x: auto;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 0.92em;
            white-space: pre;
            line-height: 1.45;
        }

        .user-quote {
            background: #ffffff;
            border: 1px solid #cfe0ef;
            border-left: 4px solid #8fb6dd;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 10px;
            color: #35516b;
        }

        .user-quote-body {
            color: #2f4357;
            font-size: 0.96em;
            line-height: 1.45;
        }

        .user-quote-body p {
            margin-bottom: 6px;
        }

        .user-quote-body a {
            color: #2a6c95;
            text-decoration: underline;
        }

        .user-quote-body img {
            display: block;
            max-width: 100%;
            height: auto;
            margin-top: 8px;
            border-radius: 10px;
            border: 1px solid #cfe0ef;
            cursor: zoom-in;
        }

        .user-media-block {
            background: #ffffff;
            border: 1px solid #cfe0ef;
            border-radius: 10px;
            padding: 12px 14px;
            margin-bottom: 12px;
        }

        .user-media-label {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.4px;
            text-transform: uppercase;
            color: #5b7690;
            margin-bottom: 8px;
        }

        .user-media-grid {
            display: flex;
            flex-wrap: wrap;
            align-items: flex-start;
            gap: 12px;
        }

        .user-media-grid img {
            display: block;
            width: auto;
            max-width: min(220px, 100%);
            max-height: 240px;
            height: auto;
            object-fit: contain;
            border-radius: 10px;
            border: 1px solid #cfe0ef;
            cursor: zoom-in;
            background: #f5f9ff;
            padding: 2px;
            transition: transform 0.18s ease;
        }

        .user-media-grid img:hover {
            transform: translateY(-1px);
        }

        /* Ответ ИИ */
        .ai-block {
            padding: 8px 0 0;
        }

        .ai-label {
            font-size: 12px;
            font-weight: 700;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .ai-answer {
            font-size: 1.05em;
            line-height: 1.7;
        }

        .ai-answer > div {
            margin-bottom: 24px;
        }

        .ai-answer > div:last-child {
            margin-bottom: 0;
        }

        .ai-answer p {
            margin-bottom: 24px;
        }

        .ai-answer strong, .ai-answer b {
            font-weight: 700;
            color: #111827;
            text-shadow: 0 0 0 currentColor;
        }

        .ai-answer a strong,
        .ai-answer a b,
        .ai-answer mark strong,
        .ai-answer mark b {
            color: inherit;
        }

        .ai-answer ul, .ai-answer ol {
            padding-left: 24px;
            margin-bottom: 12px;
        }

        .ai-answer li {
            margin-bottom: 6px;
        }

        .ai-answer h1, .ai-answer h2, .ai-answer h3 {
            margin-top: 20px;
            margin-bottom: 10px;
            color: #1e293b;
        }

        .ai-answer h2 {
            font-size: 1.3em;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
        }

        .ai-answer h3 {
            font-size: 1.22em;
            font-weight: 600;
        }

        .ai-answer pre, .ai-answer code {
            background: #f8f9fa;
            border-radius: 6px;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 0.9em;
        }

        .ai-answer code {
            padding: 2px 6px;
        }

        .ai-answer pre {
            padding: 14px 18px;
            overflow-x: auto;
            margin-bottom: 14px;
            border: 1px solid #e2e8f0;
            white-space: pre;
            line-height: 1.55;
        }

        .ai-answer pre code {
            padding: 0;
            background: none;
            display: block;
            white-space: pre;
            word-break: normal;
        }

        .ai-answer .table-shell,
        .ai-answer [data-table-shell="true"] {
            margin: 0 0 14px;
            border: 1px solid #d7e3df;
            border-radius: 12px;
            background: #f7fbf8;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
            overflow: hidden;
            width: 100%;
            max-width: 100%;
        }

        .ai-answer .table-scroll,
        .ai-answer [data-table-scroll="true"] {
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: #94ab9e #e5ece7;
            width: 100%;
            max-width: 100%;
        }

        .ai-answer .table-scroll::-webkit-scrollbar,
        .ai-answer [data-table-scroll="true"]::-webkit-scrollbar {
            height: 9px;
        }

        .ai-answer .table-scroll::-webkit-scrollbar-track,
        .ai-answer [data-table-scroll="true"]::-webkit-scrollbar-track {
            background: #e5ece7;
        }

        .ai-answer .table-scroll::-webkit-scrollbar-thumb,
        .ai-answer [data-table-scroll="true"]::-webkit-scrollbar-thumb {
            background: #94ab9e;
            border-radius: 999px;
        }

        .ai-answer table {
            border-collapse: collapse;
            width: max-content;
            min-width: 100%;
        }

        .ai-answer th, .ai-answer td {
            padding: 10px 14px;
            border: 1px solid #e2e8f0;
            text-align: left;
            vertical-align: top;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .ai-answer th {
            background: #f8fafc;
            font-weight: 700;
        }

        .ai-answer hr {
            border: none;
            height: 1px;
            background: #e2e8f0;
            margin: 20px 0;
        }

        .ai-answer img {
            display: block;
            max-width: 100%;
            height: auto;
            margin: 10px 0;
            border-radius: 8px;
            cursor: zoom-in;
        }

        body.image-viewer-open {
            overflow: hidden;
        }

        .image-viewer[hidden] {
            display: none;
        }

        .image-viewer {
            position: fixed;
            inset: 0;
            background: rgba(9, 18, 30, 0.86);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 6000;
        }

        .image-viewer-img {
            max-width: min(96vw, 1600px);
            max-height: 90vh;
            border-radius: 12px;
            box-shadow: 0 22px 50px rgba(0, 0, 0, 0.45);
            background: #0f172a;
        }

        .image-viewer-close {
            position: fixed;
            top: 14px;
            right: 16px;
            width: 44px;
            height: 44px;
            border: none;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.2);
            color: #ffffff;
            font-size: 32px;
            line-height: 1;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .image-viewer-close:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Блоки-замечания (Важное замечание, Примечание и т.п.) */
        .ai-answer [data-caveat="block"] {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
        }

        .ai-answer [data-caveat="label"] {
            color: #b45309;
            display: inline-block;
            margin-bottom: 4px;
        }

        /* Математические формулы */
        .ai-answer [data-formula] {
            font-family: 'Cambria Math', 'Times New Roman', serif;
            font-style: italic;
            background: #f8fafc;
            padding: 2px 8px;
            border-radius: 4px;
            white-space: nowrap;
        }

        .ai-answer math {
            font-family: 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif;
            font-size: 1.12em;
            line-height: 1;
            vertical-align: middle;
        }

        .ai-answer math[display="block"] {
            display: block;
            margin: 10px 0;
            overflow-x: auto;
            overflow-y: hidden;
            max-width: 100%;
        }

        /* Блоки кода с меткой языка */
        .ai-answer pre[data-lang],
        .ai-answer code[data-lang] {
            position: relative;
        }

        .ai-answer pre[data-lang]::before,
        .ai-answer code[data-lang]::before {
            content: attr(data-lang);
            position: absolute;
            top: 0;
            right: 0;
            background: #e2e8f0;
            color: #64748b;
            font-size: 11px;
            font-weight: 600;
            padding: 2px 8px;
            border-radius: 0 6px 0 6px;
            text-transform: none;
        }

        .ai-answer pre[data-lang] {
            padding-top: 28px;
        }

        /* Мобильная адаптация */
        @media (max-width: 600px) {
            .container {
                padding: 10px 8px 100px;
            }

            .turn {
                padding: 16px 14px;
                border-radius: 8px;
            }

            .turn-counter {
                font-size: 18px;
                gap: 3px;
            }

            .user-block {
                padding: 12px 14px;
            }

            .user-quote {
                padding: 9px 10px;
            }

            .ai-answer {
                font-size: 1em;
            }

            .turn-sources {
                margin-top: 12px;
            }
        }

        :root {
            --bg-top: #f6f8f3;
            --bg-bottom: #e7efe8;
            --panel-bg: #ffffff;
            --panel-border: #d7e2d6;
            --panel-shadow: 0 10px 28px rgba(25, 47, 35, 0.08);
            --text-main: #1f2d25;
            --text-muted: #5a6b60;
            --user-bg: #f3f8ff;
            --user-border: #c7daee;
            --user-label: #2f5f8d;
            --ai-label: #1f7f57;
        }

        body {
            font-family: 'Google Sans Text', 'Google Sans', 'Roboto', 'Arial', sans-serif;
            background: linear-gradient(180deg, var(--bg-top) 0%, var(--bg-bottom) 100%);
            color: var(--text-main);
        }

        .container {
            max-width: 1120px;
            padding-top: 26px;
        }

        .turn {
            border: 1px solid var(--panel-border);
            box-shadow: var(--panel-shadow);
        }

        .turn-counter-arrow {
            color: #d08b3d;
        }

        .turn-number {
            color: #2f4fa8;
        }

        .user-block {
            background: var(--user-bg);
            border-color: var(--user-border);
        }

        .user-label {
            color: var(--user-label);
        }

        .user-query {
            color: #20486a;
        }

        .user-media-block {
            background: #ffffff;
            border-color: #c7daee;
        }

        .user-media-label {
            color: #4d6983;
        }

        .ai-label {
            color: var(--ai-label);
        }

        .ai-answer {
            font-size: 1.04em;
            line-height: 1.68;
            color: #1f2b24;
        }

        .ai-answer::after {
            content: '';
            display: block;
            clear: both;
        }

        .ai-answer details[data-ai-gallery="true"],
        .ai-answer details[data-ai-sources="true"],
        .turn-sources details[data-ai-sources="true"] {
            margin: 16px 0 0;
            border: 1px solid #d8e2d6;
            border-radius: 12px;
            background: linear-gradient(180deg, #f8fbf8 0%, #eff6ef 100%);
            overflow: hidden;
        }

        .ai-answer details[data-ai-gallery="true"] + details[data-ai-sources="true"],
        .ai-answer details[data-ai-sources="true"] + details[data-ai-gallery="true"] {
            margin-top: 12px;
        }

        .turn-sources details[data-ai-sources="true"] {
            margin: 0;
            width: 100%;
            min-width: 0;
            max-width: 100%;
            max-height: none;
            overflow-x: hidden;
        }

        .ai-answer details[data-ai-gallery="true"] > summary,
        .ai-answer details[data-ai-sources="true"] > summary,
        .turn-sources details[data-ai-sources="true"] > summary {
            list-style: none;
            cursor: pointer;
            padding: 10px 14px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.2px;
            color: #2f5a43;
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: none;
        }

        .ai-answer details[data-ai-gallery="true"] > summary::-webkit-details-marker,
        .ai-answer details[data-ai-sources="true"] > summary::-webkit-details-marker,
        .turn-sources details[data-ai-sources="true"] > summary::-webkit-details-marker {
            display: none;
        }

        .ai-answer details[data-ai-gallery="true"] > summary::after,
        .ai-answer details[data-ai-sources="true"] > summary::after,
        .turn-sources details[data-ai-sources="true"] > summary::after {
            content: '▾';
            font-size: 14px;
            color: #4f7160;
            transform: rotate(-90deg);
            transition: transform 0.2s ease;
        }

        .ai-answer details[data-ai-gallery="true"][open] > summary::after,
        .ai-answer details[data-ai-sources="true"][open] > summary::after,
        .turn-sources details[data-ai-sources="true"][open] > summary::after {
            transform: rotate(0deg);
        }

        .ai-answer [data-ai-gallery-content="true"] {
            column-width: 220px;
            column-gap: 12px;
            padding: 0 14px 14px;
        }

        .ai-answer [data-ai-gallery-item="true"] {
            position: relative;
            border: 1px solid #d8e2d6;
            border-radius: 10px;
            background: #ffffff;
            overflow: hidden;
            min-width: 0;
            break-inside: avoid;
            -webkit-column-break-inside: avoid;
            page-break-inside: avoid;
            display: inline-block;
            width: 100%;
            margin: 0 0 12px;
        }

        .ai-answer [data-ai-gallery-item="true"]:hover {
            border-color: #bcd1c1;
            box-shadow: 0 6px 18px rgba(31, 61, 47, 0.08);
        }

        .ai-answer [data-ai-gallery-item="true"] a {
            display: flex;
            flex-direction: column;
            width: 100%;
            color: inherit;
            text-decoration: none;
        }

        .ai-answer [data-ai-gallery-thumb="true"] {
            display: block;
            position: relative;
            width: 100%;
            overflow: hidden;
            background: #ffffff;
        }

        .ai-answer [data-ai-gallery-thumb="true"] img {
            display: block;
            width: 100%;
            height: auto;
            border-radius: 0;
            border: none;
            background: #ffffff;
            padding: 0;
            margin: 0;
            cursor: zoom-in;
        }

        .ai-answer [data-ai-gallery-item="true"] a [data-ai-gallery-thumb="true"] img {
            cursor: pointer;
        }

        .ai-answer [data-ai-gallery-item="true"] > img {
            display: block;
            width: 100%;
            aspect-ratio: 4 / 3;
            height: auto;
            object-fit: cover;
            border-radius: 0;
            border: none;
            background: #ffffff;
            padding: 0;
            margin: 0;
            cursor: zoom-in;
        }

        .ai-answer [data-ai-gallery-meta="true"] {
            display: flex;
            flex-direction: column;
            gap: 4px;
            padding: 8px 10px 10px;
            min-width: 0;
            border-top: 1px solid #edf3ef;
        }

        .ai-answer [data-ai-gallery-title="true"] {
            font-size: 12.5px;
            font-weight: 600;
            line-height: 1.25;
            color: #1f3d2f;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            overflow-wrap: anywhere;
            max-height: 34px;
        }

        .ai-answer [data-ai-gallery-site="true"] {
            font-size: 11.5px;
            color: #5f6368;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            overflow-wrap: anywhere;
            max-height: 16px;
        }

        @media (max-width: 520px) {
            .ai-answer [data-ai-gallery-content="true"] {
                column-width: 160px;
                column-gap: 10px;
            }
        }

        .ai-answer [data-ai-gallery-item="true"] a:hover [data-ai-gallery-title="true"] {
            text-decoration: underline;
        }

        .ai-answer [data-ai-sources-list="true"] {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0 14px 14px;
        }

        .turn-sources [data-ai-sources-list="true"] {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 0 12px 12px;
            width: 100%;
            max-width: 100%;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            overscroll-behavior: contain;
            scrollbar-gutter: stable;
            scrollbar-width: thin;
            scrollbar-color: #94ab9e #e5ece7;
        }

        .turn-sources [data-ai-sources-list="true"]::-webkit-scrollbar {
            width: 9px;
        }

        .turn-sources [data-ai-sources-list="true"]::-webkit-scrollbar-track {
            background: #e5ece7;
            border-radius: 999px;
        }

        .turn-sources [data-ai-sources-list="true"]::-webkit-scrollbar-thumb {
            background: #94ab9e;
            border-radius: 999px;
        }

        .ai-answer [data-ai-source-item="true"],
        .turn-sources [data-ai-source-item="true"] {
            background: #ffffff;
            border: 1px solid #d8e2d6;
            border-radius: 10px;
            padding: 10px;
            min-width: 0;
            max-width: 100%;
            overflow-wrap: anywhere;
            word-break: break-word;
            display: grid;
            grid-template-columns: 36px minmax(0, 1fr);
            column-gap: 10px;
            row-gap: 4px;
            align-items: start;
        }

        .ai-answer [data-ai-source-item="true"][data-ai-source-has-thumb="true"],
        .turn-sources [data-ai-source-item="true"][data-ai-source-has-thumb="true"] {
            grid-template-columns: 36px minmax(0, 1fr) 74px;
        }

        .turn-sources [data-ai-source-item="true"] {
            padding: 9px;
            min-width: 0;
            overflow: visible;
        }

        .ai-answer [data-ai-source-item="true"] img[data-ai-source-icon="true"],
        .turn-sources [data-ai-source-item="true"] img[data-ai-source-icon="true"] {
            grid-column: 1;
            grid-row: 1 / span 2;
            width: 36px;
            height: 36px;
            max-width: 36px;
            max-height: 36px;
            object-fit: contain;
            border: 1px solid #d8e2d6;
            border-radius: 9px;
            background: #ffffff;
            padding: 2px;
            margin: 0;
            cursor: default;
        }

        .ai-answer [data-ai-source-item="true"] img[data-ai-source-thumb="true"],
        .turn-sources [data-ai-source-item="true"] img[data-ai-source-thumb="true"] {
            grid-column: 3;
            grid-row: 1 / span 2;
            width: 74px;
            height: 56px;
            max-width: 74px;
            max-height: 56px;
            object-fit: cover;
            border: 1px solid #d8e2d6;
            border-radius: 12px;
            background: #ffffff;
            padding: 0;
            margin: 0;
            cursor: default;
        }

        .ai-answer [data-ai-source-item="true"] a,
        .turn-sources [data-ai-source-item="true"] a {
            grid-column: 2;
            display: block;
            width: 100%;
            max-width: 100%;
            font-weight: 600;
            line-height: 1.32;
            margin: 0;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
        }

        .ai-answer [data-ai-source-item="true"] p,
        .turn-sources [data-ai-source-item="true"] p {
            grid-column: 2;
            margin: 0;
            color: #41574a;
            font-size: 0.9em;
            line-height: 1.38;
            white-space: normal;
            overflow-wrap: anywhere;
            word-break: break-word;
        }

        .ai-answer a {
            color: #2a6c95;
        }

        .ai-answer mark {
            background: none;
            color: #1a0dab;
            text-decoration: underline;
            text-decoration-color: #1a0dab;
            text-underline-offset: 2px;
        }

        .ai-answer > div > div > div {
            margin-bottom: 0;
        }

        .ai-answer > div > div > div > div {
            margin-bottom: 8px;
        }

        .ai-answer > div > div > div > div:last-child {
            margin-bottom: 0;
        }

        @media (max-width: 860px) {
            .turn-row.has-side {
                display: block;
            }

            .turn-sources details[data-ai-sources="true"] {
                max-height: none !important;
            }

            .ai-answer [data-ai-sources-list="true"] {
                padding-left: 12px;
                padding-right: 12px;
            }

            .user-media-grid {
                gap: 10px;
            }
        }

        @media (max-width: 700px) {
            .ai-answer [data-ai-gallery-content="true"] {
                grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                gap: 8px;
                padding-left: 10px;
                padding-right: 10px;
            }

            .ai-answer [data-ai-sources-list="true"] {
                padding-left: 10px;
                padding-right: 10px;
            }

            .ai-answer [data-ai-source-item="true"],
            .turn-sources [data-ai-source-item="true"] {
                grid-template-columns: 32px minmax(0, 1fr);
                column-gap: 9px;
            }

            .ai-answer [data-ai-source-item="true"][data-ai-source-has-thumb="true"],
            .turn-sources [data-ai-source-item="true"][data-ai-source-has-thumb="true"] {
                grid-template-columns: 32px minmax(0, 1fr) 68px;
            }

            .ai-answer [data-ai-source-item="true"] img[data-ai-source-icon="true"],
            .turn-sources [data-ai-source-item="true"] img[data-ai-source-icon="true"] {
                width: 32px;
                height: 32px;
                max-width: 32px;
                max-height: 32px;
                border-radius: 8px;
            }

            .ai-answer [data-ai-source-item="true"] img[data-ai-source-thumb="true"],
            .turn-sources [data-ai-source-item="true"] img[data-ai-source-thumb="true"] {
                width: 68px;
                height: 52px;
                max-width: 68px;
                max-height: 52px;
                border-radius: 11px;
            }
            
            .turn-sources [data-ai-sources-list="true"] {
                padding-left: 10px;
                padding-right: 10px;
            }

            .user-media-grid {
                gap: 8px;
            }

            .user-media-grid img {
                max-width: min(200px, 100%);
                max-height: 200px;
            }
        }

        @media (min-width: 980px) {
            .turn-row.has-side {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 320px;
                gap: 18px;
                align-items: stretch;
            }

            .turn-sources {
                margin-top: 0;
                align-self: stretch;
            }
        }
    </style>`;
  }

  gen.buildStyles = buildStyles;
})();
