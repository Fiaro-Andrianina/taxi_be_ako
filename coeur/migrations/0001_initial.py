from django.db import migrations


def drop_contenttype_name(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        table_names = [row[0] for row in connection.introspection.get_table_list(cursor)]
        if "django_content_type" not in table_names:
            return

        description = connection.introspection.get_table_description(cursor, "django_content_type")
        if any(column[0] == "name" for column in description):
            cursor.execute("ALTER TABLE `django_content_type` DROP COLUMN `name`")


def add_contenttype_name(apps, schema_editor):
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        table_names = [row[0] for row in connection.introspection.get_table_list(cursor)]
        if "django_content_type" not in table_names:
            return

        description = connection.introspection.get_table_description(cursor, "django_content_type")
        if not any(column[0] == "name" for column in description):
            cursor.execute(
                "ALTER TABLE `django_content_type` ADD COLUMN `name` varchar(100) NOT NULL DEFAULT ''"
            )


class Migration(migrations.Migration):

    dependencies = [
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(drop_contenttype_name, add_contenttype_name),
    ]
