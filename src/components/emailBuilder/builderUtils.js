import { buildEmailBody, stripAttachmentNotes } from "./previewUtils";
import { TAB_ITEMS } from "./builderConstants";

export const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

export const readLocalStorage = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.error("Failed to read local storage", error);
    return fallback;
  }
};

export const writeLocalStorage = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Failed to write local storage", error);
  }
};

export const reorderList = (items, draggedItem, targetItem) => {
  if (!draggedItem || !targetItem || draggedItem === targetItem) return items;
  const next = [...items];
  const draggedIndex = next.indexOf(draggedItem);
  const targetIndex = next.indexOf(targetItem);
  if (draggedIndex === -1 || targetIndex === -1) return items;
  next.splice(draggedIndex, 1);
  next.splice(targetIndex, 0, draggedItem);
  return next;
};

export const computeSubjectInsights = (subject) => {
  const cleaned = (subject || "").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  let score = 62;
  if (words.length >= 4 && words.length <= 8) score += 16;
  if (words.length > 10) score -= 12;
  if (/[!?]/.test(cleaned)) score -= 8;
  if (/\bfree|urgent|buy now|limited\b/i.test(cleaned)) score -= 10;
  if (/\bthank|update|invitation|next steps|welcome|quick\b/i.test(cleaned)) score += 8;
  score = Math.max(0, Math.min(100, score));

  const tips = [];
  if (!cleaned) tips.push("Add a subject line to score it.");
  if (words.length < 4) tips.push("Try making the subject a little more specific.");
  if (words.length > 8) tips.push("Shorter subjects are usually easier to scan.");
  if (!/\bthank|update|invite|welcome|follow|quick|plan|next\b/i.test(cleaned)) {
    tips.push("Add a clearer intent word like update, thank you, invitation, or next steps.");
  }
  if (/[!?]/.test(cleaned)) tips.push("Too much punctuation can make the subject feel noisy.");
  if (!tips.length) tips.push("This subject feels balanced and readable.");

  return { score, tips: tips.slice(0, 3) };
};

export const buildAutoPromptFromSubject = (subject) => {
  const cleanedSubject = (subject || "").trim().replace(/\s+/g, " ");
  if (!cleanedSubject) return "";

  return [
    `Write a natural email about "${cleanedSubject}".`,
    "Make it sound human, clear, and easy to respond to.",
    "Include a friendly opening, the main message, useful details, and a polite closing.",
    "Do not mention that the prompt was auto-created.",
  ].join(" ");
};

export const applyRewriteAction = (template, action) => {
  if (!template) return template;
  const next = { ...template };

  const replaceMap = {
    friendlier: [
      [/\bHello\b/g, "Hi"],
      [/\bI am writing to\b/gi, "I'm reaching out to"],
      [/\bI would like to\b/gi, "I'd like to"],
      [/\bBest regards\b/g, "Warmly"],
    ],
    clearer: [
      [/\butilize\b/gi, "use"],
      [/\bin order to\b/gi, "to"],
      [/\bwith regard to\b/gi, "about"],
      [/\bat your earliest convenience\b/gi, "when you can"],
    ],
    shorter: [],
    formal: [
      [/\bHi\b/g, "Hello"],
      [/\bHey\b/g, "Hello"],
      [/\bThanks\b/g, "Thank you"],
      [/\bWarmly\b/g, "Best regards"],
    ],
  };

  if (action === "shorter") {
    next.body = String(next.body || "")
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((paragraph) => {
        const sentences = paragraph.split(/(?<=[.!?])\s+/).slice(0, 2);
        return sentences.join(" ");
      })
      .join("\n\n");
    next.subject = String(next.subject || "").split(" ").slice(0, 7).join(" ");
  } else {
    (replaceMap[action] || []).forEach(([pattern, value]) => {
      next.subject = String(next.subject || "").replace(pattern, value);
      next.greeting = String(next.greeting || "").replace(pattern, value);
      next.body = String(next.body || "").replace(pattern, value);
      next.closing = String(next.closing || "").replace(pattern, value);
    });
  }

  return next;
};

