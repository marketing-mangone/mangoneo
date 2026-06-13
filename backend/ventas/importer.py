"""
Importación de leads desde CSV para el CRM de Ventas.

Diseñado para ser tolerante con exports de Excel/Google Sheets:
- Detecta el delimitador (',' o ';') y maneja BOM (utf-8-sig).
- Encabezados flexibles: acepta nombres en español o inglés (ver HEADER_ALIASES).
- Campos de opción (source, practice_area, stage, priority, language) aceptan
  tanto la clave interna ('meta_ads') como la etiqueta visible ('Meta Ads'),
  sin distinguir mayúsculas/acentos.
- Solo 'name' es obligatorio. Lo demás usa el valor por defecto del modelo.
"""
import csv
import io
import unicodedata
from datetime import datetime
from decimal import Decimal, InvalidOperation

from .models import (
    Lead, SOURCE_CHOICES, PRACTICE_AREA_CHOICES,
    STAGE_CHOICES, PRIORITY_CHOICES, LANGUAGE_CHOICES,
)

MAX_ROWS = 5000

# Encabezado del CSV → campo del modelo
HEADER_ALIASES = {
    'name': 'name', 'nombre': 'name', 'full name': 'name', 'cliente': 'name',
    'email': 'email', 'correo': 'email', 'e-mail': 'email', 'mail': 'email',
    'phone': 'phone', 'telefono': 'phone', 'tel': 'phone', 'celular': 'phone', 'movil': 'phone', 'whatsapp': 'phone',
    'language': 'language', 'idioma': 'language', 'lang': 'language',
    'location': 'location', 'ubicacion': 'location', 'ciudad': 'location', 'estado': 'location', 'city': 'location',
    'source': 'source', 'fuente': 'source', 'origen': 'source',
    'campaign': 'campaign', 'campana': 'campaign', 'campaña': 'campaign', 'anuncio': 'campaign',
    'practice_area': 'practice_area', 'practice area': 'practice_area', 'area': 'practice_area',
    'area de practica': 'practice_area', 'tipo de caso': 'practice_area', 'caso': 'practice_area', 'case': 'practice_area',
    'stage': 'stage', 'etapa': 'stage', 'estado del lead': 'stage',
    'priority': 'priority', 'prioridad': 'priority',
    'estimated_value': 'estimated_value', 'estimated value': 'estimated_value',
    'valor': 'estimated_value', 'valor estimado': 'estimated_value', 'value': 'estimated_value',
    'next_followup': 'next_followup', 'next followup': 'next_followup',
    'seguimiento': 'next_followup', 'proximo seguimiento': 'next_followup', 'followup': 'next_followup',
    'notes': 'notes', 'notas': 'notes', 'observaciones': 'notes', 'comentarios': 'notes',
}

# Sinónimos extra para campos de opción (además de clave + etiqueta oficial)
SOURCE_ALIASES = {
    'web': 'website', 'sitio web': 'website', 'pagina web': 'website',
    'facebook': 'meta_ads', 'instagram': 'meta_ads', 'meta': 'meta_ads', 'fb': 'meta_ads', 'ig': 'meta_ads',
    'google': 'google_ads', 'adwords': 'google_ads',
    'organico': 'organico', 'seo': 'organico',
    'referido': 'golden_tickets', 'referral': 'golden_tickets', 'golden ticket': 'golden_tickets',
    'tiktok': 'redes_sociales', 'youtube': 'redes_sociales', 'redes': 'redes_sociales',
}
LANGUAGE_ALIASES = {
    'espanol': 'es', 'spanish': 'es', 'es': 'es',
    'ingles': 'en', 'english': 'en', 'en': 'en',
}


def _norm(text: str) -> str:
    """Minúsculas, sin acentos ni espacios sobrantes."""
    text = (text or '').strip().lower()
    return ''.join(c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c))


def _build_choice_map(choices, extra=None):
    """{ normalizado(clave|etiqueta|alias): clave }"""
    m = {}
    for key, label in choices:
        m[_norm(key)] = key
        m[_norm(label)] = key
    for alias, key in (extra or {}).items():
        m[_norm(alias)] = key
    return m


_SOURCE_MAP = _build_choice_map(SOURCE_CHOICES, SOURCE_ALIASES)
_AREA_MAP = _build_choice_map(PRACTICE_AREA_CHOICES)
_STAGE_MAP = _build_choice_map(STAGE_CHOICES)
_PRIORITY_MAP = _build_choice_map(PRIORITY_CHOICES)
_LANGUAGE_MAP = _build_choice_map(LANGUAGE_CHOICES, LANGUAGE_ALIASES)


