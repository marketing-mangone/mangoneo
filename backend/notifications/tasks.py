"""
Generación periódica de recordatorios del CRM.
Corre vía Celery beat (ver setup_periodic_tasks). Idempotente por día gracias al dedup_key.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def generate_crm_reminders():
    """Crea notificaciones para tareas vencidas/por vencer hoy y seguimientos vencidos."""
    from ventas.models import LeadTask, Lead
    from .services import notify

    now = timezone.now()
    today = now.date()
    today_str = today.isoformat()
    created = 0

    # ── Tareas pendientes vencidas o que vencen hoy ──
    pending = LeadTask.objects.filter(
        status='pendiente', due_date__isnull=False, due_date__date__lte=today,
        assigned_to__isnull=False,
    ).select_related('lead', 'assigned_to')
    for task in pending:
        overdue = task.due_date < now
        n = notify(
            task.assigned_to, 'task_due',
            title='Tarea vencida' if overdue else 'Tarea para hoy',
            message=f'{task.title} · {task.lead.name}',
            link=f'/ventas/leads/{task.lead_id}',
            dedup_key=f'task-due-{task.id}-{today_str}',
        )
        if n:
            created += 1

    # ── Seguimientos de leads vencidos (pipeline abierto) ──
    leads = Lead.objects.filter(
        next_followup__lt=today, assigned_to__isnull=False,
    ).exclude(stage__in=['ganado', 'perdido']).select_related('assigned_to')
    for lead in leads:
        n = notify(
            lead.assigned_to, 'followup_overdue',
            title='Seguimiento vencido',
            message=f'{lead.name} — seguimiento pendiente desde {lead.next_followup.isoformat()}',
            link=f'/ventas/leads/{lead.id}',
            dedup_key=f'followup-{lead.id}-{today_str}',
        )
        if n:
            created += 1

    logger.info('generate_crm_reminders: %s notificaciones creadas', created)
    return created
