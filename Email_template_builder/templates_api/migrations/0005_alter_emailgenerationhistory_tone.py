from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("templates_api", "0004_remove_emailgenerationhistory_attachment_info"),
    ]

    operations = [
        migrations.AlterField(
            model_name="emailgenerationhistory",
            name="tone",
            field=models.CharField(max_length=255),
        ),
    ]
