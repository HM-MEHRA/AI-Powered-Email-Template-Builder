import csv
import json
import re
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from templates_api.models import EmailTemplate


LEGITIMATE_LABELS = {"0", "legitimate", "legit", "ham", "safe"}
PHISHING_LABELS = {"1", "phishing", "phish", "spam", "malicious"}
GREETING_RE = re.compile(r"^(hi|hello|dear|hey)\b.*[,!]?$", re.IGNORECASE)
CLOSING_RE = re.compile(r"^(best|regards|best regards|sincerely|thanks|thank you|warmly|cheers)[,!.]?$", re.IGNORECASE)


def find_csv_files(path):
    source = Path(path).expanduser()
    if source.is_file():
        return [source] if source.suffix.lower() == ".csv" else []
    if source.is_dir():
        return sorted(source.rglob("*.csv"))
    return []


def row_is_legitimate(row, label_column, type_column):
    label = str(row.get(label_column, "")).strip().lower()
    phishing_type = str(row.get(type_column, "")).strip().lower() if type_column else ""

    if label in PHISHING_LABELS:
        return False
    if phishing_type and phishing_type not in {"legitimate", "legit", "ham", "safe", "none", "null", "nan"}:
        return False
    return label in LEGITIMATE_LABELS or phishing_type in {"legitimate", "legit", "ham", "safe"}


def clean_text(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_email_parts(text, index):
    lines = [line.strip() for line in clean_text(text).split("\n") if line.strip()]
    subject = f"Legitimate Email Template {index:03d}"
    greeting = "Hello,"
    closing = "Best,"
    signature = "[Your Name]"

    if lines and lines[0].lower().startswith("subject:"):
        subject = lines.pop(0).split(":", 1)[1].strip() or subject

    if lines and GREETING_RE.match(lines[0]):
        greeting = lines.pop(0)

    if len(lines) >= 2 and CLOSING_RE.match(lines[-2]):
        closing = lines[-2]
        signature = lines[-1]
        lines = lines[:-2]
    elif lines and CLOSING_RE.match(lines[-1]):
        closing = lines[-1]
        lines = lines[:-1]

    body = "\n\n".join(lines).strip() or clean_text(text)
    return {
        "subject": subject[:100],
        "greeting": greeting,
        "body": body,
        "closing": closing,
        "signature": signature,
    }


def parse_tags(value):
    tags = []
    seen = set()
    for item in str(value or "").split(","):
        tag = item.strip()
        key = tag.lower()
        if tag and key not in seen:
            tags.append(tag[:32])
            seen.add(key)
    return tags[:8]


class Command(BaseCommand):
    help = "Import legitimate rows from the Kaggle phishing/legitimate email CSV into the Template Library."

    def add_arguments(self, parser):
        parser.add_argument("path", help="Downloaded Kaggle dataset folder or CSV file.")
        parser.add_argument("--limit", type=int, default=300, help="Maximum legitimate emails to import.")
        parser.add_argument("--text-column", default="text", help="CSV column containing the email body.")
        parser.add_argument("--label-column", default="label", help="CSV column containing 0/1 or legitimate/phishing.")
        parser.add_argument("--type-column", default="phishing_type", help="CSV column containing phishing type.")
        parser.add_argument(
            "--access-tier",
            choices=[EmailTemplate.ACCESS_FREE, EmailTemplate.ACCESS_PREMIUM],
            default=EmailTemplate.ACCESS_PREMIUM,
            help="Template Library access tier for imported legitimate emails.",
        )
        parser.add_argument("--category", default="Imported Emails", help="Category for imported templates.")
        parser.add_argument("--tags", default="kaggle, legitimate", help="Comma-separated tags for imported templates.")
        parser.add_argument("--clear-existing", action="store_true", help="Delete existing shared library templates first.")
        parser.add_argument("--dry-run", action="store_true", help="Validate rows without writing to the database.")

    def handle(self, *args, **options):
        csv_files = find_csv_files(options["path"])
        if not csv_files:
            raise CommandError(f"No CSV files found at {options['path']}")

        limit = max(1, options["limit"])
        rows_to_import = []

        for csv_file in csv_files:
            with csv_file.open("r", encoding="utf-8-sig", newline="") as handle:
                reader = csv.DictReader(handle)
                required_columns = {options["text_column"], options["label_column"]}
                missing = required_columns - set(reader.fieldnames or [])
                if missing:
                    continue

                for row in reader:
                    if len(rows_to_import) >= limit:
                        break
                    if not row_is_legitimate(row, options["label_column"], options["type_column"]):
                        continue
                    email_text = clean_text(row.get(options["text_column"]))
                    if len(email_text.split()) < 8:
                        continue
                    rows_to_import.append(email_text)

            if len(rows_to_import) >= limit:
                break

        if not rows_to_import:
            raise CommandError("No legitimate email rows were found to import.")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Validated {len(rows_to_import)} legitimate email(s). No database changes made."))
            return

        base_tags = parse_tags(options["tags"])
        created = 0
        updated = 0

        with transaction.atomic():
            if options["clear_existing"]:
                EmailTemplate.objects.filter(owner=None, is_database_template=True).delete()

            for index, text in enumerate(rows_to_import, start=1):
                payload = split_email_parts(text, index)
                title = payload["subject"] or f"Legitimate Email Template {index:03d}"
                _, was_created = EmailTemplate.objects.update_or_create(
                    owner=None,
                    is_database_template=True,
                    title=title,
                    defaults={
                        "content": json.dumps(payload),
                        "footer": payload["closing"],
                        "category": options["category"][:80],
                        "tags": base_tags,
                        "access_tier": options["access_tier"],
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
                f"Imported {len(rows_to_import)} legitimate email(s): {created} created, {updated} updated."
            )
        )
