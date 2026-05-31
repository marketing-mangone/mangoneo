from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks_app', '0002_calendarevent'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='start_date',
            field=models.DateField(
                blank=True,
                null=True,
                help_text='Fecha de inicio de la tarea',
            ),
        ),
    ]
