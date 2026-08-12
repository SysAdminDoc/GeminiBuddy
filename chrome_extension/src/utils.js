// /src/utils.js

export function showToast(message, duration = 3000, type = 'success') {
    const toastId = 'userscript-toast-' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = 'toast-notification';
    toastEl.classList.add(type);
    toastEl.textContent = message;
    document.body.appendChild(toastEl);
    setTimeout(() => toastEl.classList.add('show'), 10);
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl.remove(), 500);
    }, duration);
}

export function showCountdownToast(message, duration = 5000) {
    const toastId = 'userscript-toast-' + Date.now();
    const toastEl = document.createElement('div');
    toastEl.id = toastId;
    toastEl.className = 'toast-notification success';
    document.body.appendChild(toastEl);

    let seconds = Math.floor(duration / 1000);
    const updateText = () => { toastEl.textContent = `${message} (${seconds})`; };
    updateText();
    setTimeout(() => toastEl.classList.add('show'), 10);

    const timer = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            updateText();
        } else {
            clearInterval(timer);
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 500);
        }
    }, 1000);
}

export function createButtonWithIcon(txt, ic) {
    const b = document.createElement('button');
    b.className = 'gemini-prompt-panel-button';
    if (ic) b.appendChild(ic.cloneNode(true));
    if (txt) b.appendChild(document.createTextNode(txt));
    return b;
}

