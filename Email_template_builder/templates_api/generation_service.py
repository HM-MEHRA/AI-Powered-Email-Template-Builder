from django.conf import settings
import io
from html import unescape
import json
import logging
import os
import re
import urllib.request
import urllib.error
import zipfile
from openai import OpenAI
from .models import EmailGenerationHistory
from .serializers import EmailGenerationHistorySerializer

logger = logging.getLogger(__name__)


class OllamaGenerationError(RuntimeError):
    pass


def friendly_ollama_error(error, model: str = ""):
    model_hint = model or DEFAULT_OLLAMA_MODEL
    if isinstance(error, urllib.error.HTTPError):
        if error.code == 404:
            return f"Ollama model '{model_hint}' is not installed. Run: ollama pull {model_hint}"
        return f"Ollama returned HTTP {error.code}. Check that Ollama is running and the model '{model_hint}' is available."
    if isinstance(error, urllib.error.URLError):
        return "Ollama is not running. Start Ollama, then make sure llama3.2:1b or qwen2.5:1.5b is installed."
    if isinstance(error, TimeoutError):
        return f"Ollama took too long to respond with '{model_hint}'. Try the fast model or restart Ollama."
    message = str(error).strip()
    return message or f"Ollama could not generate with '{model_hint}'."


DEFAULT_OLLAMA_MODEL = getattr(settings, "OLLAMA_MODEL", "llama3.2")
ALLOWED_OLLAMA_MODELS = {
    DEFAULT_OLLAMA_MODEL,
    "llama3.2:1b",
    "qwen2.5:1.5b",
}


def normalize_ollama_model(model: str = ""):
    requested_model = (model or "").strip()
    return requested_model if requested_model in ALLOWED_OLLAMA_MODELS else DEFAULT_OLLAMA_MODEL


def ollama_model_candidates(model: str = ""):
    preferred_model = normalize_ollama_model(model)
    return [preferred_model]


def ollama_timeout_seconds(model: str = ""):
    configured_timeout = getattr(settings, "OLLAMA_TIMEOUT", None)
    if configured_timeout:
        try:
            return max(8, int(configured_timeout))
        except (TypeError, ValueError):
            pass

    return 90 if model == "qwen2.5:1.5b" else 60


def ollama_num_predict(length_pref: str = "", style_guide: dict | None = None):
    length_label = str((style_guide or {}).get("length") or length_pref or "").lower()
    if "long" in length_label:
        return 230
    if "medium" in length_label:
        return 170
    return 130


def compact_ollama_context(subject: str, purpose: str, prompt: str):
    clean_subject = (subject or "Generated Email").strip()
    clean_goal = (purpose or prompt or clean_subject).strip()
    context = (prompt or "").strip()
    repeated_context = {
        clean_subject,
        clean_goal,
        f"{clean_subject}. {clean_goal}".strip(),
    }
    if context in repeated_context:
        context = ""
    return clean_subject, clean_goal, context[:1000]


TONE_LABELS = [
    "Formal",
    "Professional",
    "Polite",
    "Respectful",
    "Confident",
    "Persuasive",
    "Direct",
    "Corporate",
    "Friendly",
    "Casual",
    "Warm",
    "Excited",
    "Enthusiastic",
    "Inviting",
    "Playful",
    "Relaxed",
]

def parse_requested_tones(tone_value):
    if isinstance(tone_value, list):
        tones = [str(item).strip() for item in tone_value if str(item).strip()]
    else:
        tones = [item.strip() for item in str(tone_value or "").split(",") if item.strip()]

    return tones or ["Professional"]

def serialize_requested_tones(tone_value):
    return ", ".join(parse_requested_tones(tone_value))

def select_tone_for_index(tone_value, index: int = 0):
    tones = parse_requested_tones(tone_value)
    return tones[index % len(tones)]

def detect_length(prompt: str):
    p = (prompt or "").lower()
    tokens = set(p.replace(".", " ").replace(",", " ").split())
    if "long" in tokens or any(k in p for k in ["very long", "detailed", "in detail", "elaborate", "long email", "write long", "longer"]):
        return "long"
    if "short" in tokens or any(k in p for k in ["brief", "concise", "one paragraph"]):
        return "short"
    return "medium"

def expand_or_trim_content(content: str, length: str, topic: str):
    if length == "short":
        parts = [x.strip() for x in content.split("\n\n") if x.strip()]
        # Keep greeting + one body paragraph + closing paragraph
        if len(parts) >= 3:
            return "\n\n".join([parts[0], parts[1], parts[-1]])
        return content

    if length == "long":
        return content

    return content

def sanitize_prompt_topic(prompt: str):
    text = (prompt or "").strip()
    if not text:
        return "general update"

    text = re.sub(
        r"(?i)\b(?:brand\s+voice|language|selected\s+tone|tone)\s*:\s*[^.\n]*(?:\.|\n|$)",
        " ",
        text,
    )

    # Remove common instruction prefixes so content doesn't echo raw prompt commands.
    text = re.sub(
        r"^\s*(please\s+)?(write|draft|create|generate)\s+(me\s+)?(a|an)?\s*",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"^\s*(email|mail)\s*", "", text, flags=re.IGNORECASE)

    # Remove common instruction suffixes.
    cleanup_phrases = [
        "keep it short and respectful",
        "keep it short",
        "keep it respectful",
        "keep it concise",
        "in a formal tone",
        "in formal tone",
        "in a professional tone",
        "in professional tone",
    ]
    lowered = text.lower()
    for phrase in cleanup_phrases:
        lowered = lowered.replace(phrase, "")

    cleaned = " ".join(lowered.replace("..", ".").split()).strip(" .")
    return cleaned if cleaned else "the requested topic"

def normalize_text(value: str):
    text = (value or "").strip()
    # Fix common mojibake seen from local model responses.
    fixes = {
        "â€™": "'",
        "â€œ": "\"",
        "â€": "\"",
        "â€“": "-",
        "â€”": "-",
    }
    for bad, good in fixes.items():
        text = text.replace(bad, good)
    return text

def build_prompt_from_parts(subject: str, purpose: str, prompt: str):
    subject = (subject or "").strip()
    purpose = (purpose or "").strip()
    prompt = (prompt or "").strip()

    if subject and purpose:
        return f"{subject}. {purpose}"
    if purpose:
        return purpose
    if subject:
        return subject
    return prompt

