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