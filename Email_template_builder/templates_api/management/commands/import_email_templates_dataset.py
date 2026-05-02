import csv
import io
import json
import re
import zipfile
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from templates_api.models import EmailTemplate


VALID_TIERS = {EmailTemplate.ACCESS_FREE, EmailTemplate.ACCESS_PREMIUM}
GREETING_RE = re.compile(r"^(hi|hello|dear|hey|respected)\b.*[,!]?$", re.IGNORECASE)
CLOSING_RE = re.compile(
    r"^(best|regards|best regards|sincerely|thanks|thank you|warmly|cheers|with regards|kind regards)[,!.]?$",
    re.IGNORECASE,
)


def clean_text(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def parse_list_field(value):
    if value in [None, ""]:
        return []
    if isinstance(value, list):
        raw_items = value
    else:
        text = str(value).strip()
        if text.startswith("["):
            try:
                parsed = json.loads(text)
                raw_items = parsed if isinstance(parsed, list) else []
            except json.JSONDecodeError:
                raw_items = re.split(r"[;,]", text)
        else:
            raw_items = re.split(r"[;,]", text)

    items = []
    seen = set()
    for item in raw_items:
        normalized = str(item).strip().strip("\"'")
        key = normalized.lower()
        if normalized and key not in seen:
            items.append(normalized[:32])
            seen.add(key)
    return items[:8]


def split_email_parts(body, subject):
    lines = [line.strip() for line in clean_text(body).split("\n") if line.strip()]
    greeting = "Hello,"
    closing = "Best,"
    signature = "[Your Name]"

    if lines and GREETING_RE.match(lines[0]):
        greeting = lines.pop(0)

    if len(lines) >= 2 and CLOSING_RE.match(lines[-2]):
        closing = lines[-2]
        signature = lines[-1]
        lines = lines[:-2]
    elif lines and CLOSING_RE.match(lines[-1]):
        closing = lines[-1]
        lines = lines[:-1]

    return {
        "subject": clean_text(subject)[:100] or "Email Template",
        "greeting": greeting,
        "body": "\n\n".join(lines).strip() or clean_text(body),
        "closing": closing,
        "signature": signature,
    }


def load_json_templates(raw_bytes):
    data = json.loads(raw_bytes.decode("utf-8-sig"))
    templates = data.get("templates") if isinstance(data, dict) else data
    if not isinstance(templates, list):
        raise CommandError("JSON must be a list or an object with a templates list.")
    return [item for item in templates if isinstance(item, dict)]


def load_csv_templates(raw_bytes):
    reader = csv.DictReader(io.StringIO(raw_bytes.decode("utf-8-sig")))
    return [row for row in reader]


def load_dataset(path):
    source = Path(path).expanduser()
    if not source.exists():
        raise CommandError(f"File not found: {source}")

    suffix = source.suffix.lower()
    if suffix == ".json":
        return load_json_templates(source.read_bytes())
    if suffix == ".csv":
        return load_csv_templates(source.read_bytes())
    if suffix == ".zip":
        with zipfile.ZipFile(source) as archive:
            json_names = [name for name in archive.namelist() if name.lower().endswith(".json")]
            csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
            if json_names:
                return load_json_templates(archive.read(json_names[0]))
            if csv_names:
                return load_csv_templates(archive.read(csv_names[0]))
        raise CommandError("ZIP must contain a JSON or CSV dataset file.")

    raise CommandError("Use a .json, .csv, or .zip dataset file.")


def normalize_record(item, index, access_tier):
    body = clean_text(item.get("body") or item.get("email") or item.get("content") or "")
    if len(body.split()) < 5:
        return None

    subject = clean_text(item.get("subject") or item.get("title") or f"Email Template {index:03d}")
    category = clean_text(item.get("category") or "Imported Dataset")[:80] or "Imported Dataset"
    tone = clean_text(item.get("tone") or "")
    source = clean_text(item.get("source") or "imported")
    payload = split_email_parts(body, subject)
    payload.update(
        {
            "placeholders": parse_list_field(item.get("placeholders")),
            "language": clean_text(item.get("language") or "en"),
            "source": source,
            "created_at": clean_text(item.get("created_at") or ""),
        }
    )

    tags = parse_list_field(item.get("tags"))
    for extra_tag in [category, tone, source]:
        tag = extra_tag.lower().replace(" ", "-")
        if tag and tag not in tags:
            tags.append(tag[:32])
    tags = tags[:8]

    title_prefix = f"{category} - " if category and not subject.lower().startswith(category.lower()) else ""
    return {
        "title": f"{title_prefix}{subject}"[:100],
        "content": json.dumps(payload),
        "footer": payload["closing"],
        "category": category,
        "tags": tags,
        "access_tier": access_tier,
    }


class Command(BaseCommand):
    help = "Import email_templates.json/csv/zip datasets into the shared Template Library."

    def add_arguments(self, parser):
        parser.add_argument("path", help="Path to email_templates.json, email_templates.csv, or a ZIP containing one.")
        parser.add_argument("--limit", type=int, default=500, help="Maximum templates to import.")
        parser.add_argument(
            "--access-tier",
            choices=sorted(VALID_TIERS),
            default=EmailTemplate.ACCESS_PREMIUM,
            help="Template Library access tier for imported templates.",
        )
        parser.add_argument("--clear-existing", action="store_true", help="Delete existing shared library templates first.")
        parser.add_argument("--dry-run", action="store_true", help="Validate rows without writing to the database.")

    def handle(self, *args, **options):
        raw_records = load_dataset(options["path"])
        limit = max(1, options["limit"])
        templates = []

        for index, item in enumerate(raw_records, start=1):
            if len(templates) >= limit:
                break
            template = normalize_record(item, index, options["access_tier"])
            if template:
                templates.append(template)

        if not templates:
            raise CommandError("No usable templates found in the dataset.")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Validated {len(templates)} template(s). No database changes made."))
            return

        created = 0
        updated = 0
        with transaction.atomic():
            if options["clear_existing"]:
                EmailTemplate.objects.filter(owner=None, is_database_template=True).delete()

            for template in templates:
                _, was_created = EmailTemplate.objects.update_or_create(
                    owner=None,
                    is_database_template=True,
                    title=template["title"],
                    defaults={
                        "content": template["content"],
                        "footer": template["footer"],
                        "category": template["category"],
                        "tags": template["tags"],
                        "access_tier": template["access_tier"],
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
                f"Imported {len(templates)} template(s): {created} created, {updated} updated."
            )
        )
