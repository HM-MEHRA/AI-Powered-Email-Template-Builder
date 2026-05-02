import csv
import io
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from templates_api.models import EmailTemplate


VALID_TIERS = {EmailTemplate.ACCESS_FREE, EmailTemplate.ACCESS_PREMIUM}
SHEET_NS = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
GREETING_RE = re.compile(r"^(hi|hello|dear|hey)\b.*[,!]?$", re.IGNORECASE)
CLOSING_RE = re.compile(r"^(best|regards|best regards|sincerely|thanks|thank you|warmly|cheers|with regards)[,!.]?$", re.IGNORECASE)


def clean_text(value):
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def title_from_tag(tag, index):
    title = re.sub(r"\s+", " ", str(tag or "").strip())
    if not title:
        return f"Email Format Template {index:03d}"
    return title[:100]


def category_from_tag(tag):
    text = str(tag or "").lower()
    if any(word in text for word in ["interview", "job", "hiring", "application", "cover letter"]):
        return "Career"
    if any(word in text for word in ["thank", "appreciation"]):
        return "Thank You"
    if any(word in text for word in ["complaint", "apology", "sorry"]):
        return "Support"
    if any(word in text for word in ["meeting", "appointment", "schedule"]):
        return "Business"
    if any(word in text for word in ["invitation", "birthday", "event", "party"]):
        return "Events"
    return "Email Formats"


def tags_from_tag(tag):
    words = re.findall(r"[a-z0-9]+", str(tag or "").lower())
    stop_words = {"a", "an", "and", "for", "of", "or", "the", "to", "with"}
    tags = ["email-format"]
    for word in words:
        if word not in stop_words and word not in tags:
            tags.append(word[:32])
        if len(tags) >= 8:
            break
    return tags


def split_email_parts(text, title):
    lines = [line.strip() for line in clean_text(text).split("\n") if line.strip()]
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

    body = "\n\n".join(lines).strip() or clean_text(text)
    return {
        "subject": title,
        "greeting": greeting,
        "body": body,
        "closing": closing,
        "signature": signature,
    }


def cell_ref_column(cell_ref):
    return re.sub(r"[^A-Z]", "", cell_ref or "")


def read_xlsx_rows(xlsx_bytes):
    with zipfile.ZipFile(io.BytesIO(xlsx_bytes)) as workbook:
        shared_strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            shared_root = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            for item in shared_root.findall("a:si", SHEET_NS):
                shared_strings.append("".join(text.text or "" for text in item.findall(".//a:t", SHEET_NS)))

        sheet_name = next((name for name in workbook.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")), None)
        if not sheet_name:
            return []

        sheet_root = ET.fromstring(workbook.read(sheet_name))
        rows = []
        for row in sheet_root.findall(".//a:sheetData/a:row", SHEET_NS):
            values_by_column = {}
            for cell in row.findall("a:c", SHEET_NS):
                value_node = cell.find("a:v", SHEET_NS)
                if value_node is None:
                    continue
                raw_value = value_node.text or ""
                if cell.attrib.get("t") == "s" and raw_value.isdigit():
                    raw_value = shared_strings[int(raw_value)] if int(raw_value) < len(shared_strings) else raw_value
                values_by_column[cell_ref_column(cell.attrib.get("r"))] = raw_value
            if values_by_column:
                ordered_columns = sorted(values_by_column, key=lambda col: sum((ord(ch) - 64) for ch in col))
                rows.append([values_by_column[column] for column in ordered_columns])
        return rows


def load_dataset_rows(path):
    source = Path(path).expanduser()
    if not source.exists():
        raise CommandError(f"File not found: {source}")

    if source.suffix.lower() == ".zip":
        rows = []
        with zipfile.ZipFile(source) as archive:
            for name in archive.namelist():
                lowered = name.lower()
                if lowered.endswith(".xlsx"):
                    rows.extend(read_xlsx_rows(archive.read(name)))
                elif lowered.endswith(".csv"):
                    rows.extend(list(csv.reader(io.StringIO(archive.read(name).decode("utf-8-sig")))))
        return rows

    if source.suffix.lower() == ".xlsx":
        return read_xlsx_rows(source.read_bytes())

    if source.suffix.lower() == ".csv":
        with source.open("r", encoding="utf-8-sig", newline="") as handle:
            return list(csv.reader(handle))

    raise CommandError("Use a .zip, .xlsx, or .csv file.")


class Command(BaseCommand):
    help = "Import an email/tag dataset into the shared Template Library."

    def add_arguments(self, parser):
        parser.add_argument("path", help="Path to archive.zip, .xlsx, or .csv containing email and tag columns.")
        parser.add_argument("--limit", type=int, default=300, help="Maximum rows to import.")
        parser.add_argument(
            "--access-tier",
            choices=sorted(VALID_TIERS),
            default=EmailTemplate.ACCESS_PREMIUM,
            help="Template Library access tier for imported templates.",
        )
        parser.add_argument("--clear-existing", action="store_true", help="Delete existing shared library templates first.")
        parser.add_argument("--dry-run", action="store_true", help="Validate rows without writing to the database.")

    def handle(self, *args, **options):
        rows = load_dataset_rows(options["path"])
        if not rows:
            raise CommandError("No rows found in the dataset.")

        header = [str(value).strip().lower() for value in rows[0]]
        if "email" not in header or "tag" not in header:
            raise CommandError("Dataset must include email and tag columns.")

        email_index = header.index("email")
        tag_index = header.index("tag")
        limit = max(1, options["limit"])

        records = []
        for row in rows[1:]:
            if len(records) >= limit:
                break
            if len(row) <= max(email_index, tag_index):
                continue
            email_text = clean_text(row[email_index])
            tag = clean_text(row[tag_index])
            if len(email_text.split()) < 8:
                continue
            title = title_from_tag(tag, len(records) + 1)
            records.append(
                {
                    "title": title,
                    "payload": split_email_parts(email_text, title),
                    "category": category_from_tag(tag),
                    "tags": tags_from_tag(tag),
                }
            )

        if not records:
            raise CommandError("No usable email rows found.")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Validated {len(records)} email template(s). No database changes made."))
            return

        created = 0
        updated = 0

        with transaction.atomic():
            if options["clear_existing"]:
                EmailTemplate.objects.filter(owner=None, is_database_template=True).delete()

            for record in records:
                _, was_created = EmailTemplate.objects.update_or_create(
                    owner=None,
                    is_database_template=True,
                    title=record["title"],
                    defaults={
                        "content": json.dumps(record["payload"]),
                        "footer": record["payload"]["closing"],
                        "category": record["category"],
                        "tags": record["tags"],
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
                f"Imported {len(records)} email template(s): {created} created, {updated} updated."
            )
        )