def extract_text_from_pdf_bytes(file_bytes: bytes):
    decoded = file_bytes.decode("latin-1", errors="ignore")
    matches = re.findall(r"\(([^()]*)\)", decoded)
    text = " ".join(unescape(match) for match in matches)
    return re.sub(r"\s+", " ", text).strip()

def extract_text_from_docx_bytes(file_bytes: bytes):
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx_file:
            xml_bytes = docx_file.read("word/document.xml")
    except Exception:
        return ""

    xml_text = xml_bytes.decode("utf-8", errors="ignore")
    text = re.sub(r"<[^>]+>", " ", xml_text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()

def extract_text_from_doc_bytes(file_bytes: bytes):
    decoded = file_bytes.decode("latin-1", errors="ignore")
    matches = re.findall(r"[A-Za-z0-9][A-Za-z0-9 ,.'()/-]{20,}", decoded)
    text = " ".join(matches)
    return re.sub(r"\s+", " ", text).strip()

def extract_uploaded_file_context(uploaded_file):
    if not uploaded_file:
        return ""

    file_name = uploaded_file.name or "uploaded file"
    extension = os.path.splitext(file_name)[1].lower()
    file_bytes = uploaded_file.read()
    uploaded_file.seek(0)

    extracted_text = ""
    if extension == ".txt":
        extracted_text = file_bytes.decode("utf-8", errors="ignore")
    elif extension == ".pdf":
        extracted_text = extract_text_from_pdf_bytes(file_bytes)
    elif extension == ".docx":
        extracted_text = extract_text_from_docx_bytes(file_bytes)
    elif extension == ".doc":
        extracted_text = extract_text_from_doc_bytes(file_bytes)
    elif extension in [".png", ".jpg", ".jpeg"]:
        return (
            "Attached image context: the user uploaded an image for visual reference. "
            "Use it only as supporting context if relevant. Do not mention the image filename, "
            "do not write an attachment note, and do not insert placeholders such as [Image: ...]."
        )

    cleaned_text = re.sub(r"\s+", " ", (extracted_text or "")).strip()
    if not cleaned_text:
        return (
            "Attached file context: the user uploaded a supporting file. Use it only if helpful. "
            "Do not mention the file name or write attachment placeholders in the email."
        )

    snippet = cleaned_text[:2000]
    return (
        f"Attached file context: {snippet}. "
        "Use this only as background context. Do not mention the file name or write attachment placeholders in the email."
    )

BAD_GENERATION_LINE_PATTERNS = [
    r"\bplease feel free to share suggestions\b",
    r"\bi wanted to provide more context\b",
    r"\bi can prepare a follow-up summary\b",
    r"\battached (image|file|document|pdf)\b",
    r"\bsee the attached\b",
    r"\bimage attached\b",
    r"\bbrand\s+voice\s*:",
    r"\blanguage\s*:",
    r"\bselected\s+tone\s*:",
    r"\bi wanted (?:this|the) message to\b",
    r"\bit also helps the message\b",
    r"\bthe message below is intended\b",
    r"\bthe goal was to make the message\b",
    r"\bthis draft is written to\b",
    r"\bthe result is a message\b",
    r"\bthis version (?:is|was)\b",
    r"\bto make it sound\b",
    r"\bto ensure (?:it|the message)\b",
    r"\bclear,\s*natural,\s*and easy to understand\b",
    r"\bread more like a real conversation\b",
]

GENERIC_WEAK_PHRASE_PATTERNS = [
    r"\bhere is (an?|the) email\b",
    r"\bas per your request\b",
    r"\bi hope this (email|message) finds you well\b",
    r"\bi trust this (email|message) finds you well\b",
    r"\bi am writing to you today\b",
    r"\bin today'?s fast[- ]paced world\b",
    r"\bthank you for considering this matter\b",
    r"\bif you have any questions or concerns\b",
    r"\bplease do not hesitate to contact me\b",
    r"\bplease find attached\b",
    r"\bthis email is to inform you\b",
    r"\bthis is a detailed email explaining\b",
    r"\bin reference to your request\b",
    r"\bas requested\b",
    r"\bi am reaching out to you today\b",
    r"\bkindly consider my request\b",
    r"\blet me know your response\b",
    r"\bplease check\b",
    r"\bregarding the above\b",
    r"\bfor your kind consideration\b",
]

def dedupe_generated_paragraphs(text: str):
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text or "") if part.strip()]
    result = []
    seen = set()

    for paragraph in paragraphs:
        key = re.sub(r"[^a-z0-9]+", " ", paragraph.lower()).strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result.append(paragraph)

    return "\n\n".join(result)

def strip_bad_generation_lines(text: str):
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", text or "") if part.strip()]
    cleaned = []

    for paragraph in paragraphs:
        compact = re.sub(r"\s+", " ", paragraph).strip()
        is_short_bad_line = len(compact.split()) <= 18 and any(
            re.search(pattern, compact, flags=re.IGNORECASE) for pattern in BAD_GENERATION_LINE_PATTERNS
        )
        if is_short_bad_line:
            continue
        cleaned.append(paragraph)

    return "\n\n".join(cleaned)

def strip_bad_generation_sentences(text: str):
    cleaned_paragraphs = []
    for paragraph in [part.strip() for part in re.split(r"\n\s*\n", text or "") if part.strip()]:
        kept_sentences = []
        for sentence in re.split(r"(?<=[.!?])\s+", paragraph):
            compact = re.sub(r"\s+", " ", sentence).strip()
            if not compact:
                continue
            if any(re.search(pattern, compact, flags=re.IGNORECASE) for pattern in BAD_GENERATION_LINE_PATTERNS):
                continue
            kept_sentences.append(compact)
        if kept_sentences:
            cleaned_paragraphs.append(" ".join(kept_sentences))

    return "\n\n".join(cleaned_paragraphs)

