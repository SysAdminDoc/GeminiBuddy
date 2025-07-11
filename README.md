# Gemini Prompt Panel

A highly configurable, auto-hiding, lockable, slide-out panel that remembers its position, with draggable prompts, themes, import/export, and more for Gemini.

-----

## Introduction

The **Gemini Prompt Panel** is a browser extension that enhances the user experience on the Gemini website by adding a versatile and feature-rich slide-out panel. The primary motivation behind this extension is to boost productivity by providing quick access to frequently used prompts and actions, while being unobtrusive. The core purpose is to offer a highly customizable and persistent interface for managing and using prompts efficiently.

-----

## Features

### **Configurable Slide-Out Panel**

  * **What it does:** Adds a panel that can be positioned on the left or right side of the screen.
  * **How it improves the target interface:** The panel can be locked in place or set to auto-hide, ensuring it doesn't obstruct the main content while remaining easily accessible.
  * **Example usage:**
    ```javascript
    // The panel's position and visibility are managed through CSS classes
    .gemini-prompt-panel.left-side { left: 0; }
    .gemini-prompt-panel.right-side { right: 0; }
    .gemini-prompt-panel.visible { transform: translateX(0); }
    ```

### **Prompt Management**

  * **What it does:** Allows users to create, save, and manage a list of custom prompts.
  * **How it improves the target interface:** Users can quickly insert pre-defined text into the Gemini prompt input, with an option to automatically send the prompt.
  * **Example usage:**
    ```javascript
    // Default prompts array
    const DEFAULT_PROMPTS = [
        { name: 'Explain Code', text: 'Explain this code line by line:', autoSend: false },
        { name: 'Refactor Code', text: 'Refactor this code to be more efficient:', autoSend: true }
    ];
    ```

### **Draggable Prompts**

  * **What it does:** The order of the prompt buttons can be rearranged via drag and drop.
  * **How it improves the target interface:** This allows users to prioritize and organize their prompts for a more personalized and efficient workflow.

### **Themes**

  * **What it does:** The panel supports light, dark, and auto-detect themes.
  * **How it improves the target interface:** This ensures the panel's appearance is consistent with the Gemini website's theme or the user's preference, providing a seamless visual experience.

### **Import/Export and Reset**

  * **What it does:** Users can import prompts from a JSON file, export their current prompts to a backup file, and reset the prompts to the default settings.
  * **How it improves the target interface:** This makes it easy to share prompt collections and manage custom prompts across different browsers or installations.

-----

## Installation

### Prerequisites

  * A modern web browser that supports userscripts (e.g., Chrome, Firefox, Edge).
  * A userscript manager extension such as **Tampermonkey** or **Greasemonkey**.

### Step-by-step instructions

1.  **Install a Userscript Manager:** If you don't have one, install a userscript manager like Tampermonkey for your browser.
2.  **Install the Script:**
      * Navigate to the `Gemini-Prompt-Panel-10.6.user.js` file in this repository.
      * Click the "Raw" button to view the raw file content.
      * Your userscript manager should automatically detect the userscript and prompt you to install it.
      * Click "Install" to add the Gemini Prompt Panel to your browser.
3.  **Developer Mode (for local development):**
      * Clone this repository to your local machine.
      * Open the Tampermonkey dashboard in your browser.
      * Go to the "Utilities" tab.
      * Under "File", use "Choose File" to import the `Gemini-Prompt-Panel-10.6.user.js` from your local clone.

-----

## Usage

Once installed, the Gemini Prompt Panel will automatically appear on the Gemini website (`https://gemini.google.com/*`).

  * **Activation:** Hover your mouse over the handle on the left or right edge of the screen to reveal the panel.
  * **Locking:** Click the lock icon in the panel header to keep the panel permanently visible.
  * **Using Prompts:** Click on any prompt button to insert its text into the Gemini input field. If 'auto-send' is enabled for that prompt, it will also be submitted automatically.
  * **Adding a New Prompt:** Click the "Add New Prompt" button to open a form where you can define a new prompt.

-----

## Configuration

The panel's settings can be accessed by clicking the gear icon in the header.

  * **Theme:** Choose between "Auto", "Light", and "Dark" themes.
  * **Panel Position:** Set the panel to appear on the "Left" or "Right" side of the screen.
  * **Prompt Management:**
      * **Import:** Import prompts from a `.json` file.
      * **Export:** Export your current prompts to a `gemini-prompts-backup.json` file.
      * **Reset:** Reset your prompts to the default settings.

Settings and prompts are stored in your browser's local storage using the following keys:

  * `gemini_custom_prompts_v2`
  * `gemini_panel_theme`
  * `gemini_panel_position`
  * `gemini_panel_position_top`

-----

## Screenshots

*(Here you would include screenshots or animated GIFs of the panel in action, for example: `![Panel Screenshot](screenshots/panel.png)`)*

-----

## Architecture

### File and folder layout

  * `Gemini-Prompt-Panel-10.6.user.js`: The main userscript file containing all the JavaScript code for the extension.
  * `README.md`: The file you are currently reading.

### Core modules and their responsibilities

  * **UI Builder (`build...` functions):** A set of functions responsible for creating the HTML elements for the panel, settings modal, and prompt form.
  * **State Manager:** The script uses global variables and `GM_setValue`/`GM_getValue` to manage the state of prompts, theme, and panel position.
  * **Event Handlers:** Various event listeners for mouse interactions (click, drag, hover), and a `MutationObserver` to detect when new code blocks or responses are added to the page.

-----

## API / Function Reference

### `createAndAppendPanel()`

  * **Parameters:** None
  * **Return value:** `void`
  * **Purpose:** The main function that initializes and builds the entire prompt panel, appends it to the DOM, and sets up all event listeners.

### `sendPromptToGemini(text, sendPrompt)`

  * **Parameters:**
      * `text` (string): The prompt text to be inserted.
      * `sendPrompt` (boolean): If `true`, the prompt is automatically sent.
  * **Return value:** `void`
  * **Purpose:** Injects the prompt text into the Gemini chat input and optionally clicks the send button.

### `savePrompts()`

  * **Parameters:** None
  * **Return value:** `void`
  * **Purpose:** Saves the current array of prompts to the browser's storage using `GM_setValue`.

### `loadAndDisplayPrompts()`

  * **Parameters:** None
  * **Return value:** `void`
  * **Purpose:** Loads the prompts from storage using `GM_getValue`, populates the panel with the prompt buttons.

-----

## Contributing

### How to report issues

  * Please use the GitHub issue tracker for this repository.
  * When reporting a bug, include your browser and userscript manager versions, and provide steps to reproduce the issue.

### How to submit pull requests

  * Fork the repository and create a new branch for your feature or bug fix.
  * Follow the existing coding style.
  * Submit a pull request with a clear description of your changes.

### Coding style guidelines

  * The project follows a standard JavaScript coding style.
  * Use meaningful variable and function names.
  * Comment complex sections of code.

-----

## Changelog

### [10.6] - 2025-07-12

  * Initial release of the Gemini Prompt Panel.

-----

## License

This project is licensed under the MIT License.

-----

## Disclosure

This userscript is not officially affiliated with, endorsed by, or in any way associated with Google or the Gemini project. It is an independent, open-source tool created to enhance the user experience.
