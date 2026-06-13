"""Construcción del prompt y llamada a Groq para el asistente del Hub."""
import json
import logging
from django.conf import settings

from .knowledge import FIRM_KNOWLEDGE, HUB_NAVIGATION
from .snapshot import build_user_snapshot
from .tools import TOOL_SPECS, run_tool

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"
MAX_HISTORY = 10   # mensajes de historial que se envían
MAX_TOOL_ROUNDS = 4  # iteraciones máximas de tool-calling

RULES = """
Eres el **Asistente del Hub de Mangone** (tu ícono es un mango 🥭), un asistente interno
para el equipo de marketing de Mangone Law Firm LLC.

QUÉ HACES:
- Explicas cómo funciona el Marketing Hub y dónde encontrar cada cosa.
- Respondes preguntas generales sobre la firma (servicios, datos de contacto, áreas de práctica).
- Usas los DATOS EN VIVO del usuario (si se proveen) para responder sobre sus leads y tareas.

REGLAS OBLIGATORIAS (cumplimiento legal y de marca — NO las rompas nunca):
- Responde SIEMPRE en español, con tono cálido, claro y breve.
- A la fundadora refiérete SIEMPRE como "La Abogada Auguy" o "La Abogada Auguy Mangone".
- NUNCA uses las palabras: "especialistas", "experta", "garantizamos", "100% de éxito",
  "protección contra la deportación", "arregla sin salir", ni afirmes haber servido a "miles de familias".
- En lugar de "especialistas" di "nos enfocamos en visas humanitarias y reunificación familiar".
- NUNCA des asesoría legal específica, determines elegibilidad ni prometas resultados.
  Para casos concretos, invita a agendar una consulta: (862) 701-2097 o @Mangonelawfirm.
- NO inventes datos (precios, tiempos, requisitos, funciones del Hub) que no estén aquí.
  Si no sabes algo del Hub, dilo con honestidad y sugiere contactar a Sebas (Director de Marketing).

CÓMO RESPONDES:
- Si preguntan dónde hacer algo en el Hub, da la ruta concreta (ej. "Ve a Ventas → Importar").
- Para preguntas sobre el CALENDARIO o EFEMÉRIDES de un mes, LEADS o TAREAS, usa las
  HERRAMIENTAS disponibles para consultar los datos reales antes de responder. No inventes.
- Si una herramienta no devuelve resultados, dilo con claridad (ej. "No hay eventos en julio").
- Resume los datos de forma útil; no vuelques listas enormes innecesariamente.
- Sé conciso: 1-4 frases salvo que pidan detalle o una lista.
"""


def build_system_prompt(user) -> str:
    parts = [RULES, FIRM_KNOWLEDGE, HUB_NAVIGATION]
    snapshot = build_user_snapshot(user)
    if snapshot:
        parts.append("## DATOS EN VIVO DEL USUARIO\n" + snapshot)
    return "\n\n".join(parts)


def chat(user, messages: list[dict]) -> str:
    """
    messages: lista [{role: 'user'|'assistant', content: str}, ...] (orden cronológico).
    Devuelve el texto de respuesta del asistente.
    """
    if not getattr(settings, 'GROQ_API_KEY', ''):
        return ('El asistente no está configurado todavía (falta GROQ_API_KEY). '
                'Mientras tanto, contacta a Sebas para lo que necesites.')

    from groq import Groq
    client = Groq(api_key=settings.GROQ_API_KEY)

    # Saneamos historial: solo roles válidos, recortado y con tope de longitud
    clean = []
    for m in messages[-MAX_HISTORY:]:
        role = m.get('role')
        content = (m.get('content') or '').strip()[:4000]
        if role in ('user', 'assistant') and content:
            clean.append({'role': role, 'content': content})
    if not clean or clean[-1]['role'] != 'user':
        return '¿En qué puedo ayudarte?'

    convo = [{'role': 'system', 'content': build_system_prompt(user)}, *clean]

    # Loop de tool-calling: el modelo puede pedir consultar datos antes de responder.
    for _ in range(MAX_TOOL_ROUNDS):
        completion = client.chat.completions.create(
            model=MODEL,
            messages=convo,
            tools=TOOL_SPECS,
            tool_choice='auto',
            temperature=0.4,
            max_tokens=900,
        )
        msg = completion.choices[0].message
        tool_calls = getattr(msg, 'tool_calls', None)

        if not tool_calls:
            return (msg.content or '').strip() or '¿En qué puedo ayudarte?'

        # Registrar la petición de herramientas del asistente
        convo.append({
            'role': 'assistant',
            'content': msg.content or '',
            'tool_calls': [{
                'id': tc.id,
                'type': 'function',
                'function': {'name': tc.function.name, 'arguments': tc.function.arguments},
            } for tc in tool_calls],
        })
        # Ejecutar cada herramienta y devolver el resultado
        for tc in tool_calls:
            try:
                args = json.loads(tc.function.arguments or '{}')
            except json.JSONDecodeError:
                args = {}
            result = run_tool(tc.function.name, args, user)
            convo.append({
                'role': 'tool',
                'tool_call_id': tc.id,
                'content': json.dumps(result, ensure_ascii=False, default=str),
            })

    # Si se agotaron las rondas, una última respuesta sin herramientas
    final = client.chat.completions.create(
        model=MODEL, messages=convo, temperature=0.4, max_tokens=900,
    )
    return (final.choices[0].message.content or '').strip() or 'No pude completar la consulta, intenta reformular.'
