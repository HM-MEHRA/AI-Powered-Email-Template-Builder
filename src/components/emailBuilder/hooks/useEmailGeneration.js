import { useMemo } from "react";
import {
  generateEmail,
  generateSingleEmailVariation,
  isAuthenticated,
  saveGeneratedHistory,
} from "../../../services/ai";
import {
  GENERATE_STEPS,
  getOllamaModelForDraftCount,
} from "../builderConstants";
import {
  buildAutoPromptFromSubject,
  cleanTemplateForDisplay,
  computeSubjectInsights,
  parseToneList,
} from "../builderUtils";

const useEmailGeneration = ({
  attachment,
  brandVoice,
  form,
  generateStep,
  isGenerating,
  language,
  setActiveTemplateSection,
  setAttachment,
  setButtonProgress,
  setCompareTemplateIds,
  setEditableTemplate,
  setError,
  setForm,
  setGenerateStep,
  setGenerationProgress,
  setHistory,
  setIsGenerating,
  setSelectedTemplate,
  setStatusMessage,
  setTemplates,
  setVariationCount,
  variationCount,
  navigateToTab,
  scrollGenerateStepIntoView,
}) => {
  const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024;
  const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".txt", ".png", ".jpg", ".jpeg"];

  const activeGenerateStepIndex = Math.max(
    0,
    GENERATE_STEPS.findIndex((step) => step.value === generateStep)
  );
  const activeGenerateStep = GENERATE_STEPS[activeGenerateStepIndex] || GENERATE_STEPS[0];

  const generateButtonLabel = useMemo(() => {
    if (variationCount === 1) return "Generate Email";
    return `Generate ${variationCount} Variations`;
  }, [variationCount]);

  const subjectInsights = useMemo(() => computeSubjectInsights(form.subject), [form.subject]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleGenerateNext = () => {
    setError("");
    const subject = form.subject.trim();
    if (generateStep === "prompt" && !subject) {
      setError("Add a subject before choosing tone.");
      return;
    }
    if (generateStep === "prompt" && !form.purpose.trim()) {
      const autoPurpose = buildAutoPromptFromSubject(subject);
      setForm((current) => ({
        ...current,
        purpose: current.purpose.trim() || autoPurpose,
      }));
      setStatusMessage("Prompt created from your subject.");
    }
    if (generateStep === "tone" && !form.tones?.length) {
      setError("Pick at least one tone before setup.");
      return;
    }

    const nextStep = GENERATE_STEPS[Math.min(activeGenerateStepIndex + 1, GENERATE_STEPS.length - 1)];
    setGenerateStep(nextStep.value);
    scrollGenerateStepIntoView();
  };

  const handleGenerateBack = () => {
    setError("");
    const previousStep = GENERATE_STEPS[Math.max(activeGenerateStepIndex - 1, 0)];
    setGenerateStep(previousStep.value);
    scrollGenerateStepIntoView();
  };

  const setToneMode = (toneMode) => {
    setForm((current) => {
      const normalizedTones = parseToneList(current.tones);
      return {
        ...current,
        toneMode,
        tones: toneMode === "single" ? [normalizedTones[0]] : normalizedTones,
      };
    });
  };

  const applyTonePreset = (preset) => {
    setForm((current) => ({
      ...current,
      toneMode: preset.toneMode,
      tones: preset.tones,
    }));
  };

  const toggleTone = (tone) => {
    setForm((current) => {
      const selectedTones = parseToneList(current.tones);
      if (current.toneMode === "single") {
        return {
          ...current,
          tones: [tone],
        };
      }

      const isSelected = selectedTones.includes(tone);
      if (isSelected) {
        if (selectedTones.length === 1) {
          return current;
        }

        return {
          ...current,
          tones: selectedTones.filter((item) => item !== tone),
        };
      }

      return {
        ...current,
        tones: [...selectedTones, tone],
      };
    });
  };

  const handlePromptStarter = (starter) => {
    setForm((current) => ({
      ...current,
      subject: starter.subject,
      purpose: starter.purpose,
    }));
    setStatusMessage(`${starter.label} prompt loaded.`);
  };

  const handleFileChange = (event) => {
    const nextFile = event.target.files?.[0] || null;
    if (nextFile) {
      const extension = `.${(nextFile.name || "").split(".").pop()}`.toLowerCase();
      if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
        event.target.value = "";
        setAttachment(null);
        setError("Use PDF, DOC, DOCX, TXT, PNG, JPG, or JPEG for context.");
        return;
      }
      if (nextFile.size > MAX_ATTACHMENT_SIZE) {
        event.target.value = "";
        setAttachment(null);
        setError("Keep attachments under 8 MB so generation stays quick.");
        return;
      }
    }
    setAttachment(nextFile);
    setError("");
    setStatusMessage(nextFile ? `${nextFile.name} attached for context.` : "");
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (isGenerating) return;
    if (generateStep !== "setup") {
      handleGenerateNext();
      return;
    }
    setError("");
    setGenerationProgress([]);
    setButtonProgress(0);

    const subject = form.subject.trim();
    if (!subject) {
      setError("Add a subject to generate email variations.");
      return;
    }
    const generationPurpose = form.purpose.trim() || buildAutoPromptFromSubject(subject);
    if (!form.purpose.trim()) {
      setForm((current) => ({
        ...current,
        purpose: current.purpose.trim() || generationPurpose,
      }));
      setStatusMessage("Prompt created from your subject.");
    }

    if (!form.tones?.length) {
      setError("Pick at least one tone to generate email variations.");
      return;
    }

    setIsGenerating(true);
    setButtonProgress(8);
    const nextTemplates = [];
    const nextProgress = [];
    const failedDrafts = [];
    let fallbackHistoryEntry = null;
    const generationRunId = Date.now();
    const generationModel = getOllamaModelForDraftCount(variationCount, {
      hasAttachment: Boolean(attachment),
      purpose: generationPurpose,
    });

    for (let index = 0; index < variationCount; index += 1) {
      nextProgress[index] = `Generating draft ${index + 1} of ${variationCount}`;
      setGenerationProgress([...nextProgress]);
      setButtonProgress(Math.max(12, Math.round((index / variationCount) * 82)));

      const result = await generateSingleEmailVariation({
        subject,
        purpose: generationPurpose,
        tone: form.tones,
        variationCount,
        styleIndex: index,
        file: attachment,
        ollamaModel: generationModel,
        brandVoice,
        language,
      });

      if (result?.error || !result?.variation) {
        failedDrafts.push(index + 1);
        nextProgress[index] = `Draft ${index + 1} failed`;
        setGenerationProgress([...nextProgress]);
        setStatusMessage(result?.error || `Draft ${index + 1} failed. Continuing with the next draft.`);
        continue;
      }

      nextTemplates.push({
        ...cleanTemplateForDisplay(result.variation, subject),
        id: result.variation?.id || `fresh-${generationRunId}-${index + 1}`,
      });
      nextProgress[index] = `Draft ${index + 1} ready`;
      setGenerationProgress([...nextProgress]);
      setButtonProgress(Math.min(92, Math.round(((index + 1) / variationCount) * 92)));
    }

    if (!nextTemplates.length) {
      setStatusMessage("Trying one more local generation path...");
      setGenerationProgress([`Generating ${variationCount} draft${variationCount === 1 ? "" : "s"} together`]);
      const fallbackResult = await generateEmail({
        subject,
        purpose: generationPurpose,
        tone: form.tones,
        variationCount,
        file: attachment,
        ollamaModel: generationModel,
        brandVoice,
        language,
      });

      if (fallbackResult?.variations?.length) {
        nextTemplates.push(
          ...fallbackResult.variations.map((variation, index) => ({
            ...cleanTemplateForDisplay(variation, subject),
            id: variation?.id || `fresh-${generationRunId}-${index + 1}`,
          }))
        );
        fallbackHistoryEntry = fallbackResult.history_entry || null;
        setGenerationProgress(
          fallbackResult.variations.map((_, index) => `Draft ${index + 1} ready`)
        );
      } else {
        setError(
          fallbackResult?.error ||
            "No drafts were generated. Ollama is running, but the model did not return a usable draft. Try again with Fast Draft or a shorter prompt."
        );
        setIsGenerating(false);
        setButtonProgress(0);
        return;
      }
    }

    const historyEntry = fallbackHistoryEntry || (isAuthenticated()
      ? await saveGeneratedHistory({
          subject,
          purpose: generationPurpose,
          tone: form.tones,
          prompt: [subject, generationPurpose].filter(Boolean).join(". "),
          variations: nextTemplates,
        })
      : null);
    setButtonProgress(100);

    setTemplates(nextTemplates);
    setSelectedTemplate(null);
    setEditableTemplate(null);
    setActiveTemplateSection("unsaved");
    setCompareTemplateIds([]);
    if (historyEntry && !historyEntry?.error) {
      setHistory((current) => [historyEntry, ...current].slice(0, 20));
    }
    navigateToTab("Fresh Emails");
    setStatusMessage(
      failedDrafts.length
        ? `Generated ${nextTemplates.length} draft${nextTemplates.length === 1 ? "" : "s"}. ${failedDrafts.length} failed and can be retried by generating again.`
        : isAuthenticated()
          ? "Generated fresh drafts. Choose one with Use This."
          : "Generated fresh drafts. Choose one with Use This. Log in if you want them saved to your account."
    );
    setIsGenerating(false);
    window.setTimeout(() => setButtonProgress(0), 500);
  };

  return {
    activeGenerateStep,
    activeGenerateStepIndex,
    generateButtonLabel,
    subjectInsights,
    applyTonePreset,
    handleFileChange,
    handleGenerate,
    handleGenerateBack,
    handleGenerateNext,
    handlePromptStarter,
    setToneMode,
    setVariationCount,
    toggleTone,
    updateField,
  };
};

export default useEmailGeneration;
