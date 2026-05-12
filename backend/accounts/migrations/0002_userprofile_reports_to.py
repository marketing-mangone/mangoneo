from django.db import migrations, models
import django.db.models.deletion


def set_default_hierarchy(apps, schema_editor):
    """Put all 'team' role profiles under the first admin."""
    UserProfile = apps.get_model('accounts', 'UserProfile')
    admin = UserProfile.objects.filter(role='admin').first()
    if admin:
        UserProfile.objects.filter(role='team').update(reports_to=admin)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='reports_to',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='direct_reports',
                to='accounts.userprofile',
            ),
        ),
        migrations.RunPython(set_default_hierarchy, migrations.RunPython.noop),
    ]
