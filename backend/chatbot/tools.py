"""
Herramientas (function calling) que el asistente puede invocar para consultar
datos en vivo del Hub según la pregunta del usuario.

Cada herramienta:
- Tiene una especificación JSON (TOOL_SPECS) que se envía a Groq.
- Se ejecuta en run_tool(name, args, user) y devuelve datos JSON-serializables.
Todas son de SOLO LECTURA.
"""
import re
import logging
from datetime import date
from django.utils import timezone

logger = logging.getLogger(__name__)

MONTHS_ES = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'setiembre': 9, 'octubre': 10,
    'noviembre': 11, 'diciembre': 12,
}

# ── Especificaciones para Groq (formato OpenAI tools) ───────────────────────────
TOOL_SPECS = [
    {
        'type': 'function',
        'function': {
            'name': 'get_calendar_events',
            'description': (
                'Consulta los eventos/efemérides del calendario de marketing para un mes. '
                'Úsala cuando pregunten por el calendario, efemérides, publicaciones programadas, '
                'campañas o eventos de un mes específico.'
            ),
            'parameters': {
                'type': 'object',
                'properties': {
                    'month': {
                        'type': 'string',
                        'description': "Mes a consultar: 'YYYY-MM' (ej. '2026-07') o nombre ('julio', 'julio 2026').",
                    },
                    'type': {
                        'type': 'string',
                        'enum': ['content', 'meeting', 'deadline', 'campaign', 'event'],
                        'description': 'Filtro opcional por tipo de evento.',
                    },
                },
                'required': ['month'],
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_leads',
            'description': (
                'Consulta leads del CRM de ventas. Úsala para preguntas sobre prospectos: '
                'cuántos hay, en qué etapa, por fuente o tipo de caso, o los del propio usuario.'
            ),
            'parameters': {
                'type': 'object',
                'properties': {
                    'stage': {'type': 'string', 'description': "Etapa: nuevo, contactado, calificado, consulta, contrato, ganado, perdido."},
                    'source': {'type': 'string', 'description': "Fuente, ej. meta_ads, google_ads, organico, golden_tickets."},
                    'mine': {'type': 'boolean', 'description': 'Si true, solo los leads asignados al usuario que pregunta.'},
                    'search': {'type': 'string', 'description': 'Texto a buscar en nombre/email/campaña.'},
                },
            },
        },
    },
    {
        'type': 'function',
        'function': {
            'name': 'get_tasks',
            'description': 'Consulta tareas (del CRM y del tablero del equipo). Úsala para preguntas sobre pendientes, vencimientos o tareas de alguien.',
            'parameters': {
                'type': 'object',
                'properties': {
                    'mine': {'type': 'boolean', 'description': 'Si true, solo tareas asignadas al usuario que pregunta.'},
                    'status': {'type': 'string', 'description': "pendiente | completada (CRM) o pending/in_progress/done (equipo)."},
                    'due': {'type': 'string', 'enum': ['today', 'overdue', 'upcoming'], 'description': 'Filtro por vencimiento.'},
                },
            },
        },
    },
]


def _resolve_month(s, default_year):
    s = (s or '').strip().lower()
    m = re.match(r'(\d{4})-(\d{1,2})', s)
    if m:
        return int(m.group(1)), int(m.group(2))
    year = default_year
    ym = re.search(r'(\d{4})', s)
    if ym:
        year = int(ym.group(1))
    for name, num in MONTHS_ES.items():
        if name in s:
            return year, num
    if s.isdigit() and 1 <= int(s) <= 12:
        return default_year, int(s)
    return None


# ── Implementaciones ────────────────────────────────────────────────────────────
def _get_calendar_events(args, user):
    from tasks_app.models import CalendarEvent
    resolved = _resolve_month(args.get('month', ''), timezone.now().year)
    if not resolved:
        return {'error': "No entendí el mes. Usa 'YYYY-MM' o el nombre del mes."}
    year, month = resolved
    qs = CalendarEvent.objects.filter(date__year=year, date__month=month)
    if args.get('type'):
        qs = qs.filter(type=args['type'])
    qs = qs.order_by('date', 'time')[:80]
    events = [{
        'date': e.date.isoformat(),
        'title': e.title,
        'type': e.get_type_display(),
        'channel': e.get_channel_display() if e.channel else None,
        'status': e.get_status_display(),
    } for e in qs]
    return {'month': f'{year}-{month:02d}', 'count': len(events), 'events': events}


def _get_leads(args, user):
    from ventas.models import Lead
    qs = Lead.objects.all()
    if args.get('mine'):
        qs = qs.filter(assigned_to=user)
    if args.get('stage'):
        qs = qs.filter(stage=args['stage'])
    if args.get('source'):
        qs = qs.filter(source=args['source'])
    if args.get('search'):
        from django.db.models import Q
        s = args['search']
        qs = qs.filter(Q(name__icontains=s) | Q(email__icontains=s) | Q(campaign__icontains=s))
    total = qs.count()
    rows = [{
        'name': l.name,
        'stage': l.get_stage_display(),
        'source': l.get_source_display(),
        'practice_area': l.get_practice_area_display(),
        'estimated_value': float(l.estimated_value) if l.estimated_value else None,
        'next_followup': l.next_followup.isoformat() if l.next_followup else None,
        'assigned_to': (l.assigned_to.get_full_name() or l.assigned_to.username) if l.assigned_to else None,
    } for l in qs.select_related('assigned_to').order_by('-created_at')[:40]]
    return {'count': total, 'showing': len(rows), 'leads': rows}


def _get_tasks(args, user):
    from ventas.models import LeadTask
    now = timezone.now()
    today = now.date()
    qs = LeadTask.objects.select_related('lead', 'assigned_to')
    if args.get('mine'):
        qs = qs.filter(assigned_to=user)
    status = args.get('status')
    if status in ('pendiente', 'completada'):
        qs = qs.filter(status=status)
    due = args.get('due')
    if due == 'today':
        qs = qs.filter(due_date__date=today)
    elif due == 'overdue':
        qs = qs.filter(status='pendiente', due_date__lt=now)
    elif due == 'upcoming':
        qs = qs.filter(status='pendiente', due_date__gte=now)
    total = qs.count()
    rows = [{
        'title': t.title,
        'lead': t.lead.name,
        'status': t.get_status_display(),
        'due_date': t.due_date.isoformat() if t.due_date else None,
        'assigned_to': (t.assigned_to.get_full_name() or t.assigned_to.username) if t.assigned_to else None,
    } for t in qs.order_by('due_date')[:40]]
    return {'count': total, 'showing': len(rows), 'tasks': rows}


_DISPATCH = {
    'get_calendar_events': _get_calendar_events,
    'get_leads': _get_leads,
    'get_tasks': _get_tasks,
}


def run_tool(name, args, user):
    fn = _DISPATCH.get(name)
    if not fn:
        return {'error': f'Herramienta desconocida: {name}'}
    try:
        return fn(args or {}, user)
    except Exception as e:  # noqa: BLE001
        logger.exception('Error ejecutando tool %s', name)
        return {'error': f'No se pudo consultar: {e}'}
