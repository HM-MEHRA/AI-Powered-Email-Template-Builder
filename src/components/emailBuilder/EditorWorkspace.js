import { motion } from "framer-motion";
import ActionSymbol from "./ActionSymbol";
import { buttonMotion, scrollFloatMotion, scrollRevealMotion } from "./motion";
import { stripAttachmentNotes } from "./previewUtils";

const REWRITE_ACTIONS = [
  ["shorter", "Shorter"],
  ["friendlier", "Friendlier"],
  ["clearer", "Clearer"],
  ["formal", "More Formal"],
];

const REGENERATE_SECTIONS = [
  ["subject", "Subject"],
  ["greeting", "Greeting"],
  ["body", "Body"],
  ["closing", "Closing"],
];

const EditorWorkspace = ({
  colorThemes,
  draggedSection,
  editableTemplate,
  editorSectionOrder,
  fontOptions,
  handleCopyTemplate,
  handleDownloadTemplate,
  handleOpenGmailTemplate,
  handleOpenMailTemplate,
  handlePreviewTemplate,
  handleRegenerateSection,
  handleRewrite,
  handleSaveCustomTemplate,
  previewFont,
  previewSpacing,
  previewTheme,
  reorderList,
  setDraggedSection,
  setEditorSectionOrder,
  setPreviewFont,
  setPreviewSpacing,
  setPreviewTheme,
  updateEditableTemplate,
}) => (
  <motion.div
    {...scrollFloatMotion}
    transition={{ ...scrollRevealMotion.transition, delay: 0.14 }}
    className="flex min-h-0 flex-1 flex-col rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] sm:rounded-[28px] sm:p-6"
  >
    <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#020617_0%,#111827_48%,#0f766e_100%)] p-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:rounded-[30px] sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,rgba(14,165,233,0.22),rgba(16,185,129,0.18),rgba(249,115,22,0.16))]" />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 14, 0], y: [0, -10, 0], opacity: [0.45, 0.75, 0.45] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="pointer-events-none absolute -right-10 top-6 h-32 w-32 rounded-full border border-white/10 bg-white/10 blur-sm"
      />
      <div className="relative">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100 sm:text-xs sm:tracking-[0.32em]">Selected Draft</p>
          <h3 className="mt-3 max-w-3xl break-words text-2xl font-semibold leading-tight text-white sm:text-3xl">
            {editableTemplate ? editableTemplate.subject : "No template selected"}
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Polish the copy, preview the finished email in a separate page, then export or send when it feels ready.
          </p>
        </div>
        {editableTemplate && (
          <div className="mt-5 grid w-full grid-cols-2 gap-2 sm:mt-6 sm:grid-cols-3 2xl:grid-cols-6">
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => handlePreviewTemplate(editableTemplate)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-3 text-center text-sm font-semibold text-slate-950 shadow-[0_14px_30px_rgba(255,255,255,0.14)] transition hover:bg-slate-100 sm:px-4"
            >
              <ActionSymbol type="preview" />
              Preview
            </motion.button>
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={handleSaveCustomTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15 sm:px-4"
            >
              <ActionSymbol type="save" />
              Save
            </motion.button>
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => handleCopyTemplate(editableTemplate)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-3 text-center text-sm font-semibold text-white transition hover:bg-white/15 sm:px-4"
            >
              <ActionSymbol type="copy" />
              Copy
            </motion.button>
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => handleOpenGmailTemplate(editableTemplate)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-sky-300/50 bg-sky-300/15 px-3 py-3 text-center text-sm font-semibold text-sky-50 transition hover:bg-sky-300/25 sm:px-4"
            >
              <ActionSymbol type="gmail" />
              Gmail
            </motion.button>
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => handleOpenMailTemplate(editableTemplate)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/50 bg-amber-300/15 px-3 py-3 text-center text-sm font-semibold text-amber-50 transition hover:bg-amber-300/25 sm:px-4"
            >
              <ActionSymbol type="outlook" />
              Outlook
            </motion.button>
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={() => handleDownloadTemplate(editableTemplate)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-emerald-300/50 bg-emerald-300/15 px-3 py-3 text-center text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/25 sm:px-4"
            >
              <ActionSymbol type="download" />
              Download
            </motion.button>
          </div>
        )}
      </div>
      {editableTemplate && (
        <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100">Draft</p>
            <p className="mt-2 truncate text-sm font-semibold text-white" title={editableTemplate.subject}>
              {editableTemplate.subject || "Untitled email"}
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-emerald-100">Preview</p>
            <p className="mt-2 text-sm font-semibold text-white">Opens as a clean page</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-orange-100">Finish</p>
            <p className="mt-2 text-sm font-semibold text-white">Copy, send, or export HTML</p>
          </div>
        </div>
      )}
    </div>

    {editableTemplate ? (
      <div className="mt-6 grid min-h-0 flex-1 gap-4">
        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98)_0%,rgba(255,255,255,0.98)_52%,rgba(236,253,245,0.84)_100%)] p-4 shadow-[0_14px_32px_rgba(15,23,42,0.04)] sm:rounded-[24px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Quick Edits</p>
              <h4 className="mt-1 text-lg font-semibold text-slate-950">Small cleanup tools for the selected draft</h4>
            </div>
            <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Optional
            </span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Tone Cleanup</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REWRITE_ACTIONS.map(([action, label]) => (
                  <motion.button
                    key={action}
                    type="button"
                    {...buttonMotion}
                    onClick={() => handleRewrite(action)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="rounded-[20px] border border-orange-200/70 bg-orange-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-700">Section Tweaks</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REGENERATE_SECTIONS.map(([section, label]) => (
                  <motion.button
                    key={section}
                    type="button"
                    {...buttonMotion}
                    onClick={() => handleRegenerateSection(section)}
                    className="w-full rounded-2xl border border-orange-200 bg-white px-3 py-2.5 text-center text-sm font-semibold text-orange-800 transition hover:border-orange-300 hover:bg-orange-50"
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Subject
          </label>
          <input
            type="text"
            value={editableTemplate.subject}
            onChange={(event) => updateEditableTemplate("subject", event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:bg-white"
          />
        </div>

        <div className="rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.94)_100%)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:rounded-[28px] sm:p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Draft Workspace</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-900">Edit copy, then open the preview page when ready</h4>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Color Theme
                </span>
                <select
                  value={previewTheme.name}
                  onChange={(event) => setPreviewTheme(colorThemes.find((theme) => theme.name === event.target.value) || colorThemes[0])}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                >
                  {colorThemes.map((theme) => (
                    <option key={theme.name} value={theme.name}>{theme.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Font Style
                </span>
                <select
                  value={previewFont}
                  onChange={(event) => setPreviewFont(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                >
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Email Spacing
                </span>
                <select
                  value={previewSpacing}
                  onChange={(event) => setPreviewSpacing(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
                >
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                  <option value="wide">Wide</option>
                </select>
              </label>
            </div>
          </div>

          <div className="mt-5">
            <div className="rounded-[24px] border border-slate-200 bg-white/80 p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Editor</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  Drag to reorder
                </span>
              </div>
              <div className="space-y-3">
                {editorSectionOrder.map((sectionKey) => (
                  <div
                    key={sectionKey}
                    draggable
                    onDragStart={() => setDraggedSection(sectionKey)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => setEditorSectionOrder((current) => reorderList(current, draggedSection, sectionKey))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                      {sectionKey}
                    </label>
                    {sectionKey === "body" ? (
                      <textarea
                        value={stripAttachmentNotes(editableTemplate[sectionKey])}
                        onChange={(event) => updateEditableTemplate(sectionKey, event.target.value)}
                        rows="7"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400"
                      />
                    ) : (
                      <input
                        type="text"
                        value={stripAttachmentNotes(editableTemplate[sectionKey])}
                        onChange={(event) => updateEditableTemplate(sectionKey, event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Generate a fresh email or choose one from the Fresh Emails section to load it into this editor.
      </p>
    )}
  </motion.div>
);

export default EditorWorkspace;
