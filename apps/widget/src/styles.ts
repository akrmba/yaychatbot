// All CSS is injected as a string into the shadow DOM — no external files.
export function getStyles(primary: string, text: string, font: string): string {
  return `
:host { all: initial; font-family: ${font}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Launcher ──────────────────────────────────────────────────── */
.yay-launcher {
  position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
  width: 56px; height: 56px; border-radius: 50%; border: none;
  background: ${primary}; color: ${text}; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px rgba(0,0,0,.2);
  transition: transform .2s ease, box-shadow .2s ease;
}
.yay-launcher:hover { transform: scale(1.08); box-shadow: 0 6px 20px rgba(0,0,0,.25); }
.yay-launcher:focus-visible { outline: 3px solid ${primary}; outline-offset: 3px; }
.yay-launcher svg { width: 26px; height: 26px; fill: currentColor; }
.yay-launcher--left { right: auto; left: 20px; }

/* Badge */
.yay-badge {
  position: absolute; top: -4px; right: -4px;
  min-width: 20px; height: 20px; border-radius: 10px;
  background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px; line-height: 1;
}
.yay-badge:empty { display: none; }

/* ── Panel ─────────────────────────────────────────────────────── */
.yay-panel {
  position: fixed; bottom: 88px; right: 20px; z-index: 2147483647;
  width: 380px; max-height: calc(100vh - 108px);
  border-radius: 16px; overflow: hidden;
  background: #fff; color: #1f2937;
  box-shadow: 0 12px 40px rgba(0,0,0,.15);
  display: flex; flex-direction: column;
  animation: yay-slide-up .25s ease;
}
.yay-panel--left { right: auto; left: 20px; }

@keyframes yay-slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Header ────────────────────────────────────────────────────── */
.yay-header {
  background: ${primary}; color: ${text}; padding: 16px 18px;
  display: flex; align-items: center; justify-content: space-between;
  flex-shrink: 0;
}
.yay-header__title { font-weight: 600; font-size: 15px; }
.yay-header__close {
  background: none; border: none; color: ${text}; cursor: pointer;
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  transition: background .15s;
}
.yay-header__close:hover { background: rgba(255,255,255,.15); }
.yay-header__close:focus-visible { outline: 2px solid ${text}; outline-offset: 2px; }
.yay-header__close svg { width: 16px; height: 16px; fill: currentColor; }

/* ── Body (scrollable area) ────────────────────────────────────── */
.yay-body {
  flex: 1; overflow-y: auto; padding: 16px;
  scroll-behavior: smooth;
}

/* ── Welcome ───────────────────────────────────────────────────── */
.yay-welcome { text-align: center; padding: 32px 16px; }
.yay-welcome__greeting { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.yay-welcome__sub { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
.yay-welcome__start {
  background: ${primary}; color: ${text}; border: none; border-radius: 10px;
  padding: 10px 28px; font-size: 14px; font-weight: 600; cursor: pointer;
  transition: opacity .15s;
}
.yay-welcome__start:hover { opacity: .9; }
.yay-welcome__start:focus-visible { outline: 3px solid ${primary}; outline-offset: 3px; }

/* ── Messages ──────────────────────────────────────────────────── */
.yay-msg {
  max-width: 82%; padding: 10px 14px; border-radius: 14px;
  font-size: 14px; line-height: 1.45; margin-bottom: 8px;
  word-wrap: break-word; white-space: pre-wrap;
}
.yay-msg--user {
  background: ${primary}; color: ${text};
  margin-left: auto; border-bottom-right-radius: 4px;
}
.yay-msg--assistant {
  background: #f3f4f6; color: #1f2937;
  border-bottom-left-radius: 4px;
}
.yay-msg--system {
  background: #fef3c7; color: #92400e;
  text-align: center; max-width: 100%; font-size: 13px;
  border-radius: 8px;
}

/* Typing indicator */
.yay-typing { display: flex; gap: 4px; padding: 10px 14px; }
.yay-typing__dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #9ca3af; animation: yay-bounce .6s infinite alternate;
}
.yay-typing__dot:nth-child(2) { animation-delay: .15s; }
.yay-typing__dot:nth-child(3) { animation-delay: .3s; }
@keyframes yay-bounce {
  to { transform: translateY(-4px); opacity: .5; }
}

/* ── Composer ──────────────────────────────────────────────────── */
.yay-composer {
  padding: 12px; border-top: 1px solid #e5e7eb;
  display: flex; gap: 8px; flex-shrink: 0;
}
.yay-composer__input {
  flex: 1; padding: 9px 14px; border: 1px solid #d1d5db;
  border-radius: 10px; font-size: 14px; outline: none;
  font-family: inherit; resize: none;
  transition: border-color .15s;
}
.yay-composer__input:focus { border-color: ${primary}; }
.yay-composer__send {
  background: ${primary}; color: ${text}; border: none;
  border-radius: 10px; padding: 9px 16px; cursor: pointer;
  font-size: 14px; font-weight: 600; white-space: nowrap;
  transition: opacity .15s;
}
.yay-composer__send:hover { opacity: .9; }
.yay-composer__send:disabled { opacity: .5; cursor: not-allowed; }
.yay-composer__send:focus-visible { outline: 3px solid ${primary}; outline-offset: 2px; }

/* ── Qualification ─────────────────────────────────────────────── */
.yay-qual { padding: 16px; }
.yay-qual__question { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.yay-qual__options { display: flex; flex-direction: column; gap: 8px; }
.yay-qual__btn {
  background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 12px 16px; text-align: left; cursor: pointer;
  font-size: 14px; transition: border-color .15s, background .15s;
}
.yay-qual__btn:hover { border-color: ${primary}; background: #f0f0ff; }
.yay-qual__btn:focus-visible { outline: 3px solid ${primary}; outline-offset: 2px; }

/* ── Lead Capture ──────────────────────────────────────────────── */
.yay-lead { padding: 16px; }
.yay-lead__title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.yay-lead__field { margin-bottom: 12px; }
.yay-lead__label { display: block; font-size: 13px; color: #6b7280; margin-bottom: 4px; }
.yay-lead__input {
  width: 100%; padding: 9px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; font-family: inherit; outline: none;
}
.yay-lead__input:focus { border-color: ${primary}; }
.yay-lead__submit {
  width: 100%; background: ${primary}; color: ${text}; border: none;
  border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 600;
  cursor: pointer; margin-top: 4px;
}
.yay-lead__submit:disabled { opacity: .5; cursor: not-allowed; }
.yay-lead__submit:focus-visible { outline: 3px solid ${primary}; outline-offset: 3px; }

/* ── Handoff ───────────────────────────────────────────────────── */
.yay-handoff { text-align: center; padding: 32px 16px; }
.yay-handoff__icon { font-size: 36px; margin-bottom: 12px; }
.yay-handoff__title { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
.yay-handoff__sub { color: #6b7280; font-size: 14px; }

/* ── Offline ───────────────────────────────────────────────────── */
.yay-offline { padding: 16px; }
.yay-offline__title { font-size: 15px; font-weight: 600; margin-bottom: 6px; }
.yay-offline__sub { font-size: 13px; color: #6b7280; margin-bottom: 14px; }
.yay-offline__input {
  width: 100%; padding: 9px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; font-family: inherit;
  outline: none; margin-bottom: 10px;
}
.yay-offline__input:focus { border-color: ${primary}; }
.yay-offline__textarea {
  width: 100%; padding: 9px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; font-family: inherit;
  outline: none; resize: vertical; min-height: 80px; margin-bottom: 10px;
}
.yay-offline__textarea:focus { border-color: ${primary}; }
.yay-offline__submit {
  width: 100%; background: ${primary}; color: ${text}; border: none;
  border-radius: 10px; padding: 10px; font-size: 14px; font-weight: 600;
  cursor: pointer;
}
.yay-offline__submit:disabled { opacity: .5; cursor: not-allowed; }
.yay-offline__submit:focus-visible { outline: 3px solid ${primary}; outline-offset: 3px; }
.yay-offline__success { color: #059669; font-size: 14px; text-align: center; padding: 20px; }

/* ── Powered-by ────────────────────────────────────────────────── */
.yay-powered {
  text-align: center; padding: 6px; font-size: 11px; color: #9ca3af;
  border-top: 1px solid #f3f4f6; flex-shrink: 0;
}
.yay-powered a { color: #6b7280; text-decoration: none; }
.yay-powered a:hover { text-decoration: underline; }

/* ── Mobile ────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .yay-panel {
    width: 100vw; height: 100vh; max-height: 100vh;
    bottom: 0; right: 0; left: 0;
    border-radius: 0;
  }
  .yay-panel--left { left: 0; }
  .yay-launcher { bottom: 16px; right: 16px; }
  .yay-launcher--left { right: auto; left: 16px; }
}

/* ── Focus visible polyfill ────────────────────────────────────── */
:focus:not(:focus-visible) { outline: none; }

/* ── Screen reader only ────────────────────────────────────────── */
.yay-sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}
`;
}
