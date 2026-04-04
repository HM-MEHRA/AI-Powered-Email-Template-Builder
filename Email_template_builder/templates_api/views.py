from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import status
from django.template import Template, Context
from django.conf import settings
from openai import OpenAI
import io
from html import unescape
import json
import logging
import os
import re
import urllib.request
import urllib.error
import zipfile
from .models import EmailGenerationHistory, EmailTemplate
from .serializers import EmailGenerationHistorySerializer, EmailTemplateSerializer

logger = logging.getLogger(__name__)

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
        return f"Attached image context: the user uploaded an image named {file_name}. Use it only as supporting context if relevant."

    cleaned_text = re.sub(r"\s+", " ", (extracted_text or "")).strip()
    if not cleaned_text:
        return f"Attached file context: the user uploaded a file named {file_name}. Use it only if helpful."

    snippet = cleaned_text[:2000]
    return f"Attached file context from {file_name}: {snippet}"

def clean_generated_body(body: str):
    text = normalize_text(body or "")
    text = re.sub(r"(?im)^\s*(subject|purpose|prompt|goal|tone)\s*:\s*.*(?:\n|$)", "", text)
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
    if not text or body_like:
        text = title_case_phrase(fallback or "Generated Email")

    return text[:100].strip(" .,-")

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

def build_scenario_paragraphs(subject: str, purpose: str, tone: str, scenario: str):
    clean_subject = sentence_case(subject or "Generated Email")
    clean_purpose = sentence_case(sanitize_prompt_topic(purpose or subject or "general update"))
    tone_lower = (tone or "").lower()

    if scenario == "invitation":
        intro = f"I am happy to invite you to {clean_subject.lower()} and wanted to share the details in a clear and personal way."
        body_one = "It would mean a lot to have you there, and I would love for you to join the celebration. The event is meant to be relaxed, enjoyable, and memorable for everyone attending."
        body_two = "Please let me know if you will be able to make it. I can also share the final date, time, and location details as soon as everything is confirmed."
        if tone_lower in ["formal", "professional", "corporate", "polite", "respectful"]:
            intro = f"I would like to extend an invitation for {clean_subject.lower()} and share the details with you."
            body_one = "Your presence would be greatly appreciated, and I would be delighted to celebrate the occasion together. I wanted to send this note early so you have enough time to plan."
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
        body_one = f"{clean_purpose} I wanted to share this request in advance so that work can be planned smoothly and responsibilities can be handed over properly."
        body_two = "I will make sure that any urgent tasks are addressed before the leave period begins. Please let me know if you need any additional information from me."
    elif scenario == "thanks":
        intro = f"I wanted to take a moment to thank you regarding {clean_subject.lower()}."
        body_one = "Your support and time have made a real difference, and I genuinely appreciate the effort behind it."
        body_two = "I did not want to let the moment pass without acknowledging it properly. Thank you again for your help and consideration."
    else:
        intro = f"I am writing regarding {clean_subject.lower()} and wanted to share a clear, thoughtful update."
        body_one = f"{clean_purpose} I have kept this note concise while still making sure the main context and intent are easy to understand."
        body_two = "Please let me know your thoughts when you have a chance. I would be glad to provide any additional details that would be helpful."

    if tone_lower in ["friendly", "casual", "warm", "relaxed", "inviting"]:
        body_one += " I wanted the message to feel personal and easy to respond to."
    if tone_lower in ["confident", "persuasive", "direct"]:
        body_two = "Please let me know the best next step, and I will move forward right away."

    return intro, body_one, body_two

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
    clean_purpose = sentence_case(sanitize_prompt_topic(purpose or subject or "general update"))
    tone_snippets = tone_style_snippets(tone)
    scenario_intro, scenario_body_one, scenario_body_two = build_scenario_paragraphs(subject, purpose, tone, scenario)

    return [
        {
            "style": "clear",
            "subject_suffix": None,
            "paragraphs": [
                scenario_intro,
                f"{scenario_body_one} {tone_snippets['openers'][0]}",
                "Please let me know your thoughts when you have a moment.",
            ],
        },
        {
            "style": "warm",
            "subject_suffix": "Warm Note",
            "paragraphs": [
                f"I wanted to reach out personally about {clean_subject.lower()}.",
                f"{clean_purpose}. {tone_snippets['bridges'][1]}",
                "I would be glad to continue the conversation whenever convenient.",
            ],
        },
        {
            "style": "detailed",
            "subject_suffix": "Details",
            "paragraphs": [
                f"I am writing about {clean_subject.lower()} and wanted to give you a fuller picture.",
                scenario_body_one,
                f"{scenario_body_two} {tone_snippets['openers'][2]}",
                "If it helps, I can also share any additional context or next steps in a follow-up note.",
            ],
        },
        {
            "style": "direct",
            "subject_suffix": "Next Steps",
            "paragraphs": [
                f"I wanted to send a direct note regarding {clean_subject.lower()}.",
                f"{clean_purpose}. The message below is intended to be straightforward and easy to act on.",
                "Please let me know the best next step, and I will respond quickly.",
            ],
        },
        {
            "style": "polished",
            "subject_suffix": "Follow-Up",
            "paragraphs": [
                f"I wanted to share a polished update regarding {clean_subject.lower()}.",
                f"{scenario_body_one} {tone_snippets['bridges'][4]}",
                scenario_body_two,
                "Thank you for your time and consideration.",
            ],
        },
    ]

