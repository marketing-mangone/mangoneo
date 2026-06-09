from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('grillas', '0002_add_uscis_tema'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── GridPost: approval fields ────────────────────────────────────────
        migrations.AddField(
            model_name='gridpost',
            name='approved',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='approved_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='approved_posts',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='gridpost',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),

        # ── GridPostComment ──────────────────────────────────────────────────
        migrations.CreateModel(
            name='GridPostComment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('author_name', models.CharField(blank=True, max_length=100)),
                ('text', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='comments',
                    to='grillas.gridpost',
                )),
            ],
            options={'ordering': ['created_at']},
        ),

        # ── GridPostVersion ──────────────────────────────────────────────────
        migrations.CreateModel(
            name='GridPostVersion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('caption', models.TextField()),
                ('changed_by_name', models.CharField(blank=True, max_length=100)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('post', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='versions',
                    to='grillas.gridpost',
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
