export const TAB_ITEMS = [
  { label: "Generate", hash: "#generate" },
  { label: "Fresh Emails", hash: "#fresh-emails" },
  { label: "Template Library", hash: "#template-library" },
  { label: "My Templates", hash: "#templates" },
  { label: "History", hash: "#history" },
  { label: "Account", hash: "#account" },
];
export const GENERATE_STEPS = [
  {
    value: "prompt",
    label: "Prompt",
    title: "Tell the builder what you need",
    note: "Add the subject, intent, brand voice, and preferred language first.",
  },
  {
    value: "tone",
    label: "Tone",
    title: "Choose the voice",
    note: "Pick a single tone, a category, or blend multiple tones when needed.",
  },
  {
    value: "setup",
    label: "Setup",
    title: "Attach context and choose output count",
    note: "Add optional files and decide whether you want one draft or a few variations.",
  },
  {
    value: "workspace",
    label: "Edit",
    title: "Review and refine",
    note: "Generated emails can be edited, copied, exported, and saved.",
  },
];
export const TONE_GROUPS = [
  {
    label: "Professional Tone",
    options: ["Formal", "Professional", "Polite", "Respectful", "Confident", "Persuasive", "Direct", "Corporate", "Consultative", "Executive", "Analytical", "Diplomatic"],
  },
  {
    label: "Casual Tone",
    options: ["Friendly", "Casual", "Warm", "Excited", "Enthusiastic", "Inviting", "Playful", "Relaxed", "Optimistic", "Empathetic", "Conversational", "Cheerful"],
  },
  {
    label: "Campaign Tone",
    options: ["Urgent", "Luxury", "Supportive", "Bold", "Promotional", "Storytelling"],
  },
];
export const TONE_PRESETS = [
  { label: "Professional", note: "Clear business writing", toneMode: "single", tones: ["Professional"] },
  { label: "Casual", note: "Simple and friendly", toneMode: "single", tones: ["Friendly"] },
  { label: "Campaign", note: "Launch, sales, and CTA copy", toneMode: "single", tones: ["Persuasive"] },
  { label: "Multi Tone", note: "Balanced blend, no overthinking", toneMode: "multiple", tones: ["Professional", "Friendly", "Persuasive"] },
];
export const TONE_STRATEGY_FIT = [
  ["Professional", "Client updates, business replies, internal notes"],
  ["Friendly", "Follow-ups, welcomes, light relationship emails"],
  ["Persuasive", "Offers, launches, campaigns, stronger CTAs"],
];
export const TONE_BLUEPRINT = [
  ["Opening", "Set context fast"],
  ["Middle", "Land one clear reason"],
  ["Close", "End with a useful action"],
];
export const TONE_STYLES = {
  Formal: {
    accent: "from-zinc-900 via-slate-700 to-neutral-400",
    ring: "ring-slate-300",
    bg: "from-slate-100 to-white",
    text: "text-slate-800",
    note: "Classic and composed",
  },
  Professional: {
    accent: "from-blue-700 via-sky-600 to-cyan-500",
    ring: "ring-sky-300",
    bg: "from-sky-50 to-white",
    text: "text-sky-900",
    note: "Clean and credible",
  },
  Polite: {
    accent: "from-emerald-700 via-emerald-600 to-teal-500",
    ring: "ring-emerald-300",
    bg: "from-emerald-50 to-white",
    text: "text-emerald-900",
    note: "Soft and respectful",
  },
  Respectful: {
    accent: "from-teal-700 via-cyan-600 to-sky-500",
    ring: "ring-cyan-300",
    bg: "from-cyan-50 to-white",
    text: "text-cyan-900",
    note: "Measured and warm",
  },
  Confident: {
    accent: "from-amber-600 via-orange-500 to-rose-500",
    ring: "ring-orange-300",
    bg: "from-orange-50 to-white",
    text: "text-orange-900",
    note: "Strong and decisive",
  },
  Persuasive: {
    accent: "from-rose-700 via-pink-600 to-orange-500",
    ring: "ring-rose-300",
    bg: "from-rose-50 to-white",
    text: "text-rose-900",
    note: "Convincing and vivid",
  },
  Direct: {
    accent: "from-zinc-900 via-neutral-800 to-stone-700",
    ring: "ring-zinc-300",
    bg: "from-zinc-50 to-white",
    text: "text-zinc-900",
    note: "Straight to the point",
  },
  Corporate: {
    accent: "from-indigo-800 via-blue-700 to-slate-700",
    ring: "ring-indigo-300",
    bg: "from-indigo-50 to-white",
    text: "text-indigo-900",
    note: "Structured and official",
  },
  Friendly: {
    accent: "from-amber-500 via-orange-400 to-pink-400",
    ring: "ring-amber-300",
    bg: "from-amber-50 to-white",
    text: "text-amber-900",
    note: "Open and approachable",
  },
  Casual: {
    accent: "from-lime-500 via-emerald-400 to-teal-400",
    ring: "ring-lime-300",
    bg: "from-lime-50 to-white",
    text: "text-lime-900",
    note: "Relaxed and easy",
  },
  Warm: {
    accent: "from-orange-500 via-amber-400 to-yellow-300",
    ring: "ring-amber-300",
    bg: "from-orange-50 to-white",
    text: "text-orange-900",
    note: "Kind and human",
  },
  Excited: {
    accent: "from-fuchsia-600 via-rose-500 to-orange-400",
    ring: "ring-fuchsia-300",
    bg: "from-fuchsia-50 to-white",
    text: "text-fuchsia-900",
    note: "High energy",
  },
  Enthusiastic: {
    accent: "from-violet-600 via-fuchsia-500 to-pink-400",
    ring: "ring-violet-300",
    bg: "from-violet-50 to-white",
    text: "text-violet-900",
    note: "Bold momentum",
  },
  Inviting: {
    accent: "from-cyan-500 via-sky-400 to-indigo-400",
    ring: "ring-sky-300",
    bg: "from-sky-50 to-white",
    text: "text-sky-900",
    note: "Welcoming and bright",
  },
  Playful: {
    accent: "from-pink-500 via-rose-400 to-amber-300",
    ring: "ring-pink-300",
    bg: "from-pink-50 to-white",
    text: "text-pink-900",
    note: "Fun and lively",
  },
  Relaxed: {
    accent: "from-teal-500 via-emerald-400 to-lime-300",
    ring: "ring-teal-300",
    bg: "from-teal-50 to-white",
    text: "text-teal-900",
    note: "Calm and smooth",
  },
  Consultative: {
    accent: "from-cyan-700 via-sky-600 to-blue-500",
    ring: "ring-cyan-300",
    bg: "from-cyan-50 to-white",
    text: "text-cyan-900",
    note: "Insight-led and helpful",
  },
  Executive: {
    accent: "from-slate-900 via-slate-700 to-blue-700",
    ring: "ring-slate-300",
    bg: "from-slate-100 to-white",
    text: "text-slate-900",
    note: "Sharp and strategic",
  },
  Analytical: {
    accent: "from-cyan-800 via-blue-700 to-indigo-600",
    ring: "ring-cyan-300",
    bg: "from-cyan-50 to-white",
    text: "text-cyan-900",
    note: "Data-led and precise",
  },
  Diplomatic: {
    accent: "from-teal-800 via-emerald-700 to-slate-600",
    ring: "ring-teal-300",
    bg: "from-teal-50 to-white",
    text: "text-teal-900",
    note: "Balanced and tactful",
  },
  Optimistic: {
    accent: "from-lime-500 via-yellow-400 to-orange-400",
    ring: "ring-lime-300",
    bg: "from-lime-50 to-white",
    text: "text-lime-900",
    note: "Positive and upbeat",
  },
  Empathetic: {
    accent: "from-rose-500 via-pink-400 to-fuchsia-400",
    ring: "ring-rose-300",
    bg: "from-rose-50 to-white",
    text: "text-rose-900",
    note: "Thoughtful and human",
  },
  Conversational: {
    accent: "from-sky-600 via-cyan-500 to-teal-400",
    ring: "ring-sky-300",
    bg: "from-sky-50 to-white",
    text: "text-sky-900",
    note: "Natural and easy",
  },
  Cheerful: {
    accent: "from-yellow-500 via-amber-400 to-orange-400",
    ring: "ring-yellow-300",
    bg: "from-yellow-50 to-white",
    text: "text-yellow-900",
    note: "Bright and positive",
  },
  Urgent: {
    accent: "from-red-700 via-orange-600 to-amber-500",
    ring: "ring-red-300",
    bg: "from-red-50 to-white",
    text: "text-red-900",
    note: "Time-sensitive and clear",
  },
  Luxury: {
    accent: "from-stone-900 via-amber-700 to-yellow-600",
    ring: "ring-amber-300",
    bg: "from-amber-50 to-white",
    text: "text-amber-900",
    note: "Premium and polished",
  },
  Supportive: {
    accent: "from-emerald-700 via-teal-600 to-cyan-500",
    ring: "ring-emerald-300",
    bg: "from-emerald-50 to-white",
    text: "text-emerald-900",
    note: "Encouraging and calm",
  },
  Bold: {
    accent: "from-violet-700 via-fuchsia-600 to-rose-500",
    ring: "ring-violet-300",
    bg: "from-violet-50 to-white",
    text: "text-violet-900",
    note: "Punchy and high-impact",
  },
  Promotional: {
    accent: "from-pink-700 via-rose-600 to-orange-500",
    ring: "ring-pink-300",
    bg: "from-pink-50 to-white",
    text: "text-pink-900",
    note: "Offer-focused and clear",
  },
  Storytelling: {
    accent: "from-indigo-700 via-violet-600 to-fuchsia-500",
    ring: "ring-indigo-300",
    bg: "from-indigo-50 to-white",
    text: "text-indigo-900",
    note: "Narrative and memorable",
  },
};
export const VARIATION_OPTIONS = [1, 2, 3, 4];
export const VARIATION_LABELS = {
  1: "Fast pass",
  2: "A/B compare",
  3: "More range",
  4: "Full set",
};
export const getOllamaModelForDraftCount = (count, { hasAttachment = false, purpose = "" } = {}) => {
  const needsBetterWriting =
    hasAttachment ||
    /\b(detailed|long|comprehensive|in-depth|attachment|document)\b/i.test(purpose || "");

  return needsBetterWriting ? "qwen2.5:1.5b" : "llama3.2:1b";
};
export const WALKTHROUGH_EXAMPLES = [
  {
    eyebrow: "Interview Follow-Up",
    title: "A polished prompt for a professional follow-up email",
    description:
      "Clear goals and balanced tone choices lead to a thoughtful follow-up that sounds confident, appreciative, and ready for next steps.",
    subject: "Internship follow-up",
    purpose: "Thank the interviewer, show continued interest, and ask politely about next steps.",
    tones: ["Warm", "Professional"],
    outputSubject: "Thank You for the Interview Opportunity",
    greeting: "Hello [Name],",
    paragraphs: [
      "Thank you for taking the time to speak with me about the internship role. I enjoyed learning more about the team and the work you are doing.",
      "I remain very interested in the opportunity and would be glad to provide any further information if needed.",
    ],
    closing: "Best regards,",
  },
  {
    eyebrow: "Event Invitation",
    title: "A friendly sample that shifts into invitation mode",
    description:
      "This version shows how the same interface can guide a more relaxed message with warmer phrasing, shorter structure, and a welcoming invitation tone.",
    subject: "Birthday invitation",
    purpose: "Invite a friend to a birthday party this weekend and make the message feel cheerful and personal.",
    tones: ["Friendly", "Excited"],
    outputSubject: "Come Celebrate With Me This Weekend",
    greeting: "Hey [Friend],",
    paragraphs: [
      "I am celebrating my birthday this weekend and would love for you to join the party. It is going to be a fun evening with music, food, and a few close friends.",
      "It would make the day even more special to have you there, so let me know if you can come and I will send all the details.",
    ],
    closing: "See you soon,",
  },
  {
    eyebrow: "Sales Outreach",
    title: "A sharper outreach example for product or service pitching",
    description:
      "This walkthrough uses a more persuasive structure with a stronger hook, clearer value, and a call to action that feels direct without becoming pushy.",
    subject: "Product demo request",
    purpose: "Reach out to a lead, explain the product benefit clearly, and invite them to book a short demo.",
    tones: ["Persuasive", "Consultative"],
    outputSubject: "A Faster Way to Simplify Your Team Workflow",
    greeting: "Hello [Name],",
    paragraphs: [
      "I wanted to reach out because teams similar to yours often spend too much time managing work across scattered tools and repeated manual steps.",
      "Our platform helps bring those workflows into one place, saving time and giving your team clearer visibility. If helpful, I would be glad to show you a short demo tailored to your use case.",
    ],
    closing: "Best,",
  },
  {
    eyebrow: "Customer Support",
    title: "A warmer sample for a reassuring support response",
    description:
      "Here the writing shifts toward empathy and clarity, showing how the builder can create calmer service emails that still move the conversation forward.",
    subject: "Order delay update",
    purpose: "Apologize for a delay, explain the situation simply, and reassure the customer with a next-step update.",
    tones: ["Empathetic", "Supportive"],
    outputSubject: "Update on Your Order and Next Steps",
    greeting: "Hi [Customer Name],",
    paragraphs: [
      "I am sorry for the delay with your order and understand how frustrating that can be. I wanted to share a quick update so you know exactly where things stand.",
      "Our team is actively working to resolve the issue, and we expect to have a clearer shipping update for you soon. We appreciate your patience and are here if you need anything in the meantime.",
    ],
    closing: "Warmly,",
  },
];

