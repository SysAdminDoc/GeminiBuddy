// /src/features/canvasDownload.js

import { CANVAS_DOWNLOAD_CONFIG } from '../config.js';
import { showToast } from '../utils.js';

function triggerDownload(filename, content) {
    try {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Gemini Panel: Failed to trigger download:", error);
        showToast(`Download failed: ${error.message}`, 3000, 'error');
    }
}

function sanitizeBasename(baseName) {
    if (typeof baseName !== 'string' || baseName.trim() === "") return "gemini_download";
    let sanitized = baseName.trim()
        .replace(CANVAS_DOWNLOAD_CONFIG.INVALID_CHARS_REGEX, '_')
        .replace(/\s+/g, '_')
        .replace(/__+/g, '_')
        .replace(/^[_.-]+|[_.-]+$/g, '');
    if (!sanitized || CANVAS_DOWNLOAD_CONFIG.RESERVED_NAMES_REGEX.test(sanitized)) {
        sanitized = `_${sanitized || "file"}_`.replace(CANVAS_DOWNLOAD_CONFIG.INVALID_CHARS_REGEX, '_').replace(/\s+/g, '_');
    }
    return sanitized || "gemini_download";
}

function ensureLength(filename, maxLength = 255) {
    if (filename.length <= maxLength) return filename;
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1 || dotIndex < filename.length - 10) return filename.substring(0, maxLength);
    const base = filename.substring(0, dotIndex);
    const ext = filename.substring(dotIndex);
    const maxBaseLength = maxLength - ext.length;
    return base.substring(0, maxBaseLength > 0 ? maxBaseLength : 0) + ext;
}

function determineFilename(title) {
    const C = CANVAS_DOWNLOAD_CONFIG;
    if (!title || typeof title !== 'string' || title.trim() === "") {
        return ensureLength(`gemini_download.${C.DEFAULT_EXTENSION}`);
    }
    let trimmedTitle = title.trim();
    let baseNamePart = "", extensionPart = "";
    const stripPath = (base) => (typeof base === 'string' ? base.substring(Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\')) + 1) : base);

    const fullTitleMatch = trimmedTitle.match(C.FILENAME_WITH_EXT_REGEX);
    if (fullTitleMatch) {
        let potentialBase = stripPath(fullTitleMatch[1]);
        if (!C.INVALID_CHARS_REGEX.test(potentialBase.replace(/\s/g, '_')) && potentialBase.trim()) {
            baseNamePart = potentialBase;
            extensionPart = fullTitleMatch[2].toLowerCase();
        }
    }
    if (!extensionPart) {
        let lastMatch = null, currentMatch;
        C.SUBSTRING_FILENAME_REGEX.lastIndex = 0;
        while ((currentMatch = C.SUBSTRING_FILENAME_REGEX.exec(trimmedTitle)) !== null) { lastMatch = currentMatch; }
        if (lastMatch) {
            const substringExtMatch = lastMatch[1].match(C.FILENAME_WITH_EXT_REGEX);
            if (substringExtMatch) {
                let potentialBaseFromSub = stripPath(substringExtMatch[1]);
                if (potentialBaseFromSub.trim()) {
                    baseNamePart = potentialBaseFromSub;
                    extensionPart = substringExtMatch[2].toLowerCase();
                }
            }
        }
    }
    if (extensionPart) {
        return ensureLength(`${sanitizeBasename(baseNamePart)}.${extensionPart}`);
    }
    return ensureLength(`${sanitizeBasename(stripPath(trimmedTitle))}.${C.DEFAULT_EXTENSION}`);
}

export async function handleGlobalCanvasDownload() {
    const C = CANVAS_DOWNLOAD_CONFIG;
    const titleTextElement = document.querySelector(C.TITLE_SELECTOR);
    if (!titleTextElement) {
        showToast("No active canvas found to download.", 3000, 'error');
        return;
    }

    const panelElement = titleTextElement.closest('code-immersive-panel');
    if (!panelElement) {
        showToast("Could not locate the main canvas panel.", 3000, 'error');
        return;
    }

    const shareButton = panelElement.querySelector(C.SHARE_BUTTON_SELECTOR);
    if (!shareButton) {
        showToast("Could not find the 'Share' button in the canvas.", 3000, 'error');
        return;
    }
    shareButton.click();

    setTimeout(() => {
        const copyButton = document.querySelector(C.COPY_BUTTON_SELECTOR);
        if (!copyButton) {
            showToast("Could not find the 'Copy' button after sharing.", 3000, 'error');
            return;
        }
        copyButton.click();

        setTimeout(async () => {
            try {
                const clipboardContent = await navigator.clipboard.readText();
                if (!clipboardContent.trim()) {
                    showToast("Clipboard is empty. Nothing to download.", 2500, 'error');
                    return;
                }
                const canvasTitle = (titleTextElement.textContent || "Untitled Canvas").trim();
                const filename = determineFilename(canvasTitle);
                triggerDownload(filename, clipboardContent);
                showToast(`Downloading as "${filename}"...`, 2000, 'success');
            } catch (err) {
                console.error('Gemini Panel: Error reading from clipboard:', err);
                showToast(err.name === 'NotAllowedError' ? 'Clipboard permission denied.' : 'Failed to read clipboard.', 3000, 'error');
            }
        }, 300);
    }, 500);
}