export const createSectionVariant = (template, section) => {
  if (!template) return template;
  const next = { ...template };
  const subject = String(template.subject || "").replace(/^(quick update|update|follow-up):\s*/i, "").trim();
  const greeting = String(template.greeting || "").trim();
  const greetingName = greeting.match(/^(dear|hello|hi|hey)\s+(.+?)[,!.]?$/i)?.[2]?.trim();

  if (section === "subject") {
    next.subject = subject ? `Update: ${subject}`.slice(0, 100) : template.subject;
  }
  if (section === "greeting") {
    next.greeting = /^\s*hi\b/i.test(greeting)
      ? `Hello${greetingName ? ` ${greetingName}` : ""},`
      : `Hi${greetingName ? ` ${greetingName}` : " there"},`;
  }
  if (section === "closing") {
    next.closing = /\b(best|regards)\b/i.test(String(template.closing || "")) ? "Warmly," : "Best regards,";
  }
  if (section === "body") {
    const body = String(template.body || "").trim();
    const paragraphs = body.split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
    if (paragraphs.length > 2) {
      next.body = paragraphs.slice(0, 3).join("\n\n");
    } else {
      const sentences = body.split(/(?<=[.!?])\s+/).filter(Boolean);
      next.body = sentences.length > 3 ? `${sentences.slice(0, 2).join(" ")}\n\n${sentences.slice(2).join(" ")}` : body;
    }
  }
  return next;
};

export const getSentenceCount = (text = "") =>
  (text.match(/[.!?]+/g) || []).length;

export const getParagraphCount = (text = "") =>
  text.split(/\n+/).map((part) => part.trim()).filter(Boolean).length;

export const scoreTemplateComparison = (template) => {
  const subject = (template?.subject || "").trim();
  const body = (template?.body || "").trim();
  const fullText = buildEmailBody(template);
  const subjectData = computeSubjectInsights(subject);
  const words = body.split(/\s+/).filter(Boolean);
  const sentences = getSentenceCount(body);
  const paragraphs = getParagraphCount(body);
  const hasCTA = /\b(reply|let me know|book|schedule|join|confirm|share|call|contact|review)\b/i.test(fullText);
  const hasWarmth = /\b(thank|appreciate|glad|happy|warmly|pleased)\b/i.test(fullText);
  const hasConcreteDetail = /\b(today|tomorrow|this week|date|time|details|plan|next step|agenda|location)\b/i.test(fullText);

  let clarity = 62;
  if (words.length >= 35 && words.length <= 120) clarity += 18;
  if (words.length > 160) clarity -= 14;
  if (sentences >= 2 && sentences <= 6) clarity += 10;
  if (paragraphs >= 2 && paragraphs <= 4) clarity += 8;
  if (hasConcreteDetail) clarity += 6;
  clarity = Math.max(0, Math.min(100, clarity));

  let cta = 48;
  if (hasCTA) cta += 34;
  if (/\?/i.test(body)) cta += 6;
  if (/\b(next step|reply|let me know|join us|confirm)\b/i.test(fullText)) cta += 8;
  cta = Math.max(0, Math.min(100, cta));

  let warmth = 52;
  if (hasWarmth) warmth += 24;
  if (/\b(hello|hi|warmly|best regards|thank you)\b/i.test(fullText)) warmth += 10;
  warmth = Math.max(0, Math.min(100, warmth));

  const overall = Math.round(subjectData.score * 0.32 + clarity * 0.34 + cta * 0.24 + warmth * 0.1);

  return {
    subjectScore: subjectData.score,
    clarityScore: clarity,
    ctaScore: cta,
    warmthScore: warmth,
    overallScore: overall,
    notes: [
      subjectData.score >= 75 ? "Strong subject line" : "Subject can be tighter",
      clarity >= 75 ? "Easy to scan" : "Could be clearer",
      cta >= 75 ? "Clear next step" : "CTA is weak or missing",
    ],
  };
};