def apply_subject_suffix(subject_line: str, suffix: str | None):
    if not suffix:
        return subject_line
    if suffix.lower() in subject_line.lower():
        return subject_line
    return f"{subject_line} - {suffix}"

def tone_style_snippets(tone: str):
    tone_lower = (tone or "").lower()
    if tone_lower in ["excited", "enthusiastic", "playful"]:
        return {
            "openers": [
                "I wanted to share this with you because it feels genuinely exciting.",
                "I was glad to put this note together and send it your way.",
                "This felt worth reaching out about right away.",
                "I wanted this message to sound upbeat, clear, and easy to respond to.",
                "I am happy to share this with you directly.",
            ],
            "bridges": [
                "I kept the details simple so the message still feels natural and personal.",
                "The goal was to make the note feel warm, energetic, and easy to read.",
                "I also wanted the wording to feel like something a real person would actually send.",
                "That balance matters, especially when the message should feel both polished and lively.",
                "I wanted the tone to stay genuine without sounding overdone.",
            ],
        }
    if tone_lower in ["formal", "professional", "polite", "respectful", "corporate"]:
        return {
            "openers": [
                "I wanted to present the matter clearly and professionally.",
                "I have kept the message structured and straightforward for ease of review.",
                "This draft is written to sound polished, thoughtful, and respectful.",
                "I wanted the wording to remain professional while still sounding natural.",
                "The message is intended to be clear, complete, and appropriate for a formal setting.",
            ],
            "bridges": [
                "I also made sure the note stays concise while still giving enough context.",
                "That helps the email feel complete without becoming overly long.",
                "The result is a message that is easier to read and easier to act on.",
                "I wanted the tone to feel steady and credible from beginning to end.",
                "This keeps the message professional without sounding stiff or generic.",
            ],
        }
    return {
        "openers": [
            "I wanted this message to sound clear, natural, and easy to understand.",
            "I kept the note simple while still making the key point meaningful.",
            "The goal was to make the message feel human and practical.",
            "I wanted the draft to feel polished without losing warmth.",
            "I tried to keep the message direct while still sounding thoughtful.",
        ],
        "bridges": [
            "That way, the email feels realistic rather than overly scripted.",
            "It also helps the message read more like a real conversation.",
            "That balance makes the note easier to send with confidence.",
            "I wanted the message to feel complete without sounding repetitive.",
            "This keeps the structure clean while still sounding personal.",
        ],
    }

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
    return guides[:max(3, min(variation_count, 5))]

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

def finalize_variations(raw_variations, source_subject: str = "", tone: str = ""):
    variations = []
    greeting_options = tone_greeting_variants(tone)
    closing_options = tone_closing_variants(tone)
    for index, item in enumerate(raw_variations or [], start=1):
        if not isinstance(item, dict):
            continue

        subject = clean_subject_line(item.get("subject") or item.get("title") or "", source_subject or "Generated Email")
        greeting = normalize_text(item.get("greeting") or "")
        body = clean_generated_body(item.get("body") or item.get("content") or "")
        closing = normalize_text(item.get("closing") or "")
        signature = normalize_text(item.get("signature") or "")
        footer = normalize_text(item.get("footer") or "")

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