def clean_generated_body(body: str):
    text = normalize_text(body or "")
    text = re.sub(r"(?im)^\s*(subject|purpose|prompt|goal|tone|brand\s+voice|language|selected\s+tone)\s*:\s*.*(?:\n|$)", "", text)
    text = re.sub(r"(?i)\b(?:brand\s+voice|language|selected\s+tone)\s*:\s*[^.\n]*(?:\.|\n|$)", " ", text)
    text = re.sub(r"(?i)\b(?:invite|write|draft|create|generate)\s+(?:the\s+)?(?:family|friends|relatives)[^.?!]*(?:brand\s+voice|language)[^.?!]*(?:[.?!]|$)", " ", text)
    text = re.sub(r"(?im)^\s*\[(?:image|img|photo|picture|file|attachment|document|pdf)\s*:\s*[^\]]+\]\s*$", "", text)
    text = re.sub(r"(?i)\s*\[(?:image|img|photo|picture|file|attachment|document|pdf)\s*:\s*[^\]]+\]", "", text)
    text = strip_bad_generation_lines(text)
    text = strip_bad_generation_sentences(text)
    text = dedupe_generated_paragraphs(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()

def clean_subject_line(value: str, fallback: str = ""):
    text = normalize_text(value or "")
    text = re.sub(r"(?im)^subject\s*:\s*", "", text).strip()
    text = text.splitlines()[0].strip() if text else ""
    text = re.sub(r"\s+", " ", text)

    # If the model puts sentence/body content into the subject, fall back.
    body_like = (
        len(text.split()) > 12
        or "\n" in (value or "")
        or any(phrase in text.lower() for phrase in ["i am ", "i wanted", "please let me", "thank you for", "it would mean", "i would like"])
    )
    if not text or body_like or is_placeholder_subject_line(text):
        text = fallback_subject_line(fallback)

    return text[:100].strip(" .,-")

def clean_signature_line(value: str):
    text = normalize_text(value or "").strip()
    if not text:
        return ""
    if re.search(
        r"\[(?:your\s+)?(?:name|contact|contact\s+information|signature)[^\]]*\]",
        text,
        flags=re.IGNORECASE,
    ):
        return "[Your Name]"
    if re.search(r"\b(?:your contact information|contact information here)\b", text, flags=re.IGNORECASE):
        return "[Your Name]"
    return text

def choose_greeting(tone: str):
    tone_lower = (tone or "").lower()
    if tone_lower in ["friendly", "casual", "warm", "inviting", "relaxed"]:
        return "Hi there,"
    if tone_lower in ["excited", "enthusiastic", "playful"]:
        return "Hey,"
    if tone_lower == "formal":
        return "Dear [Recipient Name],"
    if tone_lower in ["polite", "respectful", "corporate"]:
        return "Dear [Recipient Name],"
    return "Hello,"

def choose_footer(tone: str):
    tone_lower = (tone or "").lower()
    if tone_lower in ["formal", "professional", "corporate"]:
        return "Best regards,\n[Your Name]"
    if tone_lower in ["polite", "respectful"]:
        return "Sincerely,\n[Your Name]"
    if tone_lower == "casual":
        return "Thanks,\n[Your Name]"
    if tone_lower in ["friendly", "warm", "inviting", "relaxed"]:
        return "Warmly,\n[Your Name]"
    if tone_lower in ["excited", "enthusiastic", "playful"]:
        return "Can't wait,\n[Your Name]"
    return "Best,\n[Your Name]"

def sentence_case(value: str):
    text = (value or "").strip()
    if not text:
        return ""
    return text[0].upper() + text[1:]

def title_case_phrase(value: str):
    text = re.sub(r"\s+", " ", (value or "").strip())
    if not text:
        return ""
    return " ".join(word.capitalize() if word.islower() else word for word in text.split())

def is_placeholder_subject_line(value: str):
    text = normalize_text(value or "").strip().strip("[]{}():.-_")
    normalized = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
    return normalized in {
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
    }

def fallback_subject_line(fallback: str):
    text = normalize_text(fallback or "").strip()
    text = re.sub(r"(?im)^subject\s*:\s*", "", text).strip()
    text = text.splitlines()[0].strip() if text else ""
    if not text or is_placeholder_subject_line(text):
        text = "Generated Email"
    return title_case_phrase(text)

def is_short_brief(subject: str, purpose: str):
    combined = " ".join(part for part in [subject, purpose] if part).strip()
    return len(combined.split()) <= 4

def infer_email_scenario(subject: str, purpose: str):
    text = f"{subject} {purpose}".lower()
    if any(term in text for term in ["birthday", "party", "invite", "invitation", "celebration"]):
        return "invitation"
    if any(term in text for term in ["job", "internship", "application", "resume", "cover letter"]):
        return "application"
    if any(term in text for term in ["meeting", "schedule", "discussion", "appointment"]):
        return "meeting"
    if any(term in text for term in ["leave", "vacation", "time off"]):
        return "leave"
    if any(term in text for term in ["thank you", "thanks", "gratitude", "appreciation"]):
        return "thanks"
    return "general"

def invitation_audience_sentence(purpose: str):
    text = sanitize_prompt_topic(purpose).lower()
    text = re.sub(r"^(invite|inviting|ask)\s+", "", text).strip(" ,.")
    text = re.sub(r"\bto\s+(a|the)?\s*(birthday|party|celebration).*$", "", text).strip(" ,.")
    text = re.sub(r"\brelative\b", "relatives", text)
    text = text.replace("the family and friends and relatives", "family, friends, and relatives")
    text = text.replace("family and friends and relatives", "family, friends, and relatives")
    if text and 1 <= len(text.split()) <= 10:
        return f"It would mean a lot to have {text} there with us."
    return ""

def natural_event_phrase(subject: str):
    phrase = (subject or "the event").strip().lower()
    if phrase.startswith(("a ", "an ", "the ")):
        return phrase
    return f"the {phrase}"

def build_scenario_paragraphs(subject: str, purpose: str, tone: str, scenario: str):
    clean_subject = sentence_case(subject or "Generated Email")
    clean_purpose = sentence_case(sanitize_prompt_topic(purpose or subject or "general update"))
    tone_lower = (tone or "").lower()

    if scenario == "invitation":
        audience_sentence = invitation_audience_sentence(purpose)
        event_phrase = natural_event_phrase(clean_subject)
        intro = f"I'm planning {event_phrase}, and I'd love for you to join us."
        body_one = audience_sentence or "It would mean a lot to have you there."
        body_one += " We'll keep it relaxed, happy, and full of good moments together."
        body_two = "I'll share the time and place soon. Just let me know if you can make it."
        if tone_lower in ["formal", "professional", "corporate", "polite", "respectful"]:
            intro = f"I would like to invite you to {event_phrase}."
            body_one = (
                f"{audience_sentence} Your presence would be greatly appreciated, and it would be a pleasure to celebrate together."
                if audience_sentence
                else "Your presence would be greatly appreciated, and it would be a pleasure to celebrate together."
            )
            body_one += " I am sending this note early so you have enough time to plan."
            body_two = "I will share the date, time, and location once everything is confirmed."
    elif scenario == "application":
        intro = f"I am writing to express my interest in {clean_subject.lower()} and to briefly introduce why I believe I would be a strong fit."
        body_one = "My background has helped me build a solid foundation in communication, responsibility, and problem-solving, and I am eager to apply those strengths in a practical setting."
        body_two = "I would value the opportunity to contribute, learn from your team, and take ownership of meaningful work. If helpful, I would be glad to share my resume or any additional information."
    elif scenario == "meeting":
        intro = f"I am reaching out to request a meeting regarding {clean_subject.lower()}."
        body_one = f"The goal is to discuss {clean_purpose.lower()} and make sure we are aligned on the next steps, expectations, and any decisions that need attention."
        body_two = "Please let me know a time that works for you, and I will be happy to adjust my schedule accordingly."
    elif scenario == "leave":
        intro = f"I am writing to request leave in connection with {clean_subject.lower()}."
        body_one = f"{clean_purpose} I am sharing this request in advance so work can be planned smoothly and responsibilities can be handed over properly."
        body_two = "I will make sure that any urgent tasks are addressed before the leave period begins. Please let me know if you need any additional information from me."
    elif scenario == "thanks":
        intro = f"I wanted to take a moment to thank you regarding {clean_subject.lower()}."
        body_one = "Your support and time have made a real difference, and I genuinely appreciate the effort behind it."
        body_two = "I did not want to let the moment pass without acknowledging it properly. Thank you again for your help and consideration."
    else:
        intro = f"I am writing regarding {clean_subject.lower()}."
        body_one = f"The main point is {clean_purpose.lower()}."
        body_two = "Please let me know your thoughts when you have a chance. I would be glad to provide any additional details that would be helpful."

    if tone_lower in ["friendly", "casual", "warm", "relaxed", "inviting"] and scenario != "invitation":
        body_two = "I would be happy to hear what works best for you and keep things simple from here."
    if tone_lower in ["confident", "persuasive", "direct"]:
        body_two = "Please let me know the best next step, and I will move forward right away."

    return intro, body_one, body_two

def has_attachment_artifacts(text: str):
    return bool(
        re.search(r"\[(?:image|img|photo|picture|file|attachment|document|pdf)\s*:", text or "", flags=re.IGNORECASE)
        or re.search(r"\b(attached image|attached file|see the attached|image attached)\b", text or "", flags=re.IGNORECASE)
    )

def has_repeated_sentences(text: str):
    sentences = [
        re.sub(r"[^a-z0-9]+", " ", sentence.lower()).strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text or "")
        if sentence.strip()
    ]
    long_sentences = [sentence for sentence in sentences if len(sentence.split()) >= 6]
    return len(long_sentences) != len(set(long_sentences))

