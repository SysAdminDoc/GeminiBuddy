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

export function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

export function showDecisionDialog({ title, message, confirmLabel = 'Continue', cancelLabel = 'Cancel', destructive = false }) {
    return new Promise(resolve => {
        const previousFocus = document.activeElement;
        const overlay = document.createElement('div');
        overlay.id = 'geminibuddy-decision-dialog';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'geminibuddy-decision-title');

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

        let settled = false;
        const finish = result => {
            if (settled) return;
            settled = true;
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
            resolve(result);
        };
        const onKeyDown = event => {
            if (event.key === 'Escape') finish(false);
        };
        cancelButton.addEventListener('click', () => finish(false));
        confirmButton.addEventListener('click', () => finish(true));
        overlay.addEventListener('click', event => {
            if (event.target === overlay) finish(false);
        });
        document.addEventListener('keydown', onKeyDown);
        document.body.appendChild(overlay);
        confirmButton.focus();
    });
}

export function showFatalErrorDialog(error) {
    const overlay = document.createElement('div');
    overlay.id = 'geminibuddy-fatal-dialog';
    overlay.className = 'modal-overlay';
    overlay.style.display = 'flex';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
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
    closeButton.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
    closeButton.focus();
    if (error) console.error('GeminiBuddy fatal dialog:', error);
}
