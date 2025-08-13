from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('conversations', '0004_auto_20250717_2216'),
    ]

    operations = [
        migrations.AddField(
            model_name='teammember',
            name='role',
            field=models.CharField(max_length=20, default='member'),
            preserve_default=False,
        ),
    ] 