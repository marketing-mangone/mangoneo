"""
Snapshot de datos en vivo del usuario que pregunta.
Se limita SIEMPRE a lo que es del propio usuario (leads/tareas asignadas, sus
notificaciones), de modo que el bot nunca expone datos fuera de su alcance.
Cada bloque es defensivo: si una consulta falla, se omite sin romper el chat.
"""
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def build_user_snapshot(user) -> str:
    if not user or not user.is_authenticated:
        return ''

    today = timezone.now().date()
    now = timezone.now()
    lines = []

    # ── Leads asignados al usuario ──
    try:
        from ventas.models import Lead
        mine = Lead.objects.filter(assigned_to=user)
        open_count = mine.exclude(stage__in=['ganado', 'perdido']).count()
        won_month = mine.filter(stage='ganado', won_at__year=now.year, won_at__month=now.month).count()
        overdue_fu = mine.exclude(stage__in=['ganado', 'perdido']).filter(next_followup__lt=today).count()
        if mine.exists():
            lines.append(
                f"- Leads asignados a ti: {open_count} abiertos, {won_month} ganados este mes, "
                f"{overdue_fu} con seguimiento vencido."
            )
    except Exception as e:  # noqa: BLE001
        logger.debug('snapshot leads falló: %s', e)

    # ── Tareas de CRM asignadas al usuario ──
    try:
        from ventas.models import LeadTask
        pend = LeadTask.objects.filter(assigned_to=user, status='pendiente')
        due_today = pend.filter(due_date__date=today).count()
        overdue = pend.filter(due_date__lt=now).count()
        total_pend = pend.count()
        if total_pend:
            lines.append(
                f"- Tus tareas de CRM: {total_pend} pendientes ({due_today} para hoy, {overdue} vencidas)."
            )
    except Exception as e:  # noqa: BLE001
        logger.debug('snapshot lead-tasks falló: %s', e)

    # ── Tareas del tablero del equipo asignadas al usuario ──
    try:
        from tasks_app.models import Task
        team_pend = Task.objects.filter(assignee=user).exclude(status='done').count()
        if team_pend:
            lines.append(f"- Tus tareas del tablero del equipo (no completadas): {team_pend}.")
    except Exception as e:  # noqa: BLE001
        logger.debug('snapshot team-tasks falló: %s', e)

    # ── Notificaciones sin leer ──
    try:
        from notifications.models import Notification
        unread = Notification.objects.filter(recipient=user, read=False).count()
        if unread:
            lines.append(f"- Notificaciones sin leer: {unread}.")
    except Exception as e:  # noqa: BLE001
        logger.debug('snapshot notifs falló: %s', e)

    if not lines:
        return ''

    name = user.get_full_name() or user.username
    header = f"DATOS EN VIVO DE {name} (hoy es {today.isoformat()}):"
    return header + "\n" + "\n".join(lines)