def _decode(raw_bytes_or_str) -> str:
    if isinstance(raw_bytes_or_str, str):
        return raw_bytes_or_str
    for enc in ('utf-8-sig', 'utf-8', 'latin-1'):
        try:
            return raw_bytes_or_str.decode(enc)
        except (UnicodeDecodeError, AttributeError):
            continue
    return raw_bytes_or_str.decode('utf-8', errors='replace')


def _sniff_reader(text: str):
    sample = text[:2048]
    delimiter = ','
    try:
        delimiter = csv.Sniffer().sniff(sample, delimiters=',;\t').delimiter
    except csv.Error:
        if sample.count(';') > sample.count(','):
            delimiter = ';'
    return csv.reader(io.StringIO(text), delimiter=delimiter)


def parse_and_import(raw, user, *, skip_duplicates=True):
    """
    Importa leads desde el contenido CSV (bytes o str).
    Devuelve un dict con el resumen: created, skipped, errors[], total_rows.
    """
    text = _decode(raw)
    reader = _sniff_reader(text)

    rows = list(reader)
    if not rows:
        return {'created': 0, 'skipped': 0, 'errors': [], 'total_rows': 0,
                'message': 'El archivo está vacío.'}

    # Mapear encabezados a campos del modelo
    header = rows[0]
    col_map = {}  # índice de columna → campo
    for idx, col in enumerate(header):
        field = HEADER_ALIASES.get(_norm(col))
        if field:
            col_map[idx] = field

    if 'name' not in col_map.values():
        return {'created': 0, 'skipped': 0, 'total_rows': len(rows) - 1,
                'errors': [{'row': 1, 'message': "Falta la columna obligatoria 'name' (o 'nombre')."}]}

    data_rows = rows[1:]
    if len(data_rows) > MAX_ROWS:
        return {'created': 0, 'skipped': 0, 'total_rows': len(data_rows),
                'errors': [{'row': 0, 'message': f'Demasiadas filas ({len(data_rows)}). Máximo {MAX_ROWS} por importación.'}]}

    created, skipped, errors = 0, 0, []
    seen_emails = set()

    for i, row in enumerate(data_rows, start=2):  # fila 1 = encabezado
        if not any(cell.strip() for cell in row):
            continue  # fila vacía

        record = {}
        for idx, field in col_map.items():
            record[field] = row[idx].strip() if idx < len(row) else ''

        name = record.get('name', '').strip()
        if not name:
            errors.append({'row': i, 'message': 'Sin nombre — fila omitida.'})
            continue

        email = record.get('email', '').strip()
        if skip_duplicates and email:
            key = email.lower()
            if key in seen_emails or Lead.objects.filter(email__iexact=email).exists():
                skipped += 1
                continue
            seen_emails.add(key)

        lead = Lead(name=name, email=email, created_by=user)
        lead.phone = record.get('phone', '')
        lead.location = record.get('location', '')
        lead.campaign = record.get('campaign', '')
        lead.notes = record.get('notes', '')

        if record.get('source'):
            lead.source = _SOURCE_MAP.get(_norm(record['source']), 'otro')
        if record.get('practice_area'):
            lead.practice_area = _AREA_MAP.get(_norm(record['practice_area']), 'general')
        if record.get('stage'):
            lead.stage = _STAGE_MAP.get(_norm(record['stage']), 'nuevo')
        if record.get('priority'):
            lead.priority = _PRIORITY_MAP.get(_norm(record['priority']), 'media')
        if record.get('language'):
            lead.language = _LANGUAGE_MAP.get(_norm(record['language']), 'es')

        raw_value = record.get('estimated_value', '')
        if raw_value:
            cleaned = raw_value.replace('$', '').replace(',', '').replace(' ', '')
            try:
                lead.estimated_value = Decimal(cleaned)
            except (InvalidOperation, ValueError):
                errors.append({'row': i, 'message': f"Valor estimado inválido '{raw_value}' — ignorado."})

        raw_date = record.get('next_followup', '')
        if raw_date:
            parsed = None
            for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y'):
                try:
                    parsed = datetime.strptime(raw_date, fmt).date()
                    break
                except ValueError:
                    continue
            if parsed:
                lead.next_followup = parsed
            else:
                errors.append({'row': i, 'message': f"Fecha inválida '{raw_date}' — usa AAAA-MM-DD."})

        try:
            lead.full_clean(exclude=['created_by', 'assigned_to'])
            lead.save()
            created += 1
        except Exception as e:  # noqa: BLE001 — reportar fila sin abortar todo
            errors.append({'row': i, 'message': f'Error al guardar: {e}'})

    return {
        'created': created,
        'skipped': skipped,
        'errors': errors,
        'total_rows': len(data_rows),
    }
