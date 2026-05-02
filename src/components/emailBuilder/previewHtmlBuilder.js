import { buildEmailBody, escapeHtml } from "./templateTextUtils";
import { buildAttachmentPreviewMarkup } from "./attachmentPreviewUtils";

export const buildTemplatePreviewHtml = (template, attachmentDetails = {}, previewStyle = {}) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(template.subject || "Email Template")}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #0f172a;
        --line: #e2e8f0;
        --panel: ${previewStyle.panel || "#ffffff"};
        --accent: ${previewStyle.accent || "#f59e0b"};
        --bg: ${previewStyle.background ? `linear-gradient(180deg, ${previewStyle.background} 0%, #f8fafc 100%)` : "linear-gradient(180deg, #fffdf7 0%, #f8fafc 100%)"};
      }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: ${previewStyle.font || 'Georgia, "Times New Roman", serif'}; color: var(--ink); background: var(--bg); padding: 32px 18px; }
      .preview-bar { max-width: 860px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid rgba(226,232,240,0.9); border-radius: 999px; padding: 10px 14px 10px 18px; background: rgba(255,255,255,0.86); box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06); font-family: Arial, sans-serif; }
      .preview-title { margin: 0; color: #0f172a; font-size: 14px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
      .preview-state { border-radius: 999px; padding: 8px 12px; background: color-mix(in srgb, var(--accent) 12%, white); color: #0f172a; font-size: 12px; font-weight: 700; }
      .sheet { max-width: 860px; margin: 0 auto; background: var(--panel); border: 1px solid var(--line); border-radius: 24px; padding: 32px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.08); }
      .eyebrow { margin: 0 0 12px; color: #b45309; font: 600 12px/1.4 Arial, sans-serif; letter-spacing: 0.28em; text-transform: uppercase; }
      h1 { margin: 0; font: 700 32px/1.2 Arial, sans-serif; }
      .email { margin-top: 28px; white-space: pre-wrap; font-size: 18px; line-height: ${previewStyle.spacing === "compact" ? "1.55" : previewStyle.spacing === "wide" ? "2" : "1.8"}; }
      .attachment-block { margin-top: 28px; }
      .attachment-kicker { margin: 0 0 12px; color: var(--accent); font: 700 12px/1.4 Arial, sans-serif; letter-spacing: 0.24em; text-transform: uppercase; }
      .attachment-preview { border: 1px solid var(--line); border-radius: 20px; overflow: hidden; background: #f8fafc; }
      .attachment-image { padding: 12px; background-color: #f8fafc; }
      .attachment-image img { display: block; width: 100%; height: auto; max-height: min(78vh, 920px); object-fit: contain; border-radius: 14px; background: #fff; }
      .attachment-pdf-page { margin: 0; padding: 12px; background: #f8fafc; }
      .attachment-pdf-page img { display: block; width: 100%; height: auto; border-radius: 14px; background: #fff; box-shadow: 0 12px 34px rgba(15, 23, 42, 0.08); }
      .attachment-embed { padding: 0; background: #fff; }
      .attachment-embed__frame { display: block; width: 100%; height: min(82vh, 880px); border: 0; background: white; }
      .attachment-pdf { position: relative; min-height: min(82vh, 880px); }
      .attachment-pdf__fallback { margin: 12px 0 0; font: 700 13px/1.4 Arial, sans-serif; }
      .attachment-pdf__fallback a { color: var(--accent); text-decoration: none; }
      .attachment-pdf__fallback a:hover { text-decoration: underline; }
      .attachment-paper { padding: 24px; background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.96) 100%); }
      .attachment-paper__sheet { min-height: 420px; border-radius: 18px; border: 1px solid #dbe4ef; background: white; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8), 0 16px 38px rgba(15, 23, 42, 0.08); padding: 28px 28px 32px; }
      .attachment-paper__topline { height: 6px; width: 120px; border-radius: 999px; background: linear-gradient(90deg, #cbd5e1 0%, #94a3b8 100%); }
      .attachment-paper__label { margin: 18px 0 0; color: #64748b; font: 700 12px/1.4 Arial, sans-serif; letter-spacing: 0.28em; text-transform: uppercase; }
      .attachment-paper__title { margin: 10px 0 0; color: #0f172a; font: 700 30px/1.2 Georgia, "Times New Roman", serif; }
      .attachment-paper__text { margin: 26px 0 0; color: #1e293b; white-space: pre-wrap; font: 500 15px/1.9 Georgia, "Times New Roman", serif; }
      .attachment-paper__lines { margin-top: 26px; }
      .attachment-paper__lines span { display: block; height: 14px; margin-top: 18px; border-radius: 999px; background: linear-gradient(90deg, rgba(203,213,225,0.95) 0%, rgba(226,232,240,0.8) 100%); }
      .attachment-paper__lines span.short { width: 58%; }
      @media (max-width: 640px) { body { padding: 16px 10px; } .preview-bar { align-items: flex-start; border-radius: 18px; flex-direction: column; } .sheet { border-radius: 18px; padding: 20px 16px; } h1 { font-size: 25px; line-height: 1.18; overflow-wrap: anywhere; } .email { font-size: 16px; line-height: 1.65; overflow-wrap: anywhere; } .attachment-pdf { min-height: 70vh; } .attachment-embed__frame { height: 70vh; } .attachment-paper { padding: 12px; } .attachment-paper__sheet { min-height: 360px; padding: 20px 18px 24px; } .attachment-paper__title { font-size: 23px; overflow-wrap: anywhere; } }
    </style>
  </head>
  <body>
    <header class="preview-bar"><p class="preview-title">Email Preview</p><span class="preview-state">Ready layout</span></header>
    <main class="sheet">
      <p class="eyebrow">Email Template Preview</p>
      <h1>${escapeHtml(template.subject || "Untitled Email")}</h1>
      <section class="email">${escapeHtml(buildEmailBody(template))}</section>
      ${buildAttachmentPreviewMarkup(attachmentDetails)}
    </main>
  </body>
</html>`;

export const buildPreviewLoadingHtml = (subject) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(subject || "Email Preview")}</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; color: #f8fafc; background: linear-gradient(135deg, #020617 0%, #111827 52%, #0f766e 100%); }
      .loader { width: min(520px, calc(100vw - 36px)); border: 1px solid rgba(255,255,255,0.14); border-radius: 28px; padding: 28px; background: rgba(255,255,255,0.08); box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28); }
      .eyebrow { margin: 0; color: #a7f3d0; font: 700 12px/1.4 Arial, sans-serif; letter-spacing: 0.28em; text-transform: uppercase; }
      h1 { margin: 14px 0 0; font-size: 30px; line-height: 1.2; }
      .bar { height: 10px; margin-top: 24px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,0.14); }
      .bar::before { content: ""; display: block; width: 46%; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #38bdf8, #34d399, #f97316); animation: load 1.1s ease-in-out infinite; }
      @keyframes load { 0% { transform: translateX(-110%); } 100% { transform: translateX(230%); } }
    </style>
  </head>
  <body>
    <main class="loader">
      <p class="eyebrow">Preview</p>
      <h1>${escapeHtml(subject || "Preparing your email")}</h1>
      <div class="bar" aria-hidden="true"></div>
    </main>
  </body>
</html>`;
