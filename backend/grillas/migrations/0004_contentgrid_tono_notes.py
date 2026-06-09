from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grillas', '0003_approval_comments_versions'),
    ]

    operations = [
        migrations.AddField(
            model_name='contentgrid',
            name='tono',
            field=models.CharField(
                blank=True,
                choices=[
                    ('educativo',  'Educativo'),
                    ('emotivo',    'Emotivo'),
                    ('urgente',    'Urgente'),
                    ('inspirador', 'Inspirador'),
                ],
                default='educativo',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='contentgrid',
            name='notes',
            field=models.TextField(blank=True, help_text='Contexto adicional para la IA'),
        ),
    ]
