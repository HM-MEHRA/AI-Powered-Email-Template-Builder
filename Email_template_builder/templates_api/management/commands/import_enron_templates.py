import csv
import io
import json
import re
import sys
import zipfile
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from templates_api.models import EmailTemplate


VALID_TIERS = {EmailTemplate.ACCESS_FREE, EmailTemplate.ACCESS_PREMIUM}
BAD_SUBJECTS = {"", "re", "fw", "fwd", "test", "none", "no subject", "null"}
GENERIC_WORDS = {"the", "and", "for", "you", "your", "with", "that", "this", "are", "our", "can"}
GREETING_RE = re.compile(r"^(hi|hello|dear|hey|good morning|good afternoon)\b.*[,!]?$", re.IGNORECASE)
CLOSING_RE = re.compile(
    r"^(best|regards|best regards|sincerely|thanks|thank you|warmly|cheers|kind regards)[,!.]?$",
    re.IGNORECASE,
)
EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE)
URL_RE = re.compile(r"\bhttps?://\S+|\bwww\.\S+", re.IGNORECASE)
PHONE_RE = re.compile(r"(?<!\w)(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?!\w)")
MONEY_RE = re.compile(r"(?<!\w)\$\s?\d[\d,]*(?:\.\d{2})?\b")
TIME_RE = re.compile(r"\b\d{1,2}:\d{2}\s?(?:am|pm|AM|PM)?\b")
MONTH_NAMES = "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec"
WEEKDAY_NAMES = "mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun"
DATE_RE = re.compile(
    rf"\b(?:(?:{WEEKDAY_NAMES})[a-z]*,?\s+)?(?:{MONTH_NAMES})[a-z]*\.?\s+\d{{1,2}}(?:st|nd|rd|th)?(?:,\s*\d{{2,4}})?\b"
    r"|\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b",
    re.IGNORECASE,
)
PERSON_NAME_RE = re.compile(
    r"\b[A-Z][a-z]+(?:\s+(?:de|del|da|van|von|la|le|[A-Z][a-z]+)){1,3}\b"
)
HEADER_LINE_RE = re.compile(r"^(from|sent|to|cc|bcc|subject|date)\s*:", re.IGNORECASE)
REPLY_MARKER_RE = re.compile(r"^-+\s*original message\s*-+|^forwarded by\b", re.IGNORECASE)
DISCLAIMER_RE = re.compile(
    r"confidentiality notice|attorney.client|privileged and confidential|"
    r"this e-?mail and any attachments|intended only for the use",
    re.IGNORECASE,
)
NON_PERSON_NAME_WORDS = {
    "America",
    "Board",
    "California",
    "Conference",
    "Corp",
    "Corporation",
    "Energy",
    "Friday",
    "Houston",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "Monday",
    "North",
    "Project",
    "Report",
    "Room",
    "Saturday",
    "Services",
    "Sunday",
    "Texas",
    "Thursday",
    "Tuesday",
    "Wednesday",
}


def set_large_csv_field_limit():
    limit = sys.maxsize
    while True:
        try:
            csv.field_size_limit(limit)
            return
        except OverflowError:
            limit = int(limit / 10)