export const buildComparisonSummary = (templates) => {
  if (!templates || templates.length < 2) return null;
  const selectedTemplates = templates.slice(0, 4);
  const scoredTemplates = selectedTemplates.map((template, index) => ({
    template,
    index,
    scores: scoreTemplateComparison(template),
  }));

  const pickWinner = (scoreKey) => {
    const sorted = [...scoredTemplates].sort((a, b) => b.scores[scoreKey] - a.scores[scoreKey]);
    if (!sorted.length || sorted[0].scores[scoreKey] === sorted[1]?.scores[scoreKey]) return null;
    return sorted[0];
  };

  const subjectWinner = pickWinner("subjectScore");
  const clarityWinner = pickWinner("clarityScore");
  const ctaWinner = pickWinner("ctaScore");
  const overallWinner = pickWinner("overallScore");
  const winnerTemplate = overallWinner?.template || scoredTemplates[0]?.template;

  const categories = [
    {
      key: "subject",
      label: "Best Subject",
      winner: subjectWinner?.template.id || "tie",
      reason: subjectWinner
        ? `${subjectWinner.template.subject} feels more balanced and scannable.`
        : "The selected subject lines perform similarly.",
    },
    {
      key: "clarity",
      label: "Best Clarity",
      winner: clarityWinner?.template.id || "tie",
      reason: clarityWinner
        ? `Draft ${clarityWinner.index + 1} is easier to read and better structured.`
        : "The selected drafts are similarly clear.",
    },
    {
      key: "cta",
      label: "Best CTA",
      winner: ctaWinner?.template.id || "tie",
      reason: ctaWinner
        ? `Draft ${ctaWinner.index + 1} gives the reader the clearest next action.`
        : "The selected drafts have similar next-step signals.",
    },
  ];

  return {
    scoredTemplates,
    categories,
    overallWinner: overallWinner?.template.id || "tie",
    winnerTemplate,
    summary:
      !overallWinner
        ? "These drafts are closely matched overall."
        : `${winnerTemplate.subject} looks strongest overall based on subject quality, readability, and CTA clarity.`,
  };
};

const TAB_HASH_ALIASES = {
  "#database-templates": "Template Library",
};

export const getTabFromHash = (hash) => {
  const normalizedHash = (hash || "").toLowerCase();
  return TAB_HASH_ALIASES[normalizedHash] || TAB_ITEMS.find((item) => item.hash === normalizedHash)?.label || "Generate";
};

export const getHashForTab = (label) =>
  TAB_ITEMS.find((item) => item.label === label)?.hash || "#generate";

const PLACEHOLDER_SUBJECT_VALUES = new Set([
  "subject",
  "email subject",
  "subject line",
  "email subject line",
  "title",
  "email title",
  "generated subject",
  "generated email subject",
  "your subject",
  "write subject",
  "insert subject",
]);

export const isPlaceholderSubjectLine = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .replace(/^[\s[\]{}():._-]+|[\s[\]{}():._-]+$/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return PLACEHOLDER_SUBJECT_VALUES.has(normalized);
};

