"""
Automatizaciones del CRM de Ventas:
- Asignación balanceada (round-robin por carga) de leads nuevos sin responsable.
- Tarea de seguimiento automática al cambiar de etapa.
- (La alerta de SLA de leads sin contactar vive en notifications/tasks.py)
"""
from datetime import timedelta
from django.utils import timezone


def eligible_assignee_ids():
    """User ids elegibles para recibir leads: perfiles activos con rol admin o team."""
    from accounts.models import UserProfile
    return list(
        UserProfile.objects.filter(status='active', role__in=['admin', 'team'])
        .values_list('user_id', flat=True)
    )


def pick_assignee():
    """
    Devuelve el user_id del responsable elegible con MENOS leads abiertos
    (asignación balanceada). None si no hay elegibles.
    """
    from django.db.models import Count
    from .models import Lead

    ids = eligible_assignee_ids()
    if not ids:
        return None
    counts = {uid: 0 for uid in ids}
    rows = (Lead.objects.filter(assigned_to_id__in=ids)
            .exclude(stage__in=['ganado', 'perdido'])
            .values('assigned_to_id').annotate(n=Count('id')))
    for r in rows:
        counts[r['assigned_to_id']] = r['n']
    # menos cargado; desempate por id menor para estabilidad
    return min(ids, key=lambda uid: (counts.get(uid, 0), uid))


def auto_followup_on_stage(lead, actor):
    """
    Crea una tarea de seguimiento (a 2 días) al mover el lead a una etapa no terminal,
    y actualiza next_followup. Notifica al responsable si es otra persona.
    """
    if lead.stage in ('ganado', 'perdido'):
        return
    from .models import LeadTask

    due = timezone.now() + timedelta(days=2)
    assignee = lead.assigned_to or lead.created_by

    LeadTask.objects.create(
        lead=lead,
        title=f'Dar seguimiento — {lead.get_stage_display()}',
        task_type='seguimiento',
        due_date=due,
        status='pendiente',
        assigned_to=assignee,
        created_by=actor,
    )
    lead.next_followup = due.date()
    lead.save(update_fields=['next_followup', 'updated_at'])

    if assignee and actor and assignee != actor:
        from notifications.services import notify
        notify(
            assignee, 'task_assigned',
            title='Tarea de seguimiento creada',
            message=f'{lead.name} · {lead.get_stage_display()}',
            link=f'/ventas/leads/{lead.id}',
            dedup_key=f'autotask-{lead.id}-{lead.stage}-{due.date().isoformat()}',
        )
