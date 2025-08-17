// /src/main.js

import { state, loadSettings, loadHistory } from './state.js';
import { GM_addStyle } from './GM_wrappers.js';
import { cssStyles } from './styles.js';
import { icons } from './icons.js';
import { buildSettingsUI } from './ui/settingsUI.js';
import { buildMainUI, renderMiniPanel } from './ui/mainPanel.js';
import { showToast, showCountdownToast } from './utils.js';
import { handleGlobalCanvasDownload } from './features/canvasDownload.js';

// --- EXECUTION GUARD ---
if (window.geminiPanelEnhanced) {
    console.log('Gemini Prompt Panel Enhancer is already running.');
} else {
    window.geminiPanelEnhanced = true;
    console.log('Gemini Prompt Panel Enhancer v35.0 loaded');

    function initializeCopyActions() {
        state.copyResponseButton.addEventListener('click', async () => {
            const allResponses = document.querySelectorAll('response-container');
            if (allResponses.length > 0) {
                const latestResponse = allResponses[allResponses.length - 1];
                const textContainer = latestResponse.querySelector('div.markdown.prose');
                if (textContainer && navigator.clipboard) {
                    try {
                        await navigator.clipboard.writeText(textContainer.textContent);
                        showToast('Latest response copied!');
                    } catch (err) {
                        console.error('Failed to copy text: ', err);
                        showToast('Could not copy response.', 3000, 'error');
                    }
                } else {
                    showToast('Response content or clipboard not available.', 3000, 'error');
                }
            } else {
                showToast('No response found to copy.', 3000, 'error');
            }
        });

        state.copyCodeButton.addEventListener('click', () => {
            const allCodeBlocks = document.querySelectorAll('code-block');
            if (allCodeBlocks.length > 0) {
                const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                if (copyBtn) {
                    copyBtn.click();
                    showToast('Code block copied!');
                } else {
                    showToast('Copy button not found in the latest code block.', 3000, 'error');
                }
            } else {
                showToast('No code block found to copy.', 3000, 'error');
            }
        });

        state.downloadCanvasButton.addEventListener('click', handleGlobalCanvasDownload);
    }

    function initializeGenerationObserver() {
        const setupObserver = () => {
            const sendButton = document.querySelector('button.send-button');
            if (sendButton) {
                if (state.generationObserver) state.generationObserver.disconnect();
                state.generationObserver = new MutationObserver(mutations => {
                    if (!state.settings.autoCopyCodeOnCompletion) return;
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'class') {
                            const target = mutation.target;
                            const hasStopClass = target.classList.contains('stop');
                            if (hasStopClass) {
                                state.isGenerating = true;
                            } else if (state.isGenerating) {
                                state.isGenerating = false;
                                setTimeout(() => {
                                    const allCodeBlocks = document.querySelectorAll('code-block');
                                    if (allCodeBlocks.length > 0) {
                                        const latestCodeBlock = allCodeBlocks[allCodeBlocks.length - 1];
                                        const copyBtn = latestCodeBlock.querySelector('button[aria-label="Copy code"]');
                                        if (copyBtn) {
                                            copyBtn.click();
                                            showCountdownToast("Auto-copied Code to Clipboard", 5000);
                                        }
                                    }
                                }, 500);
                            }
                        }
                    });
                });
                state.generationObserver.observe(sendButton, { attributes: true, attributeFilter: ['class'] });
            }
        };
        const sendButtonObserver = new MutationObserver((mutations, observer) => {
            if (document.querySelector('button.send-button')) {
                setupObserver();
                observer.disconnect();
            }
        });
        sendButtonObserver.observe(document.body, { childList: true, subtree: true });
    }

    async function init() {
        GM_addStyle(cssStyles);
        await loadSettings();
        await loadHistory();
        buildSettingsUI(); // This now builds the settings panel and handle
        
        const checkInterval = setInterval(async () => {
            const chatInterface = document.querySelector('main .chat-history');
            const promptInputArea = document.querySelector('main rich-textarea');
            if (chatInterface && promptInputArea) {
                clearInterval(checkInterval);

                await buildMainUI(); // Builds the main panel and its UI elements
                initializeCopyActions(); // Attaches event listeners to copy buttons in the panel
                initializeGenerationObserver(); // Sets up the observer for auto-copying code

                // Create and inject the floating mini panel
                state.floatingMiniPanel = document.createElement('div');
                state.floatingMiniPanel.id = 'floating-mini-panel';
                const miniPanelContent = document.createElement('div');
                miniPanelContent.className = 'prompt-group-container';
                state.floatingMiniPanel.appendChild(miniPanelContent);

                state.miniPanelTrigger = document.createElement('button');
                state.miniPanelTrigger.id = 'mini-panel-trigger';
                state.miniPanelTrigger.title = 'Open Quick Prompts';
                state.miniPanelTrigger.appendChild(icons.panelIcon.cloneNode(true));
                state.miniPanelTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    state.floatingMiniPanel.classList.toggle('visible');
                });

                promptInputArea.style.position = 'relative';
                promptInputArea.append(state.miniPanelTrigger, state.floatingMiniPanel);
                state.miniPanelTrigger.style.display = state.settings.enableMiniMode ? 'flex' : 'none';
                renderMiniPanel();

                document.addEventListener('click', (e) => {
                    if (!state.floatingMiniPanel.contains(e.target) && !state.miniPanelTrigger.contains(e.target)) {
                        state.floatingMiniPanel.classList.remove('visible');
                    }
                });
            }
        }, 500);
    }

    // --- BOOTSTRAP ---
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        window.addEventListener('load', init);
    }
}