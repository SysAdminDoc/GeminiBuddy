// /src/GM_wrappers.js

export const GM_addStyle = (css) => GM.addStyle(css);
export const GM_setValue = (key, value) => GM.setValue(key, value);
export const GM_getValue = (key, defaultValue) => GM.getValue(key, defaultValue);
export const GM_xmlhttpRequest = (details) => GM.xmlHttpRequest(details);