export function getModalFocusableElements(modal) {
    return Array.from(modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
}

export function installModalAccessibility(modal, { destructive = false, visibleClass = '' } = {}) {
    if (!modal || modal.dataset.geminiBuddyAccessible === 'true') return modal;
    modal.dataset.geminiBuddyAccessible = 'true';
    modal.dataset.destructive = destructive ? 'true' : 'false';
    modal.setAttribute('role', destructive ? 'alertdialog' : 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-hidden', 'true');
    const title = modal.querySelector('.modal-title');
    if (title) {
        if (!title.id) title.id = `${modal.id || 'geminibuddy-modal'}-title-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        modal.setAttribute('aria-labelledby', title.id);
    }
    const content = modal.querySelector('.modal-content, #settings-panel');
    if (content && !content.hasAttribute('tabindex')) content.setAttribute('tabindex', '-1');
    modal.querySelectorAll('.modal-close-btn').forEach(button => {
        if (!button.type) button.type = 'button';
        if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', 'Close dialog');
    });
    let previousFocus = null;

    modal._geminiBuddyOpen = () => {
        previousFocus = document.activeElement;
        if (visibleClass) modal.classList.add(visibleClass);
        else modal.style.display = 'flex';
        modal.setAttribute('aria-hidden', 'false');
        const firstFocusable = getModalFocusableElements(modal)[0] || content;
        if (firstFocusable && typeof firstFocusable.focus === 'function') firstFocusable.focus();
    };
    modal._geminiBuddyClose = () => {
        if (visibleClass) modal.classList.remove(visibleClass);
        else modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
        previousFocus = null;
    };
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !destructive) {
            event.preventDefault();
            modal._geminiBuddyClose();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = getModalFocusableElements(modal);
        if (!focusable.length) {
            event.preventDefault();
            content?.focus();
            return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    modal.addEventListener('click', event => {
        if (event.target === modal && !destructive) modal._geminiBuddyClose();
    });
    return modal;
}

export function openAccessibleModal(modal) {
    if (modal?._geminiBuddyOpen) modal._geminiBuddyOpen();
    else if (modal) modal.style.display = 'flex';
}

export function closeAccessibleModal(modal) {
    if (modal?._geminiBuddyClose) modal._geminiBuddyClose();
    else if (modal) modal.style.display = 'none';
}

export function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function showTextInputDialog({ title, message = '', label = 'Value', initialValue = '', confirmLabel = 'Save', cancelLabel = 'Cancel' }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.id = 'geminibuddy-text-input-dialog';
        overlay.className = 'modal-overlay';
        const content = document.createElement('div');
        content.className = 'modal-content';
        const header = document.createElement('div');
        header.className = 'modal-header';
        const heading = document.createElement('h2');
        heading.className = 'modal-title';
        heading.textContent = title;
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'modal-close-btn';
        closeButton.setAttribute('aria-label', 'Close dialog');
        closeButton.textContent = '×';
        header.append(heading, closeButton);
        const body = document.createElement('div');
        body.className = 'modal-body';
        if (message) {
            const copy = document.createElement('p');
            copy.textContent = message;
            body.appendChild(copy);
        }
        const inputLabel = document.createElement('label');
        inputLabel.htmlFor = 'geminibuddy-text-input';
        inputLabel.textContent = label;
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'geminibuddy-text-input';
        input.value = initialValue;
        const actions = document.createElement('div');
        actions.className = 'button-group';
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'gemini-prompt-panel-button';
        cancelButton.textContent = cancelLabel;
        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'gemini-prompt-panel-button copy-btn';
        saveButton.textContent = confirmLabel;
        actions.append(cancelButton, saveButton);
        body.append(inputLabel, input, actions);
        content.append(header, body);
        overlay.appendChild(content);
        installModalAccessibility(overlay);

        let settled = false;
        const finish = value => {
            if (settled) return;
            settled = true;
            closeAccessibleModal(overlay);
            overlay.remove();
            resolve(value);
        };
        saveButton.addEventListener('click', () => finish(input.value.trim()));
        cancelButton.addEventListener('click', () => finish(null));
        closeButton.addEventListener('click', () => finish(null));
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                finish(input.value.trim());
            }
        });
        overlay.addEventListener('keydown', event => {
            if (event.key === 'Escape') finish(null);
        });
        overlay.addEventListener('click', event => {
            if (event.target === overlay) finish(null);
        });
        document.body.appendChild(overlay);
        openAccessibleModal(overlay);
        input.focus();
        input.select();
    });
}

export function showDecisionDialog({ title, message, confirmLabel = 'Continue', cancelLabel = 'Cancel', destructive = false }) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.id = 'geminibuddy-decision-dialog';
        overlay.className = 'modal-overlay';

        const content = document.createElement('div');
        content.className = 'modal-content';
        const header = document.createElement('div');
        header.className = 'modal-header';
        const heading = document.createElement('h2');
        heading.className = 'modal-title';
        heading.id = 'geminibuddy-decision-title';
        heading.textContent = title;
        header.appendChild(heading);
        const body = document.createElement('div');
        body.className = 'modal-body';
        const copy = document.createElement('p');
        copy.textContent = message;
        body.appendChild(copy);
        const actions = document.createElement('div');
        actions.className = 'button-group';
        const cancelButton = createButtonWithIcon(cancelLabel, null);
        cancelButton.type = 'button';
        const confirmButton = createButtonWithIcon(confirmLabel, null);
        confirmButton.type = 'button';
        confirmButton.classList.add('copy-btn');
        if (destructive) confirmButton.classList.add('error');
        actions.append(cancelButton, confirmButton);
        content.append(header, body, actions);
        overlay.appendChild(content);
        installModalAccessibility(overlay, { destructive });
        overlay.setAttribute('aria-labelledby', 'geminibuddy-decision-title');

        let settled = false;
        const finish = result => {
            if (settled) return;
            settled = true;
            document.removeEventListener('keydown', onKeyDown);
            closeAccessibleModal(overlay);
            overlay.remove();
            resolve(result);
        };
        const onKeyDown = event => {
            if (event.key === 'Escape' && !destructive) finish(false);
        };
        cancelButton.addEventListener('click', () => finish(false));
        confirmButton.addEventListener('click', () => finish(true));
        overlay.addEventListener('click', event => {
            if (event.target === overlay && !destructive) finish(false);
        });
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        openAccessibleModal(overlay);
    });
}

export function showFatalErrorDialog(error) {
    const overlay = document.createElement('div');
    overlay.id = 'geminibuddy-fatal-dialog';
    overlay.className = 'modal-overlay';
    const content = document.createElement('div');
    content.className = 'modal-content';
    const heading = document.createElement('h2');
    heading.className = 'modal-title';
    heading.textContent = 'GeminiBuddy could not load';
    const body = document.createElement('div');
    body.className = 'modal-body';
    const message = document.createElement('p');
    message.textContent = 'The prompt panel hit an error. Check the browser console for details, then reload Gemini to try again.';
    const closeButton = createButtonWithIcon('Dismiss', null);
    closeButton.type = 'button';
    body.append(message, closeButton);
    content.append(heading, body);
    overlay.appendChild(content);
    installModalAccessibility(overlay, { destructive: false });
    closeButton.addEventListener('click', () => { closeAccessibleModal(overlay); overlay.remove(); });
    document.body.appendChild(overlay);
    openAccessibleModal(overlay);
    if (error) console.error('GeminiBuddy fatal dialog:', error);
}
