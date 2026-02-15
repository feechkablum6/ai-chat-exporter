# Google AI Chat Saver

**Google AI Chat Saver** is a Chrome extension that allows you to save your Google AI Mode chat sessions as clean, standalone HTML or PHP files. It is designed to preserve the structure, formatting, code blocks, and images of your conversations.

## Features

-   **Standalone HTML/PHP Export**: Save your chats as a single `.html` or `.php` file that you can view offline or host on a server.
-   **Image Embedding**: All images (including those in `srcset` and canvas elements) are converted to Data URLs and embedded directly into the file. No external dependencies or broken image links.
-   **Code Block Preservation**: Accurately captures code blocks, detects programming languages (even from comments), and applies clean styling.
-   **Math Support**: Handles MathML and converts LaTeX formulas into readable text representations, ensuring mathematical content remains accessible.
-   **Clean UI**: The generated file features a responsive design with a built-in image viewer, side panels for sources, and easy navigation between turns.
-   **Privacy Focused**: All processing happens locally in your browser. No data is sent to external servers.

## Installation

This extension is currently designed to be loaded in **Developer Mode**.

1.  Clone or download this repository to your local machine.
2.  Open Google Chrome (or any Chromium-based browser like Edge or Brave).
3.  Navigate to `chrome://extensions/`.
4.  Enable **Developer mode** in the top-right corner.
5.  Click **Load unpacked** in the top-left corner.
6.  Select the folder containing the extension files (the root directory of this repo).

## Usage

1.  Open a Google AI Mode chat (e.g., on google.com or google.ru).
2.  Make sure the chat content is fully loaded.
3.  Click the **Google AI Chat Saver** extension icon in your browser toolbar.
4.  Choose your preferred format:
    -   **Сохранить в HTML**: Creates a standalone HTML file.
    -   **Сохранить в PHP**: Wraps the HTML in a minimal PHP header (useful for hosting).
5.  Wait for the "Extraction..." process to complete.
6.  The file will automatically download with a timestamped filename (e.g., `google_ai_chat_1715423000000.html`).

## Project Structure

The project is organized into modular vanilla JavaScript files to avoid build steps while keeping the code maintainable.

-   **`manifest.json`**: Extension configuration (permissions, icons, content scripts).
-   **`popup.html` / `popup.js`**: The extension's popup interface logic.
-   **`shared/`**: Shared utilities (namespace setup).
-   **`parser/`**: Modules responsible for analyzing the DOM and extracting chat data.
    -   `core.js`: Main entry point for parsing logic.
    -   `clean.js`, `code.js`, `images.js`, `math.js`, etc.: Specialized parsers.
-   **`generator/`**: Modules responsible for building the output HTML file.
    -   `core.js`: Assembles the final page.
    -   `turns.js`, `styles.js`, `runtime.js`: Rendering logic and embedded assets.

## License

This project is open-source. Feel free to contribute or modify it for your needs.
