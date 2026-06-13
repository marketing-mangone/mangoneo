"""Construcción del prompt y llamada a Groq para el asistente del Hub."""
import logging
from django.conf import settings

from .knowledge import FIRM_KNOWLEDGE, HUB_NAVIGATION
from .snapshot import build_user_snapshot

logger = logging.getLogger(__name__)

MODEL = "llama-3.3-70b-versatile"
MAX_HISTORY = 10  # mensajes de historial que se envían

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
- Si preguntan por sus leads/tareas, usa los DATOS EN VIVO. Si no hay datos, dilo.
- Sé conciso: 1-4 frases salvo que pidan detalle.
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

    completion = client.chat.completions.create(
        model=MODEL,
        messages=[{'role': 'system', 'content': build_system_prompt(user)}, *clean],
        temperature=0.4,
        max_tokens=700,
    )
    return completion.choices[0].message.content.strip()
