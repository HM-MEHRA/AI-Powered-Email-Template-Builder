import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from templates_api.models import EmailTemplate


VALID_TIERS = {EmailTemplate.ACCESS_FREE, EmailTemplate.ACCESS_PREMIUM}


def normalize_tags(value):
    if value in [None, ""]:
        return []
    if isinstance(value, str):
        value = value.split(",")
    if not isinstance(value, list):
        return []

    tags = []
    seen = set()
    for item in value:
        tag = str(item).strip()
        key = tag.lower()
        if tag and key not in seen:
            tags.append(tag[:32])
            seen.add(key)
    return tags[:8]


def normalize_template_item(item, default_tier):
    if not isinstance(item, dict):
        return None

    raw_content = item.get("content")
    structured_content = raw_content if isinstance(raw_content, dict) else {}

    subject = (
        item.get("subject")
        or structured_content.get("subject")
        or item.get("title")
        or "Library Template"
    )
    title = item.get("title") or subject
    greeting = item.get("greeting") or structured_content.get("greeting") or ""
    body = item.get("body") or structured_content.get("body") or ""
    closing = item.get("closing") or structured_content.get("closing") or item.get("footer") or ""
    signature = item.get("signature") or structured_content.get("signature") or "[Your Name]"
    tier = str(item.get("access_tier") or item.get("tier") or default_tier).strip().lower()

    if tier not in VALID_TIERS:
        raise CommandError(f"Invalid access_tier '{tier}' for template '{title}'. Use free or premium.")

    if isinstance(raw_content, str) and raw_content.strip() and not body:
        body = raw_content.strip()

    payload = {
        "subject": str(subject).strip() or str(title).strip(),
        "greeting": str(greeting).strip(),
        "body": str(body).strip(),
        "closing": str(closing).strip(),
        "signature": str(signature).strip() or "[Your Name]",
    }

    return {
        "title": str(title).strip() or payload["subject"],
        "content": json.dumps(payload),
        "footer": payload["closing"],
        "category": str(item.get("category") or "General").strip()[:80] or "General",
        "tags": normalize_tags(item.get("tags")),
        "access_tier": tier,
    }


class Command(BaseCommand):
    help = "Import starter/premium templates into the shared Template Library."

    def add_arguments(self, parser):
        parser.add_argument("file", help="Path to a JSON file containing a list or {\"templates\": [...]} object.")
        parser.add_argument(
            "--default-tier",
            choices=sorted(VALID_TIERS),
            default=EmailTemplate.ACCESS_FREE,
            help="Access tier to use when a template does not define access_tier.",
        )
        parser.add_argument(
            "--clear-existing",
            action="store_true",
            help="Delete existing shared library templates before importing.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and count templates without writing to the database.",
        )

    def handle(self, *args, **options):
        file_path = Path(options["file"]).expanduser()
        if not file_path.exists():
            raise CommandError(f"File not found: {file_path}")

        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise CommandError(f"Invalid JSON: {exc}") from exc

        raw_templates = data.get("templates") if isinstance(data, dict) else data
        if not isinstance(raw_templates, list):
            raise CommandError("JSON must be a list or an object with a templates list.")

        templates = [
            normalize_template_item(item, options["default_tier"])
            for item in raw_templates
        ]
        templates = [item for item in templates if item]

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS(f"Validated {len(templates)} template(s). No database changes made."))
            return

        created = 0
        updated = 0

        with transaction.atomic():
            if options["clear_existing"]:
                EmailTemplate.objects.filter(is_database_template=True, owner=None).delete()

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