def generic_weak_phrase_count(text: str):
    compact = re.sub(r"\s+", " ", text or "").strip()
    return sum(
        1 for pattern in GENERIC_WEAK_PHRASE_PATTERNS if re.search(pattern, compact, flags=re.IGNORECASE)
    )

def has_weird_placeholders(text: str):
    return bool(
        re.search(r"\[(?:recipient|client|customer|insert|placeholder|company|event|date|time|location|your name)[^\]]*\]", text or "", flags=re.IGNORECASE)
    )

def build_quality_repair_body(subject: str, tone: str, purpose: str = ""):
    scenario = infer_email_scenario(subject, purpose)
    intro, body_one, body_two = build_scenario_paragraphs(subject, purpose or subject, tone, scenario)
    return clean_generated_body("\n\n".join([intro, body_one, body_two]))

def is_low_quality_body(body: str):
    clean_body = clean_generated_body(body)
    words = re.findall(r"[A-Za-z0-9']+", clean_body)
    paragraphs = [part for part in re.split(r"\n\s*\n", clean_body) if part.strip()]

    if has_attachment_artifacts(body):
        return True
    if len(words) < 18:
        return True
    if len(paragraphs) < 1:
        return True
    if has_repeated_sentences(clean_body):
        return True
    if has_weird_placeholders(clean_body):
        return True
    weak_phrase_count = generic_weak_phrase_count(clean_body)
    if weak_phrase_count >= 2:
        return True
    if weak_phrase_count >= 1 and len(words) < 35:
        return True

    return False

def is_low_quality_variation(item):
    if not item:
        return True
    return is_low_quality_body(item.get("body") or item.get("content") or "")

def human_subject_variants(subject: str, purpose: str, scenario: str):
    base = title_case_phrase(subject or "Generated Email")
    purpose_text = sanitize_prompt_topic(purpose or subject or "general update")
    purpose_short = title_case_phrase(" ".join(purpose_text.split()[:5]))

    if scenario == "invitation":
        candidates = [
            f"Invitation: {base}",
            f"You're Invited to {base}",
            f"Join Us for {base}",
            f"{base} Celebration Details",
            f"Save the Date for {base}",
        ]
    elif scenario == "application":
        candidates = [
            f"Application for {base}",
            f"Applying for {base}",
            f"Interest in {base}",
            f"{base} Application",
            f"Candidate Note for {base}",
        ]
    elif scenario == "meeting":
        candidates = [
            f"Meeting Request: {base}",
            f"Discussion on {base}",
            f"Scheduling Time for {base}",
            f"{base} Next Steps",
            f"Request to Connect About {base}",
        ]
    elif scenario == "leave":
        candidates = [
            f"Leave Request: {base}",
            f"Request for Time Off",
            f"Leave Application for {base}",
            f"Planned Leave Request",
            f"Time Off Request",
        ]
    elif scenario == "thanks":
        candidates = [
            f"Thank You for Your Support",
            f"Appreciation for {base}",
            f"A Note of Thanks",
            f"Thank You Regarding {base}",
            f"Grateful for Your Help",
        ]
    else:
        candidates = [
            base,
            f"{base} - {purpose_short}" if purpose_short else base,
            f"Regarding {base}",
            f"{base} Update",
            f"Next Steps on {base}",
        ]

    deduped = []
    seen = set()
    for candidate in candidates:
        clean = re.sub(r"\s+", " ", candidate.strip(" -"))
        key = clean.lower()
        if clean and key not in seen:
            seen.add(key)
            deduped.append(clean)
    return deduped

