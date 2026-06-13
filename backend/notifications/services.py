"""Helper central para crear notificaciones (con deduplicación opcional)."""
from .models import Notification


def notify(recipient, notif_type, title, message='', link='', dedup_key=''):
    """
    Crea una notificación para `recipient`.
    Si se pasa `dedup_key` y ya existe una con esa clave para ese usuario, no la duplica.
    Devuelve la Notification creada, o None si se omitió.
    """
    if recipient is None:
        return None
    if dedup_key and Notification.objects.filter(recipient=recipient, dedup_key=dedup_key).exists():
        return None
    return Notification.objects.create(
        recipient=recipient,
        type=notif_type,
        title=title,
        message=message,
        link=link,
        dedup_key=dedup_key,
    )