export const cleanTemplateSubject = (value = "", fallback = "") => {
  const normalizeSubject = (subjectValue) =>
    String(subjectValue || "")
      .replace(/^subject\s*:\s*/i, "")
      .split(/\r?\n/)[0]
      .replace(/\s+/g, " ")
      .trim();
  const titleCaseFallback = (subjectValue) =>
    subjectValue
      .split(" ")
      .map((word) => (word && word === word.toLowerCase() ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
      .join(" ");
  let text = normalizeSubject(value);
  const bodyLike =
    text.split(/\s+/).filter(Boolean).length > 12 ||
    /\b(i am|i wanted|please let me|thank you for|i would like)\b/i.test(text);

  if (!text || bodyLike || isPlaceholderSubjectLine(text)) {
    text = titleCaseFallback(normalizeSubject(fallback));
  }

  if (!text || isPlaceholderSubjectLine(text)) {
    text = "Generated Email";
  }

  return text.slice(0, 100).replace(/[ .,-]+$/g, "");
};

export const cleanTemplateForDisplay = (template = {}, fallbackSubject = "") => ({
  ...template,
  subject: cleanTemplateSubject(template.subject || template.title || "", fallbackSubject),
  greeting: stripAttachmentNotes(template.greeting || ""),
  body: stripAttachmentNotes(template.body || template.content || ""),
  closing: stripAttachmentNotes(template.closing || ""),
  signature: stripAttachmentNotes(template.signature || ""),
});

export const cloneTemplate = (template) => ({
  id: template.id,
  label: template.label,
  subject: cleanTemplateSubject(template.subject || ""),
  greeting: stripAttachmentNotes(template.greeting || ""),
  body: stripAttachmentNotes(template.body || ""),
  closing: stripAttachmentNotes(template.closing || ""),
  signature: stripAttachmentNotes(template.signature || ""),
});

export const buildStoredTemplatePayload = (template) => ({
  subject: cleanTemplateSubject(template.subject || ""),
  greeting: stripAttachmentNotes(template.greeting || ""),
  body: stripAttachmentNotes(template.body || ""),
  closing: stripAttachmentNotes(template.closing || ""),
  signature: stripAttachmentNotes(template.signature || ""),
});

export const parseStoredTemplatePayload = (rawContent, fallbackTitle = "") => {
  try {
    const parsed = JSON.parse(rawContent || "{}");
    return {
      subject: cleanTemplateSubject(parsed.subject || "", fallbackTitle),
      greeting: stripAttachmentNotes(parsed.greeting || ""),
      body: stripAttachmentNotes(parsed.body || parsed.content || ""),
      closing: stripAttachmentNotes(parsed.closing || ""),
      signature: stripAttachmentNotes(parsed.signature || ""),
    };
  } catch (error) {
    return {
      subject: cleanTemplateSubject("", fallbackTitle),
      greeting: "",
      body: stripAttachmentNotes(rawContent || ""),
      closing: "",
      signature: "",
    };
  }
};

export const mapApiTemplateToEditorTemplate = (template) => {
  const parsed = parseStoredTemplatePayload(template.content, template.title);
  const isDatabaseTemplate = Boolean(template.is_database_template);
  return {
    id: template.id,
    label: isDatabaseTemplate ? "Library" : template.access_level === "owner" ? "Saved" : "Shared",
    subject: parsed.subject || template.title || "",
    greeting: stripAttachmentNotes(parsed.greeting),
    body: stripAttachmentNotes(parsed.body),
    closing: stripAttachmentNotes(parsed.closing || template.footer || ""),
    signature: stripAttachmentNotes(parsed.signature || ""),
    accessLevel: template.access_level,
    isDatabaseTemplate,
    accessTier: isDatabaseTemplate ? template.access_tier || "free" : "",
    isFavorite: Boolean(template.is_favorite),
    category: template.category || "General",
    tags: Array.isArray(template.tags) ? template.tags : [],
    isArchived: Boolean(template.is_archived),
    deletedAt: template.deleted_at || null,
    ownerName: template.owner?.username || "",
    sharedWith: template.shared_with || [],
  };
};

export const parseToneList = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).length ? value.filter(Boolean) : ["Professional"];
  }

  const parsed = (value || "")
    .split(",")
    .map((tone) => tone.trim())
    .filter(Boolean);

  return parsed.length ? parsed : ["Professional"];
};

export const formatToneList = (tones) => {
  const normalized = parseToneList(tones);
  return normalized.length ? normalized.join(", ") : "Formal";
};

export const getTemplateSearchText = (template = {}) =>
  [
    template.subject,
    template.greeting,
    template.body,
    template.closing,
    template.signature,
    template.label,
    template.ownerName,
    template.category,
    ...(template.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

export const filterAndSortTemplates = (items = [], query = "", sortMode = "newest") => {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? items.filter((template) => getTemplateSearchText(template).includes(normalizedQuery))
    : [...items];

  if (sortMode === "oldest") {
    return [...filtered].reverse();
  }

  if (sortMode === "subject") {
    return [...filtered].sort((first, second) =>
      (first.subject || "").localeCompare(second.subject || "", undefined, { sensitivity: "base" })
    );
  }

  return filtered;
};

export const inferToneMode = (tones) => (parseToneList(tones).length > 1 ? "multiple" : "single");

export const openMailClient = (template) => {
  const subject = encodeURIComponent(template.subject || "");
  const body = encodeURIComponent(buildEmailBody(template));
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};

export const openGmailCompose = (template) => {
  const subject = encodeURIComponent(template.subject || "");
  const body = encodeURIComponent(buildEmailBody(template));
  window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
};
