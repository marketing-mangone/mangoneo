from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('metrics', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='metricdefinition',
            name='source',
            field=models.CharField(
                choices=[
                    ('hubspot', 'HubSpot'),
                    ('google_analytics', 'GA4'),
                    ('meta', 'Meta'),
                    ('google_ads', 'Google Ads'),
                    ('youtube', 'YouTube'),
                    ('manual', 'Manual'),
                ],
                default='manual',
                max_length=50,
            ),
        ),
    ]