def distinct_variation_blueprints(subject: str, purpose: str, tone: str, scenario: str):
    clean_subject = title_case_phrase(subject or "Generated Email")
    scenario_intro, scenario_body_one, scenario_body_two = build_scenario_paragraphs(subject, purpose, tone, scenario)

    if scenario == "invitation":
        return [
            {
                "style": "clear",
                "subject_suffix": None,
                "paragraphs": [scenario_intro, scenario_body_one, scenario_body_two],
            },
            {
                "style": "warm",
                "subject_suffix": "Warm Invite",
                "paragraphs": [
                    f"I'd be really happy to have you with us for {natural_event_phrase(clean_subject)}.",
                    scenario_body_one,
                    "I hope you can make it. It would not feel the same without everyone together.",
                ],
            },
            {
                "style": "detailed",
                "subject_suffix": "Details",
                "paragraphs": [
                    scenario_intro,
                    scenario_body_one,
                    "I'm still finalizing the exact details, but I'm sharing this early so you have time to plan.",
                    scenario_body_two,
                ],
            },
            {
                "style": "direct",
                "subject_suffix": "Can You Make It?",
                "paragraphs": [
                    f"Quick invite for {natural_event_phrase(clean_subject)}.",
                    scenario_body_one,
                    "Let me know if you can come, and I'll send the final details soon.",
                ],
            },
            {
                "style": "polished",
                "subject_suffix": "Invitation",
                "paragraphs": [
                    scenario_intro,
                    scenario_body_one,
                    "I hope you will be able to join us and make the day even more special.",
                    scenario_body_two,
                ],
            },
        ]

    return [
        {
            "style": "clear",
            "subject_suffix": None,
            "paragraphs": [
                scenario_intro,
                scenario_body_one,
                scenario_body_two,
            ],
        },
        {
            "style": "warm",
            "subject_suffix": "Warm Note",
            "paragraphs": [
                f"I am reaching out personally about {clean_subject.lower()}.",
                scenario_body_one,
                scenario_body_two,
            ],
        },
        {
            "style": "detailed",
            "subject_suffix": "Details",
            "paragraphs": [
                f"I am writing about {clean_subject.lower()} with a few helpful details.",
                scenario_body_one,
                scenario_body_two,
                "I will keep you updated as soon as the remaining details are ready.",
            ],
        },
        {
            "style": "direct",
            "subject_suffix": "Next Steps",
            "paragraphs": [
                f"A quick note regarding {clean_subject.lower()}.",
                scenario_body_one,
                "Please let me know the best next step, and I will respond quickly.",
            ],
        },
        {
            "style": "polished",
            "subject_suffix": "Follow-Up",
            "paragraphs": [
                f"I am following up regarding {clean_subject.lower()}.",
                scenario_body_one,
                scenario_body_two,
                "Thank you for your time and consideration.",
            ],
        },
    ]

def scenario_call_to_actions(scenario: str):
    if scenario == "invitation":
        return [
            "I'll share the time and place soon. Just let me know if you can make it.",
            "I hope you can make it. It would be lovely to have everyone together.",
            "Let me know if you can come, and I'll send the final details soon.",
            "I hope you can join us and make the day even more special.",
            "Just let me know what works for you, and I'll keep you updated.",
        ]
    if scenario == "meeting":
        return [
            "Let me know what time works best for you, and I'll adjust accordingly.",
            "If you're available, I'd be happy to set up a time that works for both of us.",
            "Please share a suitable time, and I'll send over the meeting details.",
            "Once you confirm your availability, I'll take care of the next step.",
            "Let me know your preferred slot, and we can move from there.",
        ]
    if scenario == "application":
        return [
            "I'd be grateful for the opportunity to discuss this further.",
            "Please let me know if I can share anything else to support my application.",
            "I would appreciate the chance to speak with you about the role.",
            "I'm happy to provide any additional details you may need.",
            "Thank you for considering my application.",
        ]
    return [
        "Please let me know your thoughts when you have a moment.",
        "If this works for you, I would be glad to take the next step right away.",
        "I would appreciate your feedback so we can move ahead with confidence.",
        "Please share any updates or preferences, and I will adjust accordingly.",
        "Let me know the best way to proceed, and I will handle the follow-through from here.",
    ]

def apply_subject_suffix(subject_line: str, suffix: str | None):
    if not suffix:
        return subject_line
    if suffix.lower() in subject_line.lower():
        return subject_line
    return f"{subject_line} - {suffix}"

def variation_fingerprint(item):
    text = " ".join(
        [
            normalize_text(item.get("subject") or ""),
            normalize_text(item.get("greeting") or ""),
            clean_generated_body(item.get("body") or ""),
            normalize_text(item.get("closing") or ""),
        ]
    ).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())

def tone_greeting_variants(tone: str):
    tone_lower = (tone or "").lower()
    if tone_lower in ["excited", "enthusiastic", "playful"]:
        return ["Hey,", "Hi there!", "Hello!", "Hey everyone,", "Hi!"]
    if tone_lower in ["friendly", "warm", "inviting", "relaxed", "casual"]:
        return ["Hi there,", "Hi,", "Hello,", "Hey,", "Hi everyone,"]
    if tone_lower in ["formal", "polite", "respectful", "corporate"]:
        return [
            "Dear [Recipient Name],",
            "Hello [Recipient Name],",
            "Dear Sir/Madam,",
            "Good day,",
            "Dear Team,",
        ]
    if tone_lower in ["confident", "persuasive", "direct"]:
        return ["Hello,", "Hi,", "Good day,", "Hello [Recipient Name],", "Hi there,"]
    return ["Hello,", "Hi,", "Hello [Recipient Name],", "Good day,", "Hi there,"]

