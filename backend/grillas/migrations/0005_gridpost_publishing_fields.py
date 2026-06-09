from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grillas', '0004_contentgrid_tono_notes'),
    ]

    operations = [
        migrations.AddField(
            model_name='gridpost',
            name='publish_status',
            field=models.CharField(
                blank=True,
                choices=[
                    ('scheduled', 'Programado'),
                    ('published', 'Publicado'),
                    ('failed',    'Error'),
                    ('cancelled', 'Cancelado'),
                ],
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='platforms',
            field=models.JSONField(blank=True, default=list, help_text='Plataformas seleccionadas'),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='scheduled_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='published_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='ayrshare_post_id',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='publish_error',
            field=models.TextField(blank=True),
        ),
    ]
