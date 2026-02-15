# Architecture Overview

**Google AI Chat Saver** is built with a modular vanilla JavaScript architecture designed for direct execution in the browser environment (content scripts). It avoids complex build steps (like Webpack or Rollup) while maintaining code organization through a global namespace pattern.

## Core Design Principles

1.  **Modular Vanilla JS**: The codebase is split into logical modules (e.g., `parser/images.js`, `generator/turns.js`) instead of a single monolithic file.
2.  **Global Namespace**: To facilitate communication between modules without ES imports (which are tricky in content scripts), all code attaches itself to a shared global object: `window.__googleAIChatSaver`.
    -   See `shared/ns.js` for the initialization logic.
3.  **Direct DOM Injection**: The extension injects scripts directly into the page context using `chrome.scripting.executeScript` when the user triggers an action. This ensures the parser has full access to the page's DOM, including shadow roots and complex elements.

## System Components

### 1. Extension Interface (`popup.html`, `popup.js`)
-   **Role**: The user entry point.
-   **Functionality**:
    -   Detects the active tab.
    -   Cleans up previous global namespaces (`window.__googleAIChatSaver`) to ensure a fresh state.
    -   Injects the full suite of scripts in the correct dependency order:
        1.  `shared/ns.js`
        2.  `parser/*.js` modules
        3.  `parser.js` (entry)
        4.  `generator/*.js` modules
        5.  `generator.js` (entry)
    -   Executes `runParseAndGenerate()` in the page context.
    -   Handles the final file download (HTML or PHP wrapper).

### 2. The Parser (`parser/`)
The parser is responsible for traversing the Google AI chat DOM and extracting structured data ("turns").

-   **Entry Point**: `parser.js` exposes `window.__googleAIChatParser`.
-   **Core Logic (`parser/core.js`)**:
    -   Identifies "turn containers" (user question + AI answer pairs) using a list of known CSS selectors (`constants.js`).
    -   Orchestrates the extraction of the question text, quoted content, and the AI's answer HTML.
    -   Implements fallback strategies for single-turn views or different UI variations.
-   **Key Modules**:
    -   **`clean.js`**: Removes UI artifacts like "Regenerate" buttons, feedback forms, and legal disclaimers.
    -   **`code.js`**: Detects code blocks, extracts language metadata (often hidden in comments like `Sv6Kpe[...]`), and normalizes indentation.
    -   **`images.js`**:
        -   Extracts high-resolution image URLs from `srcset` attributes.
        -   Converts images and canvas elements to Base64 Data URLs to make the output file standalone.
        -   Handles user-uploaded images and AI-generated imagery.
    -   **`math.js`**:
        -   Processes MathML elements.
        -   Converts LaTeX formulas (often found in `img` tags with `data-xpm-latex`) into readable text representations (e.g., `\frac{a}{b}` -> `(a)/(b)`).
    -   **`text.js` / `dom.js`**: Utilities for text normalization (whitespace handling) and DOM traversal.
    -   **`semantics.js`**: Helps identify semantic structures within the chat.

### 3. The Generator (`generator/`)
The generator takes the array of "turn" objects produced by the parser and constructs a complete HTML document.

-   **Entry Point**: `generator.js` exposes `window.__googleAIChatGenerator`.
-   **Core Logic (`generator/core.js`)**:
    -   Assembles the final HTML structure: `<!DOCTYPE html><html>...</html>`.
    -   Injects the CSS styles and runtime JavaScript.
-   **Key Modules**:
    -   **`turns.js`**: Renders the HTML for each chat turn, including the user's question, any attachments/quotes, and the AI's response.
    -   **`styles.js`**: Contains the full CSS stylesheet for the generated page, ensuring it looks good offline.
    -   **`runtime.js`**: Contains the JavaScript code *embedded* in the generated file. This script handles:
        -   The image viewer modal.
        -   Collapsible side panels for sources.
        -   Turn navigation buttons.
    -   **`viewer.js`**: Provides the HTML markup for the image viewer modal.
    -   **`quote.js`**: Renders user quotes and attached media in a standardized format.

## Data Flow

1.  **User Action**: Click "Save HTML" in Popup.
2.  **Injection**: `popup.js` injects all scripts into the active tab.
3.  **Parsing**:
    -   `parser.js` -> `parser/core.js` scans the DOM.
    -   DOM elements are cleaned (`parser/clean.js`) and processed (`parser/code.js`, `parser/math.js`).
    -   **Output**: An array of `Turn` objects:
        ```javascript
        [
          {
            question: "User query text",
            questionHtml: "...",
            quoteHtml: "...", // Optional quoted context/images
            answerHtml: "..."  // Cleaned AI response
          },
          ...
        ]
        ```
4.  **Generation**:
    -   `generator.js` -> `generator/core.js` receives the `Turn` array.
    -   Iterates through turns, generating HTML blocks (`generator/turns.js`).
    -   Combines blocks with `styles.js` and `runtime.js`.
    -   **Output**: A single large HTML string.
5.  **Download**:
    -   The HTML string is sent back to `popup.js`.
    -   `popup.js` creates a `Blob` and triggers a download.

## Directory Structure

```text
/
├── manifest.json       # Extension config
├── popup.html          # Popup UI
├── popup.js            # Popup logic
├── shared/
│   └── ns.js           # Namespace setup
├── parser/             # Parsing logic
│   ├── core.js         # Main parser logic
│   ├── clean.js        # DOM cleaning
│   ├── code.js         # Code block handling
│   ├── images.js       # Image processing
│   ├── math.js         # Math formula handling
│   └── ... (utils)
└── generator/          # HTML generation
    ├── core.js         # Main generator logic
    ├── turns.js        # Turn rendering
    ├── styles.js       # CSS for output
    ├── runtime.js      # JS for output
    └── ... (utils)
```
