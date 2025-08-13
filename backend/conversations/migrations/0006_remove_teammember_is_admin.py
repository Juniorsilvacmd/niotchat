from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('conversations', '0005_add_role_to_teammember'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='teammember',
            name='is_admin',
        ),
    ] 