def clean_text(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compact_line(value):
    return re.sub(r"\s+", " ", clean_text(value))


def get_case_insensitive(row, *names):
    wanted = {name.lower() for name in names}
    for key, value in row.items():
        if key and key.strip().lower() in wanted:
            return value
    return ""


def normalize_subject(subject):
    subject = compact_line(subject)
    subject = re.sub(r"^(re|fw|fwd)\s*:\s*", "", subject, flags=re.IGNORECASE).strip()
    subject = sanitize_placeholders(subject, replace_names=False)
    subject = re.sub(r"\s+", " ", subject).strip(" -:;,.")
    return subject[:100]


def subject_is_usable(subject):
    lowered = subject.lower().strip(" :-")
    if lowered in BAD_SUBJECTS:
        return False
    if len(subject) < 4 or not re.search(r"[a-zA-Z]", subject):
        return False
    if len(subject.split()) > 14:
        return False
    return True


def sanitize_placeholders(text, replace_names=True):
    text = URL_RE.sub("{link}", text)
    text = EMAIL_RE.sub("{email}", text)
    text = PHONE_RE.sub("{phone}", text)
    text = MONEY_RE.sub("{amount}", text)
    text = DATE_RE.sub("{date}", text)
    text = TIME_RE.sub("{time}", text)
    text = re.sub(r"\bEnron(?:\s+Corp(?:oration)?)?\b", "{company}", text, flags=re.IGNORECASE)
    if replace_names:
        text = replace_possible_names(text)
    return text


def replace_possible_names(text):
    def replace(match):
        phrase = match.group(0)
        words = phrase.replace(",", "").split()
        if any(word in NON_PERSON_NAME_WORDS for word in words):
            return phrase
        if "{" in phrase or "}" in phrase:
            return phrase
        return "{name}"

    return PERSON_NAME_RE.sub(replace, text)


def clean_body(raw_body):
    text = clean_text(raw_body)
    if not text:
        return ""

    lines = []
    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            if lines and lines[-1]:
                lines.append("")
            continue
        if REPLY_MARKER_RE.search(line):
            break
        if HEADER_LINE_RE.match(line) and lines:
            break
        if line.startswith(">"):
            continue
        if DISCLAIMER_RE.search(line):
            break
        if re.fullmatch(r"[-_=*]{4,}", line):
            continue
        lines.append(line)

    cleaned = "\n".join(lines).strip()
    cleaned = sanitize_placeholders(cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def body_is_usable(body, min_words, max_words):
    words = re.findall(r"[A-Za-z][A-Za-z'-]*", body)
    if len(words) < min_words or len(words) > max_words:
        return False
    lowered = body.lower()
    if any(term in lowered for term in ["password", "login", "click here", "unsubscribe"]):
        return False
    if body.count("{email}") > 2 or body.count("{link}") > 2:
        return False
    if len(set(word.lower() for word in words)) < max(10, int(len(words) * 0.35)):
        return False
    return True


def split_email_parts(subject, body):
    lines = [line.strip() for line in clean_text(body).split("\n") if line.strip()]
    greeting = "Hello,"
    closing = "Best,"
    signature = "[Your Name]"

    if lines and GREETING_RE.match(lines[0]):
        greeting = lines.pop(0)
    elif lines and looks_like_addressee_line(lines[0]):
        lines = lines[1:]

    closing_index = next((idx for idx, line in enumerate(lines[1:], start=1) if CLOSING_RE.match(line)), None)
    if closing_index is not None:
        closing = lines[closing_index]
        lines = lines[:closing_index]
    elif len(lines) >= 2 and CLOSING_RE.match(lines[-2]):
        closing = lines[-2]
        lines = lines[:-2]
    elif lines and CLOSING_RE.match(lines[-1]):
        closing = lines[-1]
        lines = lines[:-1]
    elif lines and looks_like_signature(lines[-1]):
        lines = lines[:-1]

    body_text = "\n\n".join(lines).strip() or body
    return {
        "subject": subject,
        "greeting": greeting,
        "body": body_text,
        "closing": closing,
        "signature": signature,
        "source": "enron-cleaned",
    }


def looks_like_signature(line):
    stripped = line.strip(" ,.")
    if len(stripped) > 40 or "." in stripped:
        return False
    words = stripped.split()
    return 1 <= len(words) <= 4 and all(word[:1].isupper() for word in words if word)


def looks_like_addressee_line(line):
    stripped = line.strip(" ,:;")
    if len(stripped) > 40 or "." in stripped or "{" in stripped:
        return False
    words = stripped.split()
    return 1 <= len(words) <= 4 and all(word[:1].isupper() for word in words if word)


def infer_category(subject, body):
    text = f"{subject} {body}".lower()
    checks = [
        ("Project Update", ["update", "status", "progress", "report", "forecast"]),
        ("Meeting Request", ["meeting", "meet", "call", "conference", "schedule"]),
        ("Follow-up", ["follow up", "following up", "checking in"]),
        ("Reminder", ["reminder", "deadline", "due", "please remember"]),
        ("Inquiry", ["question", "information", "clarify", "details", "request"]),
        ("Travel", ["travel", "trip", "flight", "hotel"]),
        ("Payment", ["invoice", "payment", "paid", "amount", "wire"]),
        ("Agreement", ["agreement", "contract", "deal", "terms"]),
    ]
    for category, keywords in checks:
        if any(keyword in text for keyword in keywords):
            return category
    return "Business Emails"


def tags_for_template(category, subject, body):
    tags = ["enron-cleaned", slugify(category)]
    words = re.findall(r"[a-z0-9]+", f"{subject} {body}".lower())
    for word in words:
        if len(word) < 4 or word in GENERIC_WORDS or word in tags:
            continue
        tags.append(word[:32])
        if len(tags) >= 8:
            break
    return tags[:8]


def slugify(value):
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "template"


def normalized_fingerprint(subject, body):
    text = f"{subject} {body}".lower()
    return re.sub(r"[^a-z0-9]+", "", text)[:500]


def unique_title(base_title, seen_titles):
    base_title = compact_line(base_title)[:100] or "Clean Business Email"
    title = base_title
    counter = 2
    while title.lower() in seen_titles:
        suffix = f" {counter}"
        title = f"{base_title[:100 - len(suffix)]}{suffix}"
        counter += 1
    seen_titles.add(title.lower())
    return title


def iter_csv_rows(path):
    source = Path(path).expanduser()
    if not source.exists():
        raise CommandError(f"File not found: {source}")

    if source.suffix.lower() == ".zip":
        with zipfile.ZipFile(source) as archive:
            names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
            if not names:
                raise CommandError("ZIP must contain at least one CSV file.")
            for name in names:
                with archive.open(name) as handle:
                    text_handle = io.TextIOWrapper(handle, encoding="utf-8-sig", newline="")
                    reader = csv.DictReader(text_handle)
                    for row in reader:
                        yield row
        return

    if source.suffix.lower() == ".csv":
        with source.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                yield row
        return

    raise CommandError("Use archive (2).zip or a CSV file with Subject and Message columns.")


def build_template(row, index, options):
    raw_subject = get_case_insensitive(row, options["subject_column"], "subject")
    raw_body = get_case_insensitive(row, options["message_column"], "message", "body", "content")
    subject = normalize_subject(raw_subject)
    body = clean_body(raw_body)

    if not subject_is_usable(subject) or not body_is_usable(body, options["min_words"], options["max_words"]):
        return None

    category = infer_category(subject, body)
    title = f"{category} - {subject}" if not subject.lower().startswith(category.lower()) else subject
    payload = split_email_parts(subject, body)
    if not body_is_usable(payload["body"], options["min_words"], options["max_words"]):
        return None
    payload["category"] = category

    return {
        "title": title,
        "content": json.dumps(payload),
        "footer": payload["closing"],
        "category": category,
        "tags": tags_for_template(category, subject, body),
        "access_tier": options["access_tier"],
        "fingerprint": normalized_fingerprint(subject, body),
        "source_index": index,
    }


class Command(BaseCommand):
    help = "Import cleaned Enron emails as reusable shared Template Library entries."

    def add_arguments(self, parser):
        parser.add_argument("path", help="Path to archive (2).zip or an Enron CSV.")
        parser.add_argument("--limit", type=int, default=200, help="Maximum cleaned templates to import.")
        parser.add_argument("--subject-column", default="Subject", help="CSV column containing the subject.")
        parser.add_argument("--message-column", default="Message", help="CSV column containing the message body.")
        parser.add_argument("--min-words", type=int, default=18, help="Minimum body word count after cleaning.")
        parser.add_argument("--max-words", type=int, default=180, help="Maximum body word count after cleaning.")
        parser.add_argument(
            "--access-tier",
            choices=sorted(VALID_TIERS),
            default=EmailTemplate.ACCESS_PREMIUM,
            help="Template Library access tier for imported templates.",
        )
        parser.add_argument("--clear-existing", action="store_true", help="Delete existing shared library templates first.")
        parser.add_argument(
            "--replace-existing",
            action="store_true",
            help="Delete only previously imported enron-cleaned templates before writing.",
        )
        parser.add_argument("--dry-run", action="store_true", help="Validate rows without writing to the database.")

    def handle(self, *args, **options):
        set_large_csv_field_limit()
        limit = max(1, options["limit"])
        records = []
        fingerprints = set()
        seen_titles = set()
        scanned = 0

        for index, row in enumerate(iter_csv_rows(options["path"]), start=1):
            scanned = index
            if len(records) >= limit:
                break
            record = build_template(row, index, options)
            if not record or record["fingerprint"] in fingerprints:
                continue
            fingerprints.add(record["fingerprint"])
            record["title"] = unique_title(record["title"], seen_titles)
            records.append(record)

        if not records:
            raise CommandError(f"No reusable email templates found after scanning {scanned} row(s).")

        if options["dry_run"]:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Validated {len(records)} cleaned Enron template(s) after scanning {scanned} row(s). "
                    "No database changes made."
                )
            )
            return

        created = 0
        updated = 0
        with transaction.atomic():
            if options["clear_existing"]:
                EmailTemplate.objects.filter(owner=None, is_database_template=True).delete()
            elif options["replace_existing"]:
                existing_ids = [
                    template.id
                    for template in EmailTemplate.objects.filter(owner=None, is_database_template=True)
                    if "enron-cleaned" in (template.tags or [])
                ]
                if existing_ids:
                    EmailTemplate.objects.filter(id__in=existing_ids).delete()

            for record in records:
                _, was_created = EmailTemplate.objects.update_or_create(
                    owner=None,
                    is_database_template=True,
                    title=record["title"],
                    defaults={
                        "content": record["content"],
                        "footer": record["footer"],
                        "category": record["category"],
                        "tags": record["tags"],
                        "access_tier": record["access_tier"],
                        "is_archived": False,
                        "deleted_at": None,
                    },
                )
                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {len(records)} cleaned Enron template(s) after scanning {scanned} row(s): "
                f"{created} created, {updated} updated."
            )
        )
