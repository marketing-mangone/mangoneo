from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grillas', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='contentgrid',
            name='tema',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('vawa', 'VAWA'),
                    ('visa_t', 'Visa T'),
                    ('visa_u', 'Visa U'),
                    ('visa_t_laboral', 'Visa T – Laboral'),
                    ('visa_t_trafico', 'Visa T – Tráfico'),
                    ('sijs', 'SIJS'),
                    ('ajuste_estatus', 'Ajuste de Estatus'),
                    ('proceso_consular', 'Proceso Consular'),
                    ('uscis', 'USCIS – Noticias'),
                ],
            ),
        ),
    ]