def generate_single_with_ollama(subject: str, purpose: str, prompt: str, tone: str, length_pref: str, style_guide: dict, variation_number: int):
    model = getattr(settings, "OLLAMA_MODEL", "llama3.2")
    url = getattr(settings, "OLLAMA_URL", "http://127.0.0.1:11434/api/generate")

    instruction = (
        "You are an expert email writer.\n"
        "Task: write one realistic email draft for the same user topic.\n"
        "Rules:\n"
        "1) Stay on topic and do not repeat the prompt text as-is.\n"
        "2) Write natural human wording.\n"
        "3) Return ONLY strict JSON object with keys: subject, greeting, body, closing, signature.\n"
        "4) The draft must feel fully written and ready to send.\n"
        "5) body must contain proper paragraph breaks using \\n\\n and read like a real email.\n"
        "6) Even if the brief is very short, expand it into a complete email with an introduction paragraph, one or two meaningful body paragraphs, and a natural closing.\n"
        "7) Match the greeting and closing to the selected tone.\n"
        "8) Write a strong, realistic subject line that a human would actually send.\n"
        "9) The subject must be a short subject line only, never a sentence, paragraph, or body text.\n"
        "10) Make the body sound natural, specific, and human rather than generic or repetitive.\n"
        "11) Avoid filler corporate sentences such as 'please feel free to share suggestions', 'I wanted to provide more context', or 'I can prepare a follow-up summary'.\n"
        "12) End naturally after the main message with a short closing sentence and signature, without extra wrap-up paragraphs.\n"
        "13) Do not include labels such as Subject:, Purpose:, Goal:, or Tone: inside the email body.\n"
        "14) Avoid generic openings like 'I hope you are doing well' unless the situation truly requires it.\n"
        "15) No markdown, no code blocks, no extra keys.\n"
        f"Tone: {tone or 'professional'}\n"
        f"Length: {style_guide.get('length') or length_pref}\n"
        f"Variation style: {style_guide.get('style')}\n"
        f"Variation voice: {style_guide.get('voice')}\n"
        f"Variation number: {variation_number}\n"
        f"Email subject: {subject or 'Generated Email'}\n"
        f"Email purpose: {purpose or prompt}\n"
        f"Generation brief: {prompt}"
    )

    payload = {
        "model": model,
        "prompt": instruction,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.8,
            "top_p": 0.9,
        },
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=45) as resp:
        body = json.loads(resp.read().decode("utf-8"))

    raw = (body.get("response") or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        raw = raw.replace("json", "", 1).strip()
    if not raw:
        return None

    parsed = json.loads(raw)
    return finalize_variations([parsed], subject, tone)[0] if parsed else None

def build_mock_email_variations(subject: str, purpose: str, tone: str = "", variation_count: int = 4):
    clean_subject = sentence_case(subject or "Generated Email")
    clean_purpose = sanitize_prompt_topic(purpose or subject or "general update")
    tone_label = (tone or "Professional").strip().title()
    greeting_options = tone_greeting_variants(tone_label)
    closing_options = tone_closing_variants(tone_label)
    length_pref = detect_length(clean_purpose)
    scenario = infer_email_scenario(subject, purpose)
    short_brief = is_short_brief(subject, purpose)
    subject_options = human_subject_variants(clean_subject, purpose, scenario)
    body_profiles = ["short", "short", "long", "long", "medium"]
    style_snippets = tone_style_snippets(tone_label)
    blueprints = distinct_variation_blueprints(subject, purpose, tone_label, scenario)

    if short_brief:
        variations = []
        for index in range(max(3, min(variation_count, 5))):
            style = blueprints[index]
            greeting = greeting_options[index % len(greeting_options)]
            closing, signature = closing_options[index % len(closing_options)]
            profile = body_profiles[index]
            subject_line = subject_options[index] if index < len(subject_options) else clean_subject
            subject_line = apply_subject_suffix(subject_line, style.get("subject_suffix"))
            parts = style["paragraphs"]
            if profile == "short":
                body = "\n\n".join(parts[:2])
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
        return finalize_variations(variations, clean_subject, tone_label)

    call_to_actions = [
        "Please let me know your thoughts when you have a moment.",
        "If this works for you, I would be glad to take the next step right away.",
        "I would appreciate your feedback so we can move ahead with confidence.",
        "Please share any updates or preferences, and I will adjust accordingly.",
        "Let me know the best way to proceed, and I will handle the follow-through from here.",
    ]

    variations = []
    for index in range(max(3, min(variation_count, 5))):
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
            body = "\n\n".join(paragraphs[:2])
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

    return finalize_variations(variations, clean_subject, tone_label)

def generate_variations_with_ollama(subject: str, purpose: str, prompt: str, tone: str, length_pref: str, variation_count: int = 4):
    results = []
    for index, style_guide in enumerate(sequential_style_guides(tone, variation_count), start=1):
        draft = generate_single_with_ollama(subject, purpose, prompt, tone, length_pref, style_guide, index)
        if draft:
            results.append(draft)
    variations = ensure_variation_count(results, subject, purpose, tone, variation_count)
    return {"variations": variations} if variations else None

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
        "End naturally after the main message with a short closing sentence and signature, without extra wrap-up paragraphs.\n"
        "Write a realistic subject line, and match the greeting and closing to the requested tone.\n"
        "The subject must be a short subject line only, never a sentence, paragraph, or body text.\n"
        "Do not include labels such as Subject:, Purpose:, Goal:, or Tone: in the body of the email.\n"
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
    variations = finalize_variations([payload], subject, tone)
    return variations[0] if variations else None

def generate_variations_with_openai(client, subject: str, purpose: str, prompt: str, tone: str, variation_count: int = 4):
    results = []
    for index, style_guide in enumerate(sequential_style_guides(tone, variation_count), start=1):
        draft = generate_single_with_openai(client, subject, purpose, prompt, tone, style_guide, index)
        if draft:
            results.append(draft)
    return ensure_variation_count(results, subject, purpose, tone, variation_count)

def generate_single_variation(subject: str, purpose: str, prompt: str, tone: str, variation_count: int, style_index: int):
    length_pref = detect_length(prompt)
    style_guide = get_style_guide_for_index(tone, variation_count, style_index)
    if not style_guide:
        return None

    try:
        draft = generate_single_with_ollama(subject, purpose, prompt, tone, length_pref, style_guide, style_index + 1)
        if draft:
            return draft
    except Exception:
        pass

    if not settings.OPENAI_API_KEY:
        fallback = build_mock_email_variations(subject, purpose, tone, variation_count)
        return fallback[style_index] if style_index < len(fallback) else None

    client = OpenAI(api_key=settings.OPENAI_API_KEY)
    draft = generate_single_with_openai(client, subject, purpose, prompt, tone, style_guide, style_index + 1)
    if draft:
        return draft

    fallback = build_mock_email_variations(subject, purpose, tone, variation_count)
    return fallback[style_index] if style_index < len(fallback) else None

def ensure_variation_count(variations, subject: str, purpose: str, tone: str, variation_count: int):
    cleaned = finalize_variations(variations, subject, tone)
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

def save_generation_history(subject: str, purpose: str, tone: str, prompt: str, variations):
    record = EmailGenerationHistory.objects.create(
        subject=subject or "Generated Email",
        purpose=purpose or prompt,
        tone=tone or "Professional",
        prompt=prompt,
        variations=variations,
    )
    return EmailGenerationHistorySerializer(record).data

class GetEmailLayoutView(APIView):
    def post(self, request):
        title = request.data.get("title", "Default Title")
        content = request.data.get("content", "Default Content")
        footer = request.data.get("footer", "Default Footer")
        image_url = request.data.get("image_url", None)

        layout = """<div class="email-container">
            <h1>{{ title }}</h1>
            <p style="white-space: pre-wrap;">{{ content }}</p>
            <footer style="white-space: pre-wrap;">{{ footer }}</footer>
            {% if image_url %}
                <img src="{{ image_url }}" />
            {% endif %}
        </div>"""

        template = Template(layout)
        context = Context({
            "title": title,
            "content": content,
            "footer": footer,
            "image_url": image_url
        })
        rendered_layout = template.render(context)

        return Response({"rendered_layout": rendered_layout})

class UploadImageView(APIView):
    def post(self, request):
        if "image" not in request.FILES:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        image = request.FILES["image"]
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploaded_images")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, image.name)
        with open(file_path, "wb+") as destination:
            for chunk in image.chunks():
                destination.write(chunk)

        # Ensure the URL is fully qualified
        image_url = f"{settings.SITE_URL}{settings.MEDIA_URL}uploaded_images/{image.name}"
        return Response({"image_url": image_url}, status=status.HTTP_201_CREATED)


class UploadEmailConfigView(APIView):
    def post(self, request):
        """
        Handle the POST request to upload email configurations with validation for the `image_url` field.
        """

        image_url = None
        if 'image' in request.FILES:
            image = request.FILES['image']
            upload_dir = os.path.join(settings.MEDIA_ROOT, "uploaded_images")
            os.makedirs(upload_dir, exist_ok=True)

            file_path = os.path.join(upload_dir, image.name)
            with open(file_path, "wb+") as destination:
                for chunk in image.chunks():
                    destination.write(chunk)

            image_url = f"{settings.SITE_URL}{settings.MEDIA_URL}uploaded_images/{image.name}"

        request.data['image_url'] = image_url

        serializer = EmailTemplateSerializer(data=request.data)
        if serializer.is_valid():
            email_config = serializer.save()
            
            print("Saved email config:", email_config)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        print("Validation errors:", serializer.errors)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RenderAndDownloadTemplateView(APIView):
    def post(self, request):
        title = request.data.get("title", "Default Title")
        content = request.data.get("content", "Default Content")
        footer = request.data.get("footer", "Default Footer")
        image_url = request.data.get("image_url", None)

        layout = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Template</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f3f4f6;
            color: #333;
        }
        .email-container {
            max-width: 700px;
            margin: 30px auto;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #6a11cb, #2575fc);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 1px;
        }
        .content {
            padding: 25px 20px;
            line-height: 1.8;
            font-size: 16px;
        }
        .content p {
            margin: 0 0 15px;
        }
        .content strong {
            color: #6a11cb;
        }
        .image-container {
            text-align: center;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .image-container img {
            max-width: 90%;
            height: auto;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .cta-button {
            display: inline-block;
            margin: 20px auto;
            padding: 12px 25px;
            background: linear-gradient(135deg, #6a11cb, #2575fc);
            color: white;
            text-decoration: none;
            font-weight: bold;
            border-radius: 30px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            transition: background 0.3s ease;
        }
        .cta-button:hover {
            background: linear-gradient(135deg, #2575fc, #6a11cb);
        }
        .footer {
            background: #f1f5f9;
            padding: 15px 20px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 14px;
            color: #606f7b;
        }
        .footer a {
            color: #6a11cb;
            text-decoration: none;
            font-weight: bold;
        }
        .footer a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>{{ title }}</h1>
        </div>
        <div class="content">
            <p style="white-space: pre-wrap;">{{ content }}</p>
        </div>
        {% if image_url %}
        <div class="image-container">
            <img src="{{ image_url }}" alt="Email Image" />
        </div>
        {% endif %}
        <div class="footer">
            <p style="white-space: pre-wrap;">{{ footer }}</p>
            <p>Need help? Visit our <a href="#">Support Center</a> or <a href="#">Contact Us</a>.</p>
        </div>
    </div>
</body>
</html>
"""

        template = Template(layout)
        context = Context({
            "title": title,
            "content": content,
            "footer": footer,
            "image_url": image_url
        })
        rendered_html = template.render(context)

        return Response({"rendered_html": rendered_html})


class EmailHistoryView(APIView):
    def get(self, request):
        history = EmailGenerationHistory.objects.all()[:20]
        serializer = EmailGenerationHistorySerializer(history, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class SaveGeneratedHistoryView(APIView):
    parser_classes = [JSONParser]

    def post(self, request):
        subject = (request.data.get("subject") or "").strip()
        purpose = (request.data.get("purpose") or "").strip()
        tone = (request.data.get("tone") or "").strip()
        prompt = (request.data.get("prompt") or "").strip()
        variations = request.data.get("variations") or []

        normalized_variations = finalize_variations(variations, subject, tone)
        if not normalized_variations:
            return Response({"detail": "Variations are required."}, status=status.HTTP_400_BAD_REQUEST)

        history_entry = save_generation_history(subject, purpose, tone, prompt, normalized_variations)
        return Response(history_entry, status=status.HTTP_201_CREATED)


class GenerateEmailView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        subject = (request.data.get("subject") or "").strip()
        purpose = (request.data.get("purpose") or "").strip()
        tone = (request.data.get("tone") or "").strip()
        uploaded_file = request.FILES.get("file")
        variation_count = request.data.get("variation_count") or 4
        style_index = request.data.get("style_index")
        save_history = request.data.get("save_history", True)

        try:
            variation_count = int(variation_count)
        except (TypeError, ValueError):
            variation_count = 4
        variation_count = max(3, min(variation_count, 5))

        if isinstance(save_history, str):
            save_history = save_history.lower() not in ["false", "0", "no"]

        prompt = build_prompt_from_parts(subject, purpose, prompt)
        file_context = extract_uploaded_file_context(uploaded_file)
        if file_context:
            prompt = f"{prompt}\n\n{file_context}".strip()
        length_pref = detect_length(prompt)

        if not prompt:
            return Response({"detail": "Subject or purpose is required."}, status=status.HTTP_400_BAD_REQUEST)

        if style_index is not None:
            try:
                style_index = int(style_index)
            except (TypeError, ValueError):
                return Response({"detail": "style_index must be a valid integer."}, status=status.HTTP_400_BAD_REQUEST)

            variation_error = None
            try:
                variation = generate_single_variation(subject, purpose, prompt, tone, variation_count, style_index)
            except Exception as exc:
                variation_error = str(exc)
                logger.exception("Single email variation generation failed")
                variation = None

            if not variation:
                detail = "Failed to generate email variation."
                if settings.DEBUG and variation_error:
                    detail = f"{detail} {variation_error}"
                return Response({"detail": detail}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            payload = {
                "tone": tone or "Professional",
                "prompt": prompt,
                "variation": variation,
            }
            if save_history:
                payload["history_entry"] = save_generation_history(subject, purpose, tone, prompt, [variation])
            return Response(payload, status=status.HTTP_200_OK)

        # Always prefer local Ollama first.
        try:
            ollama_result = generate_variations_with_ollama(subject, purpose, prompt, tone, length_pref, variation_count)
            if ollama_result and ollama_result.get("variations"):
                history_entry = save_generation_history(subject, purpose, tone, prompt, ollama_result["variations"]) if save_history else None
                return Response(
                    {
                        "tone": tone or "Professional",
                        "prompt": prompt,
                        "variations": ollama_result["variations"],
                        **({"history_entry": history_entry} if history_entry else {}),
                    },
                    status=status.HTTP_200_OK,
                )
        except Exception:
            pass

        if not settings.OPENAI_API_KEY:
            try:
                variations = build_mock_email_variations(subject, purpose, tone, variation_count)
                history_entry = save_generation_history(subject, purpose, tone, prompt, variations) if save_history else None
                return Response(
                    {
                        "tone": tone or "Professional",
                        "prompt": prompt,
                        "variations": variations,
                        **({"history_entry": history_entry} if history_entry else {}),
                    },
                    status=status.HTTP_200_OK,
                )
            except Exception:
                return Response(
                    {"detail": "Failed to generate email with available providers."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        try:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
        except Exception as exc:
            return Response(
                {"detail": f"Failed to initialize OpenAI client: {str(exc)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            variations = generate_variations_with_openai(client, subject, purpose, prompt, tone, variation_count)
        except Exception:
            # Fallback chain after OpenAI: local mock
            try:
                variations = build_mock_email_variations(subject, purpose, tone, variation_count)
                history_entry = save_generation_history(subject, purpose, tone, prompt, variations) if save_history else None
                return Response(
                    {
                        "tone": tone or "Professional",
                        "prompt": prompt,
                        "variations": variations,
                        **({"history_entry": history_entry} if history_entry else {}),
                    },
                    status=status.HTTP_200_OK,
                )
            except Exception:
                return Response(
                    {"detail": "Failed to generate email with available providers."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        if not variations:
            variations = build_mock_email_variations(subject, purpose, tone, variation_count)
        history_entry = save_generation_history(subject, purpose, tone, prompt, variations) if save_history else None

        return Response(
            {
                "tone": tone or "Professional",
                "prompt": prompt,
                "variations": variations,
                **({"history_entry": history_entry} if history_entry else {}),
            },
            status=status.HTTP_200_OK,
        )