export const LANGUAGE_OPTIONS = [
  { label: "English", note: "Global default", accent: "from-slate-900 via-slate-700 to-slate-600" },
  { label: "Spanish", note: "Warm and broad", accent: "from-orange-600 via-amber-500 to-yellow-400" },
  { label: "French", note: "Refined and polished", accent: "from-indigo-700 via-blue-600 to-cyan-500" },
  { label: "German", note: "Clear and precise", accent: "from-zinc-900 via-neutral-700 to-stone-500" },
  { label: "Japanese", note: "Elegant and concise", accent: "from-rose-700 via-pink-600 to-fuchsia-500" },
  { label: "Chinese", note: "Direct and scalable", accent: "from-red-700 via-orange-600 to-amber-500" },
];
export const PROMPT_STARTERS = [
  {
    label: "Job follow-up",
    subject: "Interview follow-up",
    purpose: "Thank the interviewer, show continued interest, and ask about next steps.",
  },
  {
    label: "Sales outreach",
    subject: "Introductory outreach",
    purpose: "Introduce the product, explain the core value, and invite the reader to book a short demo.",
  },
  {
    label: "Customer support",
    subject: "Support follow-up",
    purpose: "Acknowledge the issue, reassure the customer, and explain the next step clearly.",
  },
  {
    label: "Event invite",
    subject: "Event invitation",
    purpose: "Invite the reader warmly, share the key details, and make the email feel personal and upbeat.",
  },
];
export const BRAND_VOICE_PRESETS = [
  "Warm and trustworthy",
  "Sharp and executive",
  "Playful and upbeat",
  "Luxury and premium",
];
export const FONT_OPTIONS = ["Georgia", "Arial", "Trebuchet MS", "Verdana"];
export const COLOR_THEMES = [
  { name: "Sunrise", accent: "#f97316", background: "#fff7ed", panel: "#ffffff" },
  { name: "Ocean", accent: "#0284c7", background: "#eff6ff", panel: "#ffffff" },
  { name: "Forest", accent: "#059669", background: "#ecfdf5", panel: "#ffffff" },
  { name: "Graphite", accent: "#334155", background: "#f8fafc", panel: "#ffffff" },
];
export const STORAGE_KEYS = {
  savedTemplates: "email-builder.saved-templates",
  userProfile: "email-builder.user-profile",
  favorites: "email-builder.favorite-template-ids",
  draft: "email-builder.draft",
  brandVoice: "email-builder.brand-voice",
};
