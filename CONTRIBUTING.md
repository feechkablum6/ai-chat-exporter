# Contributing to Google AI Chat Saver

Thank you for your interest in contributing to Google AI Chat Saver! This guide will help you set up your development environment and understand the coding standards.

## Prerequisites

-   A Chromium-based browser (Google Chrome, Edge, Brave, etc.).
-   A text editor or IDE (VS Code is recommended).
-   Basic knowledge of HTML, CSS, and Vanilla JavaScript.

## Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/google-ai-chat-saver.git
    cd google-ai-chat-saver
    ```

2.  **Load the Extension**:
    1.  Open Chrome and navigate to `chrome://extensions/`.
    2.  Enable **Developer mode** (toggle in the top right).
    3.  Click **Load unpacked**.
    4.  Select the root directory of the cloned repository.

3.  **Verify**:
    -   You should see the "Google AI Chat Saver" icon in your browser toolbar.
    -   Open a Google AI Mode chat to test functionality.

## Development Workflow

1.  **Make Changes**: Modify the files in `parser/`, `generator/`, or `popup.js` as needed.
2.  **Reload the Extension**:
    -   Go back to `chrome://extensions/`.
    -   Click the **refresh icon** on the Google AI Chat Saver card.
3.  **Reload the Page**:
    -   You *must* refresh the Google AI chat page for the updated content scripts to take effect.
4.  **Test**:
    -   Click the extension icon and try saving a chat.
    -   Inspect the generated HTML/PHP file to verify your changes.

## Code Standards

### No Build Tools
This project intentionally avoids build tools (Webpack, Rollup, etc.) to keep the setup simple and the code transparent. All files are standard JavaScript that run directly in the browser.

### Global Namespace Pattern
Since content scripts share the global `window` object with the page (to some extent) and with each other when injected sequentially, we use a strict namespace pattern to avoid collisions.

-   **Namespace**: `window.__googleAIChatSaver`
-   **Structure**:
    -   `parser/` modules attach to `window.__googleAIChatSaver.parser`.
    -   `generator/` modules attach to `window.__googleAIChatSaver.generator`.
-   **Example Module**:
    ```javascript
    (function() {
      'use strict';

      var root = window.__googleAIChatSaver;
      if (!root) return;
      var parser = root.parser;
      if (!parser) return;

      // Prevent re-definition
      if (parser.myNewFunction) return;

      function myNewFunction() {
        // ...
      }

      parser.myNewFunction = myNewFunction;
    })();
    ```

### Vanilla JavaScript
-   Do not use ES6 modules (`import`/`export`) as they are not supported in the same way for injected content scripts without a bundler.
-   Use `var` or `function` scope to keep variables local.
-   Avoid modern syntax that might not be supported in older browser versions unless necessary (though modern Chrome is the target).

## Adding New Features

### Adding a New Parser Rule
1.  Create a new file in `parser/` (e.g., `parser/my-feature.js`).
2.  Implement your logic using the namespace pattern.
3.  Register the new file in `popup.js`:
    -   Add the path `'parser/my-feature.js'` to the `files` array in the `saveChat` function.
    -   **Important**: Order matters! Ensure your module is loaded before `parser.js` but after `shared/ns.js`.

### Modifying the Output Style
1.  Edit `generator/styles.js`.
2.  This file contains a large template string with the CSS.
3.  Add your CSS rules there.

## Reporting Issues
If you encounter bugs or have feature requests, please open an issue on the repository with:
-   A description of the problem.
-   Steps to reproduce.
-   Example chat content (if possible).
