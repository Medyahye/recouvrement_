from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("clients", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE clients_client DROP COLUMN IF EXISTS arriere;',
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
