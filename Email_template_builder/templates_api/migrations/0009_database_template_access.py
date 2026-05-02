import json

from django.db import migrations, models


DATABASE_TEMPLATE_SEEDS = [
    {
        "title": "Friendly Birthday Invitation",
        "category": "Events",
        "tags": ["birthday", "invitation", "friendly"],
        "access_tier": "free",
        "payload": {
            "subject": "You Are Invited to Celebrate",
            "greeting": "Hey [Name],",
            "body": "I am celebrating my birthday soon and would love for you to be there. It will be a relaxed gathering with food, music, and good company.\n\nYour presence would make the day feel even more special, so let me know if you can join us.",
            "closing": "Hope to see you there,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Professional Meeting Request",
        "category": "Business",
        "tags": ["meeting", "professional", "request"],
        "access_tier": "free",
        "payload": {
            "subject": "Request to Schedule a Meeting",
            "greeting": "Hello [Name],",
            "body": "I would like to schedule a meeting to discuss [topic] and align on the next steps.\n\nPlease let me know a time that works well for you this week, and I will be happy to coordinate around your availability.",
            "closing": "Best regards,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Internship Application Email",
        "category": "Career",
        "tags": ["internship", "application", "career"],
        "access_tier": "free",
        "payload": {
            "subject": "Application for Internship Opportunity",
            "greeting": "Dear [Hiring Manager],",
            "body": "I am writing to express my interest in the internship opportunity at [Company Name]. I am eager to contribute, learn from your team, and apply my skills in a practical environment.\n\nI would appreciate the opportunity to be considered and would be happy to share any additional details or documents required.",
            "closing": "Sincerely,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Simple Thank You Email",
        "category": "Personal",
        "tags": ["thank you", "appreciation", "simple"],
        "access_tier": "free",
        "payload": {
            "subject": "Thank You",
            "greeting": "Hi [Name],",
            "body": "Thank you for your time and support. I truly appreciate the help and thoughtfulness you shared.\n\nIt meant a lot to me, and I wanted to send a quick note to say thanks.",
            "closing": "Warmly,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Premium Sales Outreach",
        "category": "Sales",
        "tags": ["sales", "outreach", "premium"],
        "access_tier": "premium",
        "payload": {
            "subject": "A Better Way to Simplify Your Workflow",
            "greeting": "Hello [Name],",
            "body": "I noticed that teams like yours often spend too much time moving between tools and repeating manual steps. Our platform helps bring those workflows into one focused place.\n\nIf improving speed and visibility is a priority this quarter, I would be glad to show you a short demo tailored to your team.",
            "closing": "Best,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Premium Product Launch Email",
        "category": "Marketing",
        "tags": ["launch", "marketing", "premium"],
        "access_tier": "premium",
        "payload": {
            "subject": "Introducing [Product Name]",
            "greeting": "Hi [Name],",
            "body": "We are excited to introduce [Product Name], built to help [audience] solve [problem] with less friction and more confidence.\n\nThe launch includes [key benefit], [key feature], and a smoother way to get started. Take a look and see how it can fit your workflow.",
            "closing": "Cheers,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Premium Customer Apology",
        "category": "Support",
        "tags": ["support", "apology", "premium"],
        "access_tier": "premium",
        "payload": {
            "subject": "We Are Sorry for the Issue",
            "greeting": "Hi [Customer Name],",
            "body": "I am sorry for the trouble you experienced. I understand how frustrating this must have been, and I appreciate your patience while we review what happened.\n\nOur team is already working on the next step, and I will keep you updated until this is fully resolved.",
            "closing": "Warm regards,",
            "signature": "[Your Name]",
        },
    },
    {
        "title": "Premium Event Reminder",
        "category": "Events",
        "tags": ["event", "reminder", "premium"],
        "access_tier": "premium",
        "payload": {
            "subject": "Reminder: [Event Name] Is Coming Up",
            "greeting": "Hello [Name],",
            "body": "This is a quick reminder that [Event Name] is coming up on [date]. We are looking forward to having you with us.\n\nPlease review the details before the event, and feel free to reply if you need any help before then.",
            "closing": "See you soon,",
            "signature": "[Your Name]",
        },
    },
]


def seed_database_templates(apps, schema_editor):
    EmailTemplate = apps.get_model("templates_api", "EmailTemplate")
    for seed in DATABASE_TEMPLATE_SEEDS:
        payload = seed["payload"]
        EmailTemplate.objects.get_or_create(
            owner=None,
            title=seed["title"],
            is_database_template=True,
            defaults={
                "content": json.dumps(payload),
                "footer": payload["closing"],
                "category": seed["category"],
                "tags": seed["tags"],
                "is_archived": False,
                "access_tier": seed["access_tier"],
            },
        )


def remove_seeded_database_templates(apps, schema_editor):
    EmailTemplate = apps.get_model("templates_api", "EmailTemplate")
    seed_titles = [seed["title"] for seed in DATABASE_TEMPLATE_SEEDS]
    EmailTemplate.objects.filter(owner=None, is_database_template=True, title__in=seed_titles).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("templates_api", "0008_emailtemplate_deleted_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="emailtemplate",
            name="access_tier",
            field=models.CharField(
                choices=[("free", "Free"), ("premium", "Premium")],
                default="free",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="emailtemplate",
            name="is_database_template",
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(seed_database_templates, remove_seeded_database_templates),
    ]