def tone_closing_variants(tone: str):
    tone_lower = (tone or "").lower()
    if tone_lower in ["excited", "enthusiastic", "playful"]:
        return [
            ("Can't wait,", "[Your Name]"),
            ("Looking forward,", "[Your Name]"),
            ("See you soon,", "[Your Name]"),
            ("With excitement,", "[Your Name]"),
            ("Talk soon,", "[Your Name]"),
        ]
    if tone_lower in ["friendly", "warm", "inviting", "relaxed", "casual"]:
        return [
            ("Warmly,", "[Your Name]"),
            ("Thanks,", "[Your Name]"),
            ("Take care,", "[Your Name]"),
            ("Best,", "[Your Name]"),
            ("See you soon,", "[Your Name]"),
        ]
    if tone_lower in ["formal", "polite", "respectful", "corporate"]:
        return [
            ("Sincerely,", "[Your Name]"),
            ("Best regards,", "[Your Name]"),
            ("Kind regards,", "[Your Name]"),
            ("Respectfully,", "[Your Name]"),
            ("Yours sincerely,", "[Your Name]"),
        ]
    if tone_lower in ["confident", "persuasive", "direct"]:
        return [
            ("Best,", "[Your Name]"),
            ("Regards,", "[Your Name]"),
            ("Looking forward to your response,", "[Your Name]"),
            ("Thank you,", "[Your Name]"),
            ("Best regards,", "[Your Name]"),
        ]
    return [
        ("Best regards,", "[Your Name]"),
        ("Best,", "[Your Name]"),
        ("Kind regards,", "[Your Name]"),
        ("Thank you,", "[Your Name]"),
        ("Sincerely,", "[Your Name]"),
    ]

def subject_variants(subject: str, scenario: str):
    return human_subject_variants(subject, "", scenario)

def split_footer(footer: str):
    parts = [line.strip() for line in (footer or "").splitlines() if line.strip()]
    if not parts:
        return "Best regards,", "Your Name"
    if len(parts) == 1:
        return parts[0], "Your Name"
    return parts[0], "\n".join(parts[1:])

def sequential_style_guides(tone: str, variation_count: int):
    tone_label = (tone or "Professional").strip()
    guides = [
        {"style": "clear and professional", "length": "short", "voice": f"{tone_label} with a clean and straightforward structure"},
        {"style": "warm and conversational", "length": "short", "voice": f"{tone_label} with a more personal and friendly rhythm"},
        {"style": "detailed and polished", "length": "long", "voice": f"{tone_label} with fuller explanation and a more developed body"},
        {"style": "direct and action-oriented", "length": "long", "voice": f"{tone_label} with confident phrasing and clear next steps"},
        {"style": "thoughtful follow-up", "length": "medium", "voice": f"{tone_label} with balanced detail and a polished finish"},
    ]
    return guides[:max(1, min(variation_count, 4))]

def get_style_guide_for_index(tone: str, variation_count: int, style_index: int):
    guides = sequential_style_guides(tone, variation_count)
    if style_index < 0 or style_index >= len(guides):
        return None
    return guides[style_index]

def structure_email_payload(subject: str, content: str, footer: str, variation_number: int = 1):
    paragraphs = [part.strip() for part in re.split(r"\n\s*\n", content or "") if part.strip()]
    greeting = "Hello,"
    if paragraphs and re.match(r"^(hi|hello|dear|hey)\b", paragraphs[0], flags=re.IGNORECASE):
        greeting = paragraphs.pop(0)

    closing, signature = split_footer(footer)
    body = "\n\n".join(paragraphs).strip()

    return {
        "id": f"variation-{variation_number}",
        "label": f"Variation {variation_number}",
        "subject": (subject or "Generated Email").strip(),
        "greeting": greeting,
        "body": body or (content or "").strip(),
        "closing": closing,
        "signature": signature,
        "full_email": "\n\n".join(
            [
                (subject or "Generated Email").strip(),
                greeting,
                body or (content or "").strip(),
                closing,
                signature,
            ]
        ).strip(),
    }

def format_variation_text(variation):
    return "\n\n".join(
        [
            variation.get("greeting", "").strip(),
            variation.get("body", "").strip(),
            variation.get("closing", "").strip(),
            variation.get("signature", "").strip(),
        ]
    ).strip()

def finalize_variations(raw_variations, source_subject: str = "", tone: str = "", source_purpose: str = ""):
    variations = []
    for index, item in enumerate(raw_variations or [], start=1):
        if not isinstance(item, dict):
            continue

        variation_tone = select_tone_for_index(tone, index - 1)
        greeting_options = tone_greeting_variants(variation_tone)
        closing_options = tone_closing_variants(variation_tone)

        subject = clean_subject_line(item.get("subject") or item.get("title") or "", source_subject or "Generated Email")
        greeting = normalize_text(item.get("greeting") or "")
        body = clean_generated_body(item.get("body") or item.get("content") or "")
        closing = normalize_text(item.get("closing") or "")
        signature = clean_signature_line(item.get("signature") or "")
        footer = normalize_text(item.get("footer") or "")

        if is_low_quality_body(body):
            body = build_quality_repair_body(source_subject or subject or "Generated Email", variation_tone, source_purpose)

        if footer and not closing:
            closing, signature = split_footer(footer)

        if not subject:
            subject = clean_subject_line(f"Generated Email Variation {index}", source_subject or "Generated Email")
        if not greeting:
            greeting = greeting_options[(index - 1) % len(greeting_options)]
        if not closing:
            closing, signature = closing_options[(index - 1) % len(closing_options)]
        if not signature:
            signature = "[Your Name]"

        full_email = "\n\n".join([greeting, body, closing, signature]).strip()
        variations.append(
            {
                "id": item.get("id") or f"variation-{index}",
                "label": item.get("label") or f"Variation {index}",
                "subject": subject,
                "greeting": greeting,
                "body": body,
                "closing": closing,
                "signature": signature,
                "full_email": full_email,
            }
        )

    return variations[:5]

def generation_style_context(brand_voice: str = "", language: str = ""):
    parts = []
    if brand_voice:
        parts.append(f"Style preference: {brand_voice}.")
    if language:
        parts.append(f"Write the final email in {language}.")
    if not parts:
        return ""
    return " ".join(parts) + " These are writing constraints only; do not mention them in the email."

