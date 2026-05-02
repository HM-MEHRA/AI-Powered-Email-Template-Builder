import { AnimatePresence, motion } from "framer-motion";
import EditorWorkspace from "./EditorWorkspace";
import GenerateProgressSteps from "./GenerateProgressSteps";
import GeneratePromptStep from "./GeneratePromptStep";
import GenerateSidePanel from "./GenerateSidePanel";
import SetupStep from "./SetupStep";
import ToneStep from "./ToneStep";
import { buttonMotion, scrollFloatMotion, stepPanelMotion, tabContentMotion } from "./motion";

const GenerateTab = ({
  activeGenerateStep,
  activeGenerateStepIndex,
  activeWalkthrough,
  applyTonePreset,
  attachment,
  brandVoice,
  brandVoicePresets,
  buttonProgress,
  colorThemes,
  draggedSection,
  editableTemplate,
  editorSectionOrder,
  fontOptions,
  form,
  formatToneList,
  generateButtonLabel,
  generateStep,
  generationProgress,
  getAttachmentExtension,
  handleCopyTemplate,
  handleDownloadTemplate,
  handleFileChange,
  handleGenerate,
  handleGenerateBack,
  handleGenerateNext,
  handleOpenGmailTemplate,
  handleOpenMailTemplate,
  handlePreviewTemplate,
  handlePromptStarter,
  handleRegenerateSection,
  handleRewrite,
  handleSaveCustomTemplate,
  isGenerating,
  language,
  languageOptions,
  navigateToTab,
  onStepChange,
  promptStarters,
  previewFont,
  previewSpacing,
  previewTheme,
  reorderList,
  setAttachment,
  setBrandVoice,
  setDraggedSection,
  setEditorSectionOrder,
  setGenerateStep,
  setLanguage,
  setPreviewFont,
  setPreviewSpacing,
  setPreviewTheme,
  setToneMode,
  setVariationCount,
  setWalkthroughIndex,
  steps,
  subjectInsights,
  templateCountLabel,
  templates,
  toggleTone,
  toneBlueprint,
  toneGroups,
  tonePresets,
  toneStrategyFit,
  toneStyles,
  updateEditableTemplate,
  updateField,
  variationCount,
  variationLabels,
  variationOptions,
  walkthroughExamplesLength,
  walkthroughIndex,
}) => (
  <motion.div
    key="generate-tab"
    {...tabContentMotion}
    className={`grid items-start gap-6 lg:gap-8 ${
      generateStep === "setup" || generateStep === "workspace"
        ? "lg:grid-cols-1"
        : "lg:grid-cols-[0.92fr_1.08fr]"
    }`}
  >
    <GenerateProgressSteps
      activeGenerateStepIndex={activeGenerateStepIndex}
      editableTemplate={editableTemplate}
      generateStep={generateStep}
      onStepChange={onStepChange}
      steps={steps}
    />

    <form onSubmit={handleGenerate} className={`${generateStep === "tone" ? "lg:order-2" : ""} ${generateStep === "workspace" ? "hidden" : ""}`}>
      <motion.div
        {...scrollFloatMotion}
        className="rounded-[22px] bg-white p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 sm:rounded-[28px] sm:p-6"
      >
        <div className="mb-5 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4 sm:mb-6 sm:rounded-[24px] sm:px-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${generateStep}-heading`}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                {activeGenerateStep.label}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">{activeGenerateStep.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{activeGenerateStep.note}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {generateStep === "prompt" && (
            <GeneratePromptStep
              brandVoice={brandVoice}
              brandVoicePresets={brandVoicePresets}
              form={form}
              language={language}
              languageOptions={languageOptions}
              onPromptStarter={handlePromptStarter}
              promptStarters={promptStarters}
              setBrandVoice={setBrandVoice}
              setLanguage={setLanguage}
              subjectInsights={subjectInsights}
              updateField={updateField}
            />
          )}
          {generateStep === "tone" && (
            <ToneStep
              form={form}
              formatToneList={formatToneList}
              language={language}
              setToneMode={setToneMode}
              toggleTone={toggleTone}
              toneGroups={toneGroups}
              toneStyles={toneStyles}
              variationCount={variationCount}
            />
          )}
          {generateStep === "setup" && (
            <SetupStep
              attachment={attachment}
              buttonProgress={buttonProgress}
              form={form}
              formatToneList={formatToneList}
              generateButtonLabel={generateButtonLabel}
              generationProgress={generationProgress}
              getAttachmentExtension={getAttachmentExtension}
              handleFileChange={handleFileChange}
              isGenerating={isGenerating}
              language={language}
              setAttachment={setAttachment}
              setVariationCount={setVariationCount}
              variationCount={variationCount}
              variationLabels={variationLabels}
              variationOptions={variationOptions}
            />
          )}
        </AnimatePresence>

        {generateStep !== "workspace" && generateStep !== "tone" && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <motion.button
              type="button"
              {...buttonMotion}
              onClick={handleGenerateBack}
              disabled={generateStep === "prompt"}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </motion.button>
            {generateStep !== "setup" ? (
              <motion.button
                type="button"
                {...buttonMotion}
                onClick={handleGenerateNext}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Continue
              </motion.button>
            ) : (
              <span className="text-sm font-medium text-slate-500">
                Ready when you are. Generate opens the Fresh Emails section so you can compare drafts first.
              </span>
            )}
          </div>
        )}

        {generateStep === "workspace" && (
          <motion.div key="workspace-ready-panel" {...stepPanelMotion} className="space-y-4">
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-5">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">Ready</p>
              <h3 className="mt-2 text-2xl font-semibold text-emerald-950">
                {templates.length ? `${templates.length} draft${templates.length === 1 ? "" : "s"} generated` : "Generate drafts to open the workspace"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-emerald-800">
                Use the editor on this page to refine the selected draft, or jump to Fresh Emails to compare every variation.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <motion.button
                type="button"
                {...buttonMotion}
                onClick={() => setGenerateStep("prompt")}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Start New Prompt
              </motion.button>
              <motion.button
                type="button"
                {...buttonMotion}
                onClick={() => navigateToTab("Fresh Emails")}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                View Fresh Emails
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </form>

    <GenerateSidePanel
      activeGenerateStepIndex={activeGenerateStepIndex}
      activeWalkthrough={activeWalkthrough}
      applyTonePreset={applyTonePreset}
      attachment={attachment}
      editableTemplate={editableTemplate}
      form={form}
      formatToneList={formatToneList}
      generateStep={generateStep}
      handleGenerateNext={handleGenerateNext}
      language={language}
      setWalkthroughIndex={setWalkthroughIndex}
      steps={steps}
      templateCountLabel={templateCountLabel}
      templates={templates}
      toneBlueprint={toneBlueprint}
      tonePresets={tonePresets}
      toneStrategyFit={toneStrategyFit}
      variationCount={variationCount}
      walkthroughExamplesLength={walkthroughExamplesLength}
      walkthroughIndex={walkthroughIndex}
    />

    {generateStep === "workspace" && (
      <EditorWorkspace
        colorThemes={colorThemes}
        draggedSection={draggedSection}
        editableTemplate={editableTemplate}
        editorSectionOrder={editorSectionOrder}
        fontOptions={fontOptions}
        handleCopyTemplate={handleCopyTemplate}
        handleDownloadTemplate={handleDownloadTemplate}
        handleOpenGmailTemplate={handleOpenGmailTemplate}
        handleOpenMailTemplate={handleOpenMailTemplate}
        handlePreviewTemplate={handlePreviewTemplate}
        handleRegenerateSection={handleRegenerateSection}
        handleRewrite={handleRewrite}
        handleSaveCustomTemplate={handleSaveCustomTemplate}
        previewFont={previewFont}
        previewSpacing={previewSpacing}
        previewTheme={previewTheme}
        reorderList={reorderList}
        setDraggedSection={setDraggedSection}
        setEditorSectionOrder={setEditorSectionOrder}
        setPreviewFont={setPreviewFont}
        setPreviewSpacing={setPreviewSpacing}
        setPreviewTheme={setPreviewTheme}
        updateEditableTemplate={updateEditableTemplate}
      />
    )}
  </motion.div>
);

export default GenerateTab;
