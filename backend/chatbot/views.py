import logging

from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import UserRateThrottle
from rest_framework.response import Response
from rest_framework import status

from .services import chat

logger = logging.getLogger(__name__)


class ChatThrottle(UserRateThrottle):
    scope = 'chat'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([ChatThrottle])
def chat_view(request):
    """
    Asistente del Hub.
    Body: {"messages": [{"role": "user"|"assistant", "content": "..."}, ...]}
    o bien {"message": "...", "history": [...]}.
    Devuelve {"reply": "..."}.
    """
    data = request.data or {}
    messages = data.get('messages')
    if messages is None:
        msg = (data.get('message') or '').strip()
        if not msg:
            return Response({'detail': 'Falta el mensaje.'}, status=status.HTTP_400_BAD_REQUEST)
        history = data.get('history') or []
        messages = [*history, {'role': 'user', 'content': msg}]

    if not isinstance(messages, list) or not messages:
        return Response({'detail': 'messages debe ser una lista no vacía.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reply = chat(request.user, messages)
    except Exception as e:  # noqa: BLE001
        logger.exception('Error en chat del asistente')
        return Response(
            {'reply': 'Ups, tuve un problema para responder. Intenta de nuevo en un momento.'},
            status=status.HTTP_200_OK,
        )
    return Response({'reply': reply})