def generate_single_with_ollama(
    subject: str,
    purpose: str,
    prompt: str,
    tone: str,
    length_pref: str,
    style_guide: dict,
    variation_number: int,
    ollama_model: str = "",
    brand_voice: str = "",
    language: str = "",
):
    model = normalize_ollama_model(ollama_model)
    url = getattr(settings, "OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
    clean_subject, clean_goal, compact_context = compact_ollama_context(subject, purpose, prompt)
    context_line = f"\nContext: {compact_context}" if compact_context else ""

    instruction = (
        "Write one complete email. Return only JSON with keys: subject, greeting, body, closing, signature. "
        "No markdown. Body: 2-3 short paragraphs separated by \\n\\n. Keep it natural and on topic. "
        "The JSON subject value must be a real email subject line, not the word Subject. "
        "Do not mention labels, brand voice, language, filenames, or attachments.\n"
        f"Tone: {tone or 'professional'}; Length: {style_guide.get('length') or length_pref}; "
        f"Style: {style_guide.get('style')}; Voice: {style_guide.get('voice')}; Variation: {variation_number}\n"
        f"{generation_style_context(brand_voice, language)}\n"
        f"Subject: {clean_subject}\n"
        f"Goal: {clean_goal}"
        f"{context_line}"
    )

    payload = {
        "model": model,
        "prompt": instruction,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.7,
            "top_p": 0.85,
            "num_ctx": 768,
            "num_predict": ollama_num_predict(length_pref, style_guide),
            "repeat_penalty": 1.08,
        },
        "keep_alive": "10m",
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=ollama_timeout_seconds(model)) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    raw = (body.get("response") or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()
    if not raw:
        return None

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {
            "subject": subject or "Generated Email",
            "greeting": choose_greeting(tone),
            "body": raw,
            "closing": split_footer(choose_footer(tone))[0],
            "signature": "[Your Name]",
        }
    return finalize_variations([parsed], subject, tone, purpose)[0] if parsed else None

def build_mock_email_variations(subject: str, purpose: str, tone: str = "", variation_count: int = 4):
    clean_subject = sentence_case(subject or "Generated Email")
    clean_purpose = sanitize_prompt_topic(purpose or subject or "general update")
    length_pref = detect_length(clean_purpose)
    scenario = infer_email_scenario(subject, purpose)
    short_brief = is_short_brief(subject, purpose)
    subject_options = human_subject_variants(clean_subject, purpose, scenario)
    body_profiles = ["short", "short", "long", "long", "medium"]

    if short_brief:
        variations = []
        for index in range(max(1, min(variation_count, 4))):
            tone_label = select_tone_for_index(tone, index).strip().title()
            greeting_options = tone_greeting_variants(tone_label)
            closing_options = tone_closing_variants(tone_label)
            blueprints = distinct_variation_blueprints(subject, purpose, tone_label, scenario)
            style = blueprints[index]
            greeting = greeting_options[index % len(greeting_options)]
            closing, signature = closing_options[index % len(closing_options)]
            profile = body_profiles[index]
            subject_line = subject_options[index] if index < len(subject_options) else clean_subject
            subject_line = apply_subject_suffix(subject_line, style.get("subject_suffix"))
            parts = style["paragraphs"]
            if profile == "short":
                body = "\n\n".join([parts[0], parts[1], parts[-1]] if len(parts) >= 3 else parts)
            elif profile == "long":
                body = "\n\n".join(parts[:4])
            else:
                body = "\n\n".join(parts[:3])
            body = expand_or_trim_content(body, profile if profile in ["short", "long"] else length_pref, clean_subject)
            variations.append(
                {
                    "id": f"variation-{index + 1}",
                    "label": f"Variation {index + 1}",
                    "subject": subject_line,
                    "greeting": greeting,
                    "body": body,
                    "closing": closing,
                    "signature": signature,
                }
            )
        return finalize_variations(variations, clean_subject, tone, purpose)

    call_to_actions = scenario_call_to_actions(scenario)

    variations = []
    for index in range(max(1, min(variation_count, 4))):
        tone_label = select_tone_for_index(tone, index).strip().title()
        greeting_options = tone_greeting_variants(tone_label)
        closing_options = tone_closing_variants(tone_label)
        blueprints = distinct_variation_blueprints(subject, purpose, tone_label, scenario)
        greeting = greeting_options[index % len(greeting_options)]
        closing, signature = closing_options[index % len(closing_options)]
        profile = body_profiles[index]
        subject_line = subject_options[index] if index < len(subject_options) else clean_subject
        blueprint = blueprints[index]
        subject_line = apply_subject_suffix(subject_line, blueprint.get("subject_suffix"))
        paragraphs = list(blueprint["paragraphs"])
        if len(paragraphs) >= 3:
            paragraphs[-1] = call_to_actions[index]
        if profile == "short":
            body = "\n\n".join([paragraphs[0], paragraphs[1], paragraphs[-1]] if len(paragraphs) >= 3 else paragraphs)
        elif profile == "long":
            body = "\n\n".join(paragraphs[:4])
        else:
            body = "\n\n".join(paragraphs[:3])
        body = expand_or_trim_content(body, profile if profile in ["short", "long"] else length_pref, clean_subject)
        variations.append(
            {
                "id": f"variation-{index + 1}",
                "label": f"Variation {index + 1}",
                "subject": subject_line,
                "greeting": greeting,
                "body": body,
                "closing": closing,
                "signature": signature,
            }
        )

    return finalize_variations(variations, clean_subject, tone, purpose)

def generate_variations_with_ollama(
    subject: str,
    purpose: str,
    prompt: str,
    tone: str,
    length_pref: str,
    variation_count: int = 4,
    ollama_model: str = "",
    brand_voice: str = "",
    language: str = "",
):
    errors = []
    for candidate_model in ollama_model_candidates(ollama_model):
        results = []
        try:
            for index, style_guide in enumerate(sequential_style_guides(tone, variation_count), start=1):
                draft_tone = select_tone_for_index(tone, index - 1)
                draft = generate_single_with_ollama(subject, purpose, prompt, draft_tone, length_pref, style_guide, index, candidate_model, brand_voice, language)
                if draft and is_low_quality_variation(draft):
                    retry = None
                    try:
                        retry = generate_single_with_ollama(subject, purpose, prompt, draft_tone, length_pref, style_guide, index + 10, candidate_model, brand_voice, language)
                    except Exception:
                        retry = None
                    if retry and not is_low_quality_variation(retry):
                        draft = retry
                if draft:
                    results.append(draft)
        except Exception as exc:
            errors.append(friendly_ollama_error(exc, candidate_model))
            continue

        variations = ensure_variation_count(results, subject, purpose, tone, variation_count)
        if variations:
            return {"variations": variations}

    if errors:
        return {"variations": [], "error": errors[0]}

    return None

def generate_single_with_openai(client, subject: str, purpose: str, prompt: str, tone: str, style_guide: dict, variation_number: int):
    system_message = (
        "You are an expert business email copywriter.\n"
        "Write one natural, confident, human email draft.\n"
        "Stay strictly on the user's topic and intent.\n"
        "Do not drift to unrelated subjects.\n"
        "Do not copy the prompt sentence-by-sentence.\n"
        "Use the provided subject and purpose to create meaningful content with a clear introduction, strong body, and professional closing.\n"
        "If the prompt is very short, intelligently expand it into a complete real-world email with natural paragraphs.\n"
        "Every draft must include a greeting, introduction paragraph, one or two body paragraphs, and a polished closing with signature.\n"
        "Avoid generic filler such as 'I hope you are doing well' unless it is genuinely appropriate.\n"
        "Avoid filler corporate sentences such as 'please feel free to share suggestions', 'I wanted to provide more context', or 'I can prepare a follow-up summary'.\n"
        "For friendly or casual emails, use natural contractions where they fit and avoid stiff, over-formal wording.\n"
        "End naturally after the main message with a short closing sentence and signature, without extra wrap-up paragraphs.\n"
        "Write a realistic subject line, and match the greeting and closing to the requested tone.\n"
        "The subject must be a short subject line only, never a sentence, paragraph, or body text.\n"
        "The subject value must not be the word Subject or another placeholder label.\n"
        "Do not include labels such as Subject:, Purpose:, Goal:, or Tone: in the body of the email.\n"
        "Do not mention uploaded filenames, attachments, or image placeholders inside the email.\n"
        "Do not repeat the same sentence or paragraph.\n"
        "Return ONLY valid JSON with keys: subject, greeting, body, closing, signature.\n"
        "No markdown, no code fences, no extra keys."
    )

    user_message = (
        f"Write one complete email draft.\n"
        f"Variation number: {variation_number}\n"
        f"Variation style: {style_guide.get('style')}\n"
        f"Variation voice: {style_guide.get('voice')}\n"
        f"Desired length: {style_guide.get('length')}\n"
        f"Subject: {subject or 'Generated Email'}\n"
        f"Purpose: {purpose or prompt}\n"
        f"Context brief: {prompt}\n"
    )
    if tone:
        user_message += f" Tone: {tone}."
    user_message += " Make this draft meaningfully different from other possible versions in structure and voice. End it naturally after the main message without adding extra filler paragraphs."

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
        temperature=0.9,
    )

    raw_text = response.choices[0].message.content or ""
    try:
        payload = json.loads(raw_text)
    except json.JSONDecodeError:
        payload = {
            "subject": subject or "Generated Email",
            "greeting": choose_greeting(tone),
            "body": raw_text,
            "closing": split_footer(choose_footer(tone))[0],
            "signature": "[Your Name]",
        }
    variations = finalize_variations([payload], subject, tone, purpose)
    return variations[0] if variations else None

