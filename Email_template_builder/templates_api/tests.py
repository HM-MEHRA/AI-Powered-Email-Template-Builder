import json
import tempfile
from io import StringIO
from pathlib import Path

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.throttling import AnonRateThrottle
from rest_framework.test import APITestCase
from unittest.mock import patch

from .models import EmailGenerationHistory, EmailTemplate, TemplateFavorite, TemplateShare
from .generation_service import (
    build_mock_email_variations,
    clean_generated_body,
    clean_subject_line,
    finalize_variations,
    is_low_quality_body,
)
from .upload_utils import validate_uploaded_file
from .views import LoginView


class AuthAndTemplateApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123",
        )
        self.collaborator = User.objects.create_user(
            username="collab",
            email="collab@example.com",
            password="StrongPass123",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="StrongPass123",
        )

    def authenticate(self, username, password="StrongPass123"):
        response = self.client.post(
            "/api/auth/login/",
            {"username": username, "password": password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        token = response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")
        return response

    def test_signup_returns_token_and_user(self):
        response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)
        self.assertEqual(response.data["user"]["username"], "newuser")

    def test_health_endpoint_is_public(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["service"], "inbox-studio-api")

    def test_anonymous_rate_limit_returns_429(self):
        class TwoRequestAnonThrottle(AnonRateThrottle):
            rate = "2/min"

        cache.clear()
        original_throttle_classes = LoginView.throttle_classes
        LoginView.throttle_classes = [TwoRequestAnonThrottle]

        try:
            for _ in range(2):
                response = self.client.post(
                    "/api/auth/login/",
                    {"username": "missing", "password": "bad"},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

            throttled_response = self.client.post(
                "/api/auth/login/",
                {"username": "missing", "password": "bad"},
                format="json",
            )
            self.assertEqual(throttled_response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        finally:
            LoginView.throttle_classes = original_throttle_classes

    def test_signup_generates_unique_login_id_when_not_provided(self):
        response = self.client.post(
            "/api/auth/signup/",
            {
                "email": "newuser@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "newuser")

        second_response = self.client.post(
            "/api/auth/signup/",
            {
                "email": "another@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["user"]["username"], "newuser2")

    def test_signup_rejects_email_as_login_id(self):
        response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "newuser@example.com",
                "email": "newuser@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "User",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_signup_requires_email_and_strong_password(self):
        missing_email_response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "missingemail",
                "password": "StrongPass123",
                "first_name": "Missing",
                "last_name": "Email",
            },
            format="json",
        )
        self.assertEqual(missing_email_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", missing_email_response.data)

        weak_password_response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "weakpass",
                "email": "weakpass@example.com",
                "password": "password",
                "first_name": "Weak",
                "last_name": "Password",
            },
            format="json",
        )
        self.assertEqual(weak_password_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", weak_password_response.data)

    def test_signup_rejects_duplicate_login_id_case_insensitive(self):
        response = self.client.post(
            "/api/auth/signup/",
            {
                "username": "OWNER",
                "email": "new-owner@example.com",
                "password": "StrongPass123",
                "first_name": "New",
                "last_name": "Owner",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_history_is_scoped_per_user(self):
        EmailGenerationHistory.objects.create(
            owner=self.owner,
            subject="Owner history",
            purpose="Owner purpose",
            tone="Professional",
            prompt="Owner prompt",
            variations=[{"subject": "Owner variation"}],
        )
        EmailGenerationHistory.objects.create(
            owner=self.other_user,
            subject="Other history",
            purpose="Other purpose",
            tone="Warm",
            prompt="Other prompt",
            variations=[{"subject": "Other variation"}],
        )

        self.authenticate("owner")
        response = self.client.get("/api/history/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["subject"], "Owner history")

    def test_user_can_delete_own_history_item_and_clear_history(self):
        first = EmailGenerationHistory.objects.create(
            owner=self.owner,
            subject="First history",
            purpose="Owner purpose",
            tone="Professional",
            prompt="Owner prompt",
            variations=[{"subject": "First variation"}],
        )
        EmailGenerationHistory.objects.create(
            owner=self.owner,
            subject="Second history",
            purpose="Owner purpose",
            tone="Professional",
            prompt="Owner prompt",
            variations=[{"subject": "Second variation"}],
        )
        other = EmailGenerationHistory.objects.create(
            owner=self.other_user,
            subject="Other history",
            purpose="Other purpose",
            tone="Warm",
            prompt="Other prompt",
            variations=[{"subject": "Other variation"}],
        )

        self.authenticate("owner")
        delete_response = self.client.delete(f"/api/history/{first.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EmailGenerationHistory.objects.filter(id=first.id).exists())
        self.assertTrue(EmailGenerationHistory.objects.filter(id=other.id).exists())

        clear_response = self.client.delete("/api/history/")
        self.assertEqual(clear_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(EmailGenerationHistory.objects.filter(owner=self.owner).exists())
        self.assertTrue(EmailGenerationHistory.objects.filter(id=other.id).exists())

    @override_settings(USE_OLLAMA_ONLY=True, OPENAI_API_KEY="")
    def test_generation_allows_anonymous_user_without_saving_history(self):
        draft = build_mock_email_variations("Hello", "Write a short email", "Professional", 1)[0]
        with patch("templates_api.views.generate_single_variation", return_value=draft):
            response = self.client.post(
                "/api/generateEmail/",
                {
                    "subject": "Hello",
                    "purpose": "Write a short email",
                    "tone": "Professional",
                    "variation_count": 1,
                    "style_index": 0,
                    "save_history": "false",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("variation", response.data)
        self.assertNotIn("history_entry", response.data)

    def test_clean_subject_line_rejects_label_only_subject(self):
        self.assertEqual(
            clean_subject_line("Subject", "applying for an internship at google"),
            "Applying For An Internship At Google",
        )
        self.assertEqual(
            clean_subject_line("Subject:", "birthday invitation"),
            "Birthday Invitation",
        )
        self.assertEqual(
            clean_subject_line("Subject: Project update", "fallback"),
            "Project update",
        )

    def test_finalize_variations_repairs_placeholder_subject(self):
        variations = finalize_variations(
            [
                {
                    "subject": "Subject",
                    "greeting": "Hello,",
                    "body": "I am writing to share a quick update about the internship application.",
                    "closing": "Best regards,",
                    "signature": "[Your Name]",
                }
            ],
            "applying for an internship at google",
            "Professional",
            "Apply for the internship and introduce my background.",
        )

        self.assertEqual(variations[0]["subject"], "Applying For An Internship At Google")

    def test_upload_validation_rejects_bad_type_and_large_file(self):
        bad_file = SimpleUploadedFile("script.exe", b"bad", content_type="application/octet-stream")
        with self.assertRaises(ValidationError):
            validate_uploaded_file(bad_file)

        large_file = SimpleUploadedFile("notes.txt", b"x" * (9 * 1024 * 1024), content_type="text/plain")
        with self.assertRaises(ValidationError):
            validate_uploaded_file(large_file)

    @override_settings(USE_OLLAMA_ONLY=True, OPENAI_API_KEY="", OLLAMA_URL="http://127.0.0.1:9/api/generate")
    def test_ollama_only_generation_returns_actionable_error_when_ollama_is_down(self):
        self.authenticate("owner")
        response = self.client.post(
            "/api/generateEmail/",
            {
                "subject": "Birthday invite",
                "purpose": "Invite family and friends",
                "tone": "Friendly",
                "variation_count": 3,
                "style_index": 0,
                "save_history": "false",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("Ollama", response.data["detail"])

    def test_template_owner_can_create_favorite_and_share(self):
        self.authenticate("owner")
        create_response = self.client.post(
            "/api/templates/",
            {
                "title": "Welcome Email",
                "content": "Hello there",
                "footer": "Best regards",
                "image_url": "https://example.com/banner.png",
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        template_id = create_response.data["id"]
        self.assertEqual(create_response.data["owner"]["username"], "owner")

        favorite_response = self.client.post(f"/api/templates/{template_id}/favorite/")
        self.assertEqual(favorite_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TemplateFavorite.objects.filter(user=self.owner, template_id=template_id).exists())

        share_response = self.client.post(
            f"/api/templates/{template_id}/share/",
            {"shared_with_username": "collab", "permission": "edit"},
            format="json",
        )
        self.assertEqual(share_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            TemplateShare.objects.filter(
                template_id=template_id,
                owner=self.owner,
                shared_with=self.collaborator,
                permission="edit",
            ).exists()
        )

    def test_shared_template_is_visible_to_recipient_only(self):
        template = EmailTemplate.objects.create(
            owner=self.owner,
            title="Shared template",
            content="Shared body",
            footer="Shared footer",
        )
        TemplateShare.objects.create(
            template=template,
            owner=self.owner,
            shared_with=self.collaborator,
            permission="view",
        )

        self.authenticate("collab")
        response = self.client.get("/api/templates/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], template.id)
        self.assertEqual(response.data[0]["access_level"], "view")

        self.client.credentials()
        self.authenticate("other")
        other_response = self.client.get("/api/templates/")
        self.assertEqual(other_response.status_code, status.HTTP_200_OK)
        self.assertEqual(other_response.data, [])

    @override_settings(DATABASE_TEMPLATE_FREE_LIMIT=2, PREMIUM_USERNAMES=[], PREMIUM_USER_EMAILS=[])
    def test_database_template_access_is_limited_for_free_and_full_for_premium(self):
        EmailTemplate.objects.filter(is_database_template=True).delete()
        for index in range(3):
            EmailTemplate.objects.create(
                owner=None,
                title=f"Free database template {index + 1}",
                content='{"subject":"Free","body":"Free body"}',
                footer="Best",
                is_database_template=True,
                access_tier=EmailTemplate.ACCESS_FREE,
            )
        for index in range(2):
            EmailTemplate.objects.create(
                owner=None,
                title=f"Premium database template {index + 1}",
                content='{"subject":"Premium","body":"Premium body"}',
                footer="Best",
                is_database_template=True,
                access_tier=EmailTemplate.ACCESS_PREMIUM,
            )

        self.authenticate("owner")
        free_response = self.client.get("/api/database-templates/")

        self.assertEqual(free_response.status_code, status.HTTP_200_OK)
        self.assertEqual(free_response.data["access"]["plan"], "free")
        self.assertEqual(free_response.data["access"]["visible_count"], 2)
        self.assertEqual(len(free_response.data["templates"]), 2)
        self.assertTrue(
            all(item["access_tier"] == EmailTemplate.ACCESS_FREE for item in free_response.data["templates"])
        )

        self.owner.is_staff = True
        self.owner.save(update_fields=["is_staff"])
        premium_response = self.client.get("/api/database-templates/")

        self.assertEqual(premium_response.status_code, status.HTTP_200_OK)
        self.assertEqual(premium_response.data["access"]["plan"], "premium")
        self.assertEqual(premium_response.data["access"]["visible_count"], 5)
        self.assertEqual(len(premium_response.data["templates"]), 5)

    def test_import_template_library_command_upserts_shared_templates(self):
        payload = {
            "templates": [
                {
                    "title": "Bulk Birthday Invite",
                    "subject": "Birthday Invitation",
                    "greeting": "Hey [Name],",
                    "body": "Please join us for the birthday celebration.",
                    "closing": "See you soon,",
                    "signature": "[Your Name]",
                    "category": "Events",
                    "tags": ["birthday", "bulk"],
                    "access_tier": "free",
                },
                {
                    "title": "Bulk Premium Outreach",
                    "subject": "A Quick Idea for Your Team",
                    "body": "I wanted to share a focused idea that could help your team save time.",
                    "category": "Sales",
                    "tags": "sales, premium",
                    "access_tier": "premium",
                },
            ]
        }

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as temp_file:
                json.dump(payload, temp_file)
                temp_path = Path(temp_file.name)

            first_output = StringIO()
            call_command("import_template_library", str(temp_path), "--clear-existing", stdout=first_output)
            self.assertIn("2 created", first_output.getvalue())

            second_output = StringIO()
            call_command("import_template_library", str(temp_path), stdout=second_output)
            self.assertIn("2 updated", second_output.getvalue())
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)

        library_templates = EmailTemplate.objects.filter(is_database_template=True, owner=None)
        self.assertEqual(library_templates.count(), 2)
        self.assertEqual(library_templates.filter(access_tier=EmailTemplate.ACCESS_FREE).count(), 1)
        premium_template = library_templates.get(title="Bulk Premium Outreach")
        self.assertEqual(premium_template.tags, ["sales", "premium"])

    def test_import_kaggle_legitimate_emails_filters_phishing_rows(self):
        csv_body = (
            "text,label,phishing_type,severity,confidence\n"
            "\"Subject: Team Update\nHello team,\nThe weekly notes are ready for review.\nBest,\n[Your Name]\",0,legitimate,low,0.98\n"
            "\"Subject: Verify Password\nClick this urgent login link now.\",1,credential_harvesting,high,0.99\n"
            "\"Hello,\nYour meeting has been moved to Thursday afternoon.\nRegards,\n[Your Name]\",0,legitimate,low,0.97\n"
        )

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".csv", encoding="utf-8", newline="", delete=False) as temp_file:
                temp_file.write(csv_body)
                temp_path = Path(temp_file.name)

            output = StringIO()
            call_command(
                "import_kaggle_legitimate_emails",
                str(temp_path),
                "--clear-existing",
                "--limit",
                "10",
                stdout=output,
            )
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)

        self.assertIn("Imported 2 legitimate email", output.getvalue())
        library_templates = EmailTemplate.objects.filter(is_database_template=True, owner=None)
        self.assertEqual(library_templates.count(), 2)
        self.assertEqual(library_templates.filter(access_tier=EmailTemplate.ACCESS_PREMIUM).count(), 2)
        combined_content = "\n".join(library_templates.values_list("content", flat=True)).lower()
        self.assertIn("weekly notes", combined_content)
        self.assertNotIn("verify password", combined_content)

    def test_import_email_format_dataset_uses_email_and_tag_columns(self):
        csv_body = (
            "email,tag\n"
            "\"Dear [name]\nThank you for the interview yesterday.\nBest regards,\n[Your Name]\",Thank you email for a job interview\n"
            "\"Hello [name]\nPlease join us for the celebration this weekend.\nCheers,\n[Your Name]\",Birthday invitation email\n"
        )

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".csv", encoding="utf-8", newline="", delete=False) as temp_file:
                temp_file.write(csv_body)
                temp_path = Path(temp_file.name)

            output = StringIO()
            call_command(
                "import_email_format_dataset",
                str(temp_path),
                "--clear-existing",
                "--access-tier",
                "premium",
                stdout=output,
            )
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)

        self.assertIn("Imported 2 email template", output.getvalue())
        library_templates = EmailTemplate.objects.filter(is_database_template=True, owner=None)
        self.assertEqual(library_templates.count(), 2)
        self.assertEqual(library_templates.filter(access_tier=EmailTemplate.ACCESS_PREMIUM).count(), 2)
        self.assertTrue(library_templates.filter(title="Thank you email for a job interview").exists())
        self.assertTrue(library_templates.filter(category="Career").exists())

    def test_import_email_templates_dataset_supports_report_schema_json(self):
        payload = [
            {
                "id": 1,
                "category": "Leave Request",
                "tone": "formal",
                "subject": "Leave Request for {date}",
                "body": "Dear {name}, I would like to request leave on {date} due to personal reasons. Thank you.",
                "placeholders": ["name", "date"],
                "tags": ["leave_request"],
                "length": 96,
                "language": "en",
                "source": "generated",
                "created_at": "2026-05-02",
            },
            {
                "id": 2,
                "category": "Event Invitation",
                "tone": "informal",
                "subject": "Birthday Invitation",
                "body": "Hey {name}, please join us for the birthday celebration on {date}.",
                "placeholders": ["name", "date"],
                "tags": "birthday,event",
                "language": "en",
                "source": "generated",
            },
        ]

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False) as temp_file:
                json.dump(payload, temp_file)
                temp_path = Path(temp_file.name)

            output = StringIO()
            call_command(
                "import_email_templates_dataset",
                str(temp_path),
                "--clear-existing",
                stdout=output,
            )
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)

        self.assertIn("Imported 2 template", output.getvalue())
        library_templates = EmailTemplate.objects.filter(is_database_template=True, owner=None)
        self.assertEqual(library_templates.count(), 2)
        leave_template = library_templates.get(category="Leave Request")
        parsed_content = json.loads(leave_template.content)
        self.assertEqual(parsed_content["placeholders"], ["name", "date"])
        self.assertIn("leave_request", leave_template.tags)

    def test_import_enron_templates_cleans_and_filters_raw_rows(self):
        csv_body = (
            "Message-ID,Date,From,To,Subject,Message,Cc,Bcc\n"
            "<1>,Mon,sender@example.com,team@example.com,Project Status,"
            "\"Hello team,\n"
            "The project update is ready for review. Please send feedback to Jane Doe at jane@example.com by May 5. "
            "I will use the notes to prepare the final report for the meeting agenda tomorrow.\n"
            "Best,\n"
            "Jane\",,\n"
            "<2>,Tue,sender@example.com,team@example.com,Re: Old Chain,"
            "\"Thanks.\n\n-----Original Message-----\nFrom: Someone\",,\n"
            "<3>,Wed,sender@example.com,team@example.com,Test,\"test successful\",,\n"
        )

        temp_path = None
        try:
            with tempfile.NamedTemporaryFile("w", suffix=".csv", encoding="utf-8", newline="", delete=False) as temp_file:
                temp_file.write(csv_body)
                temp_path = Path(temp_file.name)
            output = StringIO()
            call_command(
                "import_enron_templates",
                str(temp_path),
                "--clear-existing",
                "--limit",
                "10",
                stdout=output,
            )
        finally:
            if temp_path:
                temp_path.unlink(missing_ok=True)

        self.assertIn("Imported 1 cleaned Enron template", output.getvalue())
        library_templates = EmailTemplate.objects.filter(is_database_template=True, owner=None)
        self.assertEqual(library_templates.count(), 1)
        template = library_templates.get()
        parsed_content = json.loads(template.content)
        self.assertEqual(template.category, "Project Update")
        self.assertIn("{email}", parsed_content["body"])
        self.assertIn("{date}", parsed_content["body"])
        self.assertIn("{name}", parsed_content["body"])
        self.assertNotIn("Jane Doe", parsed_content["body"])
        self.assertNotIn("jane@example.com", parsed_content["body"])

    def test_recipient_with_edit_access_can_update_but_not_delete(self):
        template = EmailTemplate.objects.create(
            owner=self.owner,
            title="Editable template",
            content="Shared body",
            footer="Shared footer",
        )
        TemplateShare.objects.create(
            template=template,
            owner=self.owner,
            shared_with=self.collaborator,
            permission="edit",
        )

        self.authenticate("collab")
        patch_response = self.client.patch(
            f"/api/templates/{template.id}/",
            {"title": "Edited by collaborator"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertEqual(template.title, "Edited by collaborator")

        delete_response = self.client.delete(f"/api/templates/{template.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_delete_saved_template(self):
        template = EmailTemplate.objects.create(
            owner=self.owner,
            title="Deletable template",
            content="Saved body",
            footer="Saved footer",
        )

        self.authenticate("owner")
        response = self.client.delete(f"/api/templates/{template.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        template.refresh_from_db()
        self.assertIsNotNone(template.deleted_at)
        self.assertEqual(self.client.get("/api/templates/").data, [])

        restore_response = self.client.post(f"/api/templates/{template.id}/restore/")
        self.assertEqual(restore_response.status_code, status.HTTP_200_OK)
        template.refresh_from_db()
        self.assertIsNone(template.deleted_at)
        self.assertEqual(len(self.client.get("/api/templates/").data), 1)

    def test_saved_template_can_be_categorized_tagged_and_archived(self):
        self.authenticate("owner")
        create_response = self.client.post(
            "/api/templates/",
            {
                "title": "Client follow-up",
                "content": "Hello client",
                "footer": "Best regards",
                "category": "Follow Up",
                "tags": ["client", "sales"],
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        template_id = create_response.data["id"]

        patch_response = self.client.patch(
            f"/api/templates/{template_id}/",
            {
                "category": "Outreach",
                "tags": "sales, client, sales, priority",
                "is_archived": True,
            },
            format="json",
        )

        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["category"], "Outreach")
        self.assertEqual(patch_response.data["tags"], ["sales", "client", "priority"])
        self.assertTrue(patch_response.data["is_archived"])

    def test_duplicate_saved_template_is_rejected(self):
        self.authenticate("owner")
        payload = {
            "title": "Reusable draft",
            "content": "Same content",
            "footer": "Best",
        }
        first_response = self.client.post("/api/templates/", payload, format="json")
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        duplicate_response = self.client.post("/api/templates/", payload, format="json")
        self.assertEqual(duplicate_response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("existing_template", duplicate_response.data)

    def test_account_stats_export_and_import_templates(self):
        active_template = EmailTemplate.objects.create(
            owner=self.owner,
            title="Active",
            content="Active body",
            footer="Best",
            category="Sales",
            tags=["client"],
        )
        EmailTemplate.objects.create(
            owner=self.owner,
            title="Archived",
            content="Archived body",
            footer="Bye",
            category="Support",
            tags=["old"],
            is_archived=True,
        )
        TemplateFavorite.objects.create(user=self.owner, template=active_template)
        TemplateShare.objects.create(
            template=active_template,
            owner=self.owner,
            shared_with=self.collaborator,
            permission="view",
        )
        EmailGenerationHistory.objects.create(
            owner=self.owner,
            subject="Stats history",
            purpose="Track account activity",
            tone="Professional, Warm",
            prompt="Prompt",
            variations=[{"subject": "Stats history"}],
        )

        self.authenticate("owner")
        stats_response = self.client.get("/api/account/stats/")
        self.assertEqual(stats_response.status_code, status.HTTP_200_OK)
        self.assertEqual(stats_response.data["templates"], 2)
        self.assertEqual(stats_response.data["active_templates"], 1)
        self.assertEqual(stats_response.data["archived_templates"], 1)
        self.assertEqual(stats_response.data["history"], 1)
        self.assertEqual(stats_response.data["favorites"], 1)
        self.assertEqual(stats_response.data["shares_sent"], 1)
        self.assertIn("Sales", stats_response.data["categories"])

        export_response = self.client.get("/api/account/export/")
        self.assertEqual(export_response.status_code, status.HTTP_200_OK)
        self.assertEqual(export_response.data["version"], 1)
        self.assertIn("exported_at", export_response.data)
        self.assertEqual(len(export_response.data["templates"]), 2)
        self.assertEqual(len(export_response.data["history"]), 1)

        import_response = self.client.post(
            "/api/account/import-templates/",
            {
                "templates": [
                    {
                        "subject": "Imported welcome",
                        "body": "Imported body",
                        "footer": "Imported footer",
                        "category": "Imported",
                        "tags": ["portable"],
                    },
                    "skip me",
                ]
            },
            format="json",
        )
        self.assertEqual(import_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(import_response.data), 1)
        self.assertEqual(import_response.data[0]["category"], "Imported")
        self.assertEqual(import_response.data[0]["tags"], ["portable"])
        self.assertIn("Imported body", import_response.data[0]["content"])

    def test_user_can_rename_and_remove_template_category(self):
        EmailTemplate.objects.create(
            owner=self.owner,
            title="Proposal",
            content="Proposal body",
            footer="Best",
            category="Sales",
        )
        EmailTemplate.objects.create(
            owner=self.owner,
            title="Other",
            content="Other body",
            footer="Best",
            category="Sales",
        )
        EmailTemplate.objects.create(
            owner=self.other_user,
            title="Other owner",
            content="Other owner body",
            footer="Best",
            category="Sales",
        )

        self.authenticate("owner")
        rename_response = self.client.post(
            "/api/account/categories/",
            {"action": "rename", "from_category": "Sales", "to_category": "Client Work"},
            format="json",
        )
        self.assertEqual(rename_response.status_code, status.HTTP_200_OK)
        self.assertEqual(rename_response.data["updated"], 2)
        self.assertEqual(EmailTemplate.objects.filter(owner=self.owner, category="Client Work").count(), 2)
        self.assertEqual(EmailTemplate.objects.filter(owner=self.other_user, category="Sales").count(), 1)

        delete_response = self.client.post(
            "/api/account/categories/",
            {"action": "delete", "from_category": "Client Work"},
            format="json",
        )
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(delete_response.data["updated"], 2)
        self.assertEqual(EmailTemplate.objects.filter(owner=self.owner, category="General").count(), 2)

    def test_user_can_clear_archived_templates_without_affecting_active_or_other_users(self):
        active = EmailTemplate.objects.create(
            owner=self.owner,
            title="Active",
            content="Active body",
            footer="Best",
            is_archived=False,
        )
        archived = EmailTemplate.objects.create(
            owner=self.owner,
            title="Archived",
            content="Archived body",
            footer="Best",
            is_archived=True,
        )
        other_archived = EmailTemplate.objects.create(
            owner=self.other_user,
            title="Other archived",
            content="Other archived body",
            footer="Best",
            is_archived=True,
        )

        self.authenticate("owner")
        response = self.client.delete("/api/account/archived-templates/clear/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["deleted"], 1)

        active.refresh_from_db()
        archived.refresh_from_db()
        other_archived.refresh_from_db()
        self.assertIsNone(active.deleted_at)
        self.assertIsNotNone(archived.deleted_at)
        self.assertIsNone(other_archived.deleted_at)

    def test_change_password_rotates_token_and_new_password_works(self):
        login_response = self.authenticate("owner")
        original_token = login_response.data["token"]

        change_response = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "StrongPass123",
                "new_password": "AnotherStrongPass123",
            },
            format="json",
        )

        self.assertEqual(change_response.status_code, status.HTTP_200_OK)
        self.assertIn("token", change_response.data)
        self.assertNotEqual(change_response.data["token"], original_token)

        self.client.credentials()
        old_login_response = self.client.post(
            "/api/auth/login/",
            {"username": "owner", "password": "StrongPass123"},
            format="json",
        )
        self.assertEqual(old_login_response.status_code, status.HTTP_400_BAD_REQUEST)

        new_login_response = self.client.post(
            "/api/auth/login/",
            {"username": "owner", "password": "AnotherStrongPass123"},
            format="json",
        )
        self.assertEqual(new_login_response.status_code, status.HTTP_200_OK)

    def test_verification_status_reports_demo_state(self):
        self.authenticate("owner")
        response = self.client.get("/api/auth/verification/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "owner@example.com")
        self.assertFalse(response.data["email_verified"])
        self.assertEqual(response.data["mode"], "demo")

    @override_settings(PASSWORD_RESET_EMAIL_ENABLED=False)
    def test_password_reset_request_reports_smtp_needed_when_unconfigured(self):
        response = self.client.post(
            "/api/auth/password-reset/",
            {"email": "owner@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(response.data["email_delivery_configured"])
        self.assertIn("SMTP", response.data["detail"])

    @override_settings(
        PASSWORD_RESET_EMAIL_ENABLED=True,
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
        DEFAULT_FROM_EMAIL="reset@example.com",
        FRONTEND_URL="http://localhost:3000",
    )
    def test_password_reset_request_sends_reset_link_and_confirm_changes_password(self):
        response = self.client.post(
            "/api/auth/password-reset/",
            {"email": "owner@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("reset_uid=", mail.outbox[0].body)
        self.assertIn("#reset-password", mail.outbox[0].body)

        uid = urlsafe_base64_encode(force_bytes(self.owner.pk))
        token = default_token_generator.make_token(self.owner)
        confirm_response = self.client.post(
            "/api/auth/password-reset/confirm/",
            {
                "uid": uid,
                "token": token,
                "new_password": "AnotherStrongPass123",
            },
            format="json",
        )

        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.check_password("AnotherStrongPass123"))

    def test_generated_body_cleanup_removes_attachment_placeholders_and_duplicate_paragraphs(self):
        dirty_body = (
            "Subject: Ignore this label\n"
            "[Image: party-photo.jpg]\n\n"
            "Please join us for the event this weekend.\n\n"
            "Please join us for the event this weekend.\n\n"
            "See the attached image."
        )

        cleaned = clean_generated_body(dirty_body)

        self.assertNotIn("[Image:", cleaned)
        self.assertNotIn("Subject:", cleaned)
        self.assertNotIn("attached image", cleaned.lower())
        self.assertEqual(cleaned.count("Please join us for the event this weekend."), 1)

    def test_generated_body_cleanup_removes_setup_and_meta_commentary(self):
        dirty_body = (
            "Brand voice: . Language: English.\n\n"
            "You are invited to the birthday celebration this weekend.\n\n"
            "It also helps the message read more like a real conversation. "
            "I wanted this message to sound clear, natural, and easy to understand. "
            "This version is designed to make it sound human."
        )

        cleaned = clean_generated_body(dirty_body)

        self.assertIn("birthday celebration", cleaned.lower())
        self.assertNotIn("brand voice", cleaned.lower())
        self.assertNotIn("language", cleaned.lower())
        self.assertNotIn("real conversation", cleaned.lower())
        self.assertNotIn("i wanted this message", cleaned.lower())
        self.assertNotIn("this version", cleaned.lower())

    def test_low_quality_body_detects_short_or_attachment_artifacts(self):
        self.assertTrue(is_low_quality_body("Too short."))
        self.assertTrue(is_low_quality_body("Here is your email.\n\n[File: notes.pdf]"))
        self.assertTrue(
            is_low_quality_body(
                "I hope this email finds you well. As per your request, this email is to inform you about the matter."
            )
        )
        self.assertTrue(
            is_low_quality_body(
                "I hope this email finds you well. The event details are ready, and I would like to confirm the timing and next steps with you today."
            )
        )
        self.assertTrue(
            is_low_quality_body(
                "Please join us for the event.\n\nPlease join us for the event.\n\n[Recipient Name] can confirm later."
            )
        )
        self.assertTrue(
            is_low_quality_body(
                "I am writing regarding meeting request. This is a detailed email explaining the purpose clearly. Kindly consider my request and let me know your response."
            )
        )
        self.assertFalse(
            is_low_quality_body(
                "I wanted to share a clear update about the event plans.\n\n"
                "The main details are simple, and I would be glad to confirm the timing once you are available."
            )
        )

    def test_finalize_variations_repairs_weak_ollama_body(self):
        variations = finalize_variations(
            [
                {
                    "subject": "Birthday invitation",
                    "greeting": "",
                    "body": "[Image: birthday.jpg]",
                    "closing": "",
                    "signature": "",
                }
            ],
            source_subject="Birthday invitation",
            tone="Friendly",
        )

        self.assertEqual(len(variations), 1)
        self.assertNotIn("[Image:", variations[0]["body"])
        self.assertGreater(len(variations[0]["body"].split()), 18)
        self.assertTrue(variations[0]["greeting"])
        self.assertTrue(variations[0]["closing"])

    def test_finalize_variations_normalizes_signature_placeholders(self):
        variations = finalize_variations(
            [
                {
                    "subject": "Birthday invitation",
                    "greeting": "Hi there,",
                    "body": "I'm planning the birthday party and would love for you to join us. Let me know if you can make it.",
                    "closing": "Warmly,",
                    "signature": "[Your Contact Information]",
                }
            ],
            source_subject="Birthday invitation",
            tone="Friendly",
        )

        self.assertEqual(variations[0]["signature"], "[Your Name]")

    def test_mock_invitation_does_not_leak_prompt_setup_text(self):
        variations = build_mock_email_variations(
            "Birthday party",
            "Invite the family and friends and relative",
            "Friendly",
            3,
        )
        combined = "\n".join(item["body"] for item in variations).lower()

        self.assertIn("birthday", combined)
        self.assertIn("family", combined)
        self.assertIn("friends", combined)
        self.assertIn("let me know if you can", combined)
        self.assertNotIn("relativess", combined)
        self.assertNotIn("brand voice", combined)
        self.assertNotIn("language:", combined)
        self.assertNotIn("i wanted this message", combined)
        self.assertNotIn("real conversation", combined)
        self.assertNotIn("the message below", combined)
        self.assertNotIn("please let me know if you will be able", combined)

    def test_mock_generation_respects_requested_count_up_to_four(self):
        self.assertEqual(
            len(build_mock_email_variations("Quick update", "Share one short update", "Direct", 1)),
            1,
        )
        self.assertEqual(
            len(build_mock_email_variations("Quick update", "Share one short update", "Direct", 4)),
            4,
        )