def generate_variations_with_openai(client, subject: str, purpose: str, prompt: str, tone: str, variation_count: int = 4):
    results = []
    for index, style_guide in enumerate(sequential_style_guides(tone, variation_count), start=1):
        draft_tone = select_tone_for_index(tone, index - 1)
        draft = generate_single_with_openai(client, subject, purpose, prompt, draft_tone, style_guide, index)
        if draft:
            results.append(draft)
    return ensure_variation_count(results, subject, purpose, tone, variation_count)

def generate_single_variation(
    subject: str,
    purpose: str,
    prompt: str,
    tone: str,
    variation_count: int,
    style_index: int,
    ollama_model: str = "",
    brand_voice: str = "",
    language: str = "",
):
    length_pref = detect_length(prompt)
    effective_tone = select_tone_for_index(tone, style_index)
    style_guide = get_style_guide_for_index(effective_tone, variation_count, style_index)
    if not style_guide:
        return None

    errors = []
    for candidate_model in ollama_model_candidates(ollama_model):
        try:
            draft = generate_single_with_ollama(subject, purpose, prompt, effective_tone, length_pref, style_guide, style_index + 1, candidate_model, brand_voice, language)
            if draft and is_low_quality_variation(draft):
                retry = None
                try:
                    retry = generate_single_with_ollama(subject, purpose, prompt, effective_tone, length_pref, style_guide, style_index + 11, candidate_model, brand_voice, language)
                except Exception:
                    retry = None
                if retry and not is_low_quality_variation(retry):
                    draft = retry
            if draft:
                return draft
        except Exception as exc:
            errors.append(friendly_ollama_error(exc, candidate_model))
            continue

    if errors and getattr(settings, "USE_OLLAMA_ONLY", False):
        raise OllamaGenerationError(errors[0])

    if not settings.OPENAI_API_KEY:
        fallback = build_mock_email_variations(subject, purpose, tone, variation_count)
        return fallback[style_index] if style_index < len(fallback) else None

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    draft = generate_single_with_openai(client, subject, purpose, prompt, effective_tone, style_guide, style_index + 1)
    if draft:
        return draft

    fallback = build_mock_email_variations(subject, purpose, tone, variation_count)
    return fallback[style_index] if style_index < len(fallback) else None

def ensure_variation_count(variations, subject: str, purpose: str, tone: str, variation_count: int):
    cleaned = finalize_variations(variations, subject, tone, purpose)
    unique_cleaned = []
    seen = set()
    for item in cleaned:
        fingerprint = variation_fingerprint(item)
        if fingerprint in seen:
            continue
        seen.add(fingerprint)
        unique_cleaned.append(item)
    cleaned = unique_cleaned
    if len(cleaned) >= 3:
        return cleaned[:variation_count]

    fallback = build_mock_email_variations(subject, purpose, tone, variation_count)
    existing_keys = {variation_fingerprint(item) for item in cleaned}

    for item in fallback:
        fingerprint = variation_fingerprint(item)
        if fingerprint not in existing_keys:
            cleaned.append(item)
            existing_keys.add(fingerprint)
        if len(cleaned) >= variation_count:
            break

    return cleaned[:variation_count]

def save_generation_history(user, subject: str, purpose: str, tone: str, prompt: str, variations):
    record = EmailGenerationHistory.objects.create(
        owner=user,
        subject=subject or "Generated Email",
        purpose=purpose or prompt,
        tone=tone or "Professional",
        prompt=prompt,
        variations=variations,
    )
    return EmailGenerationHistorySerializer(record).data
