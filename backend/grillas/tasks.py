import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name="grillas.publish_scheduled_posts")
def publish_scheduled_posts():
    """
    Celery beat task — runs every 5 minutes.
    Finds approved posts with publish_status='scheduled' whose scheduled_at
    has passed, then publishes them via Ayrshare.
    """
    from .models import GridPost
    from .ayrshare import post_to_social

    now = timezone.now()
    pending = GridPost.objects.filter(
        publish_status="scheduled",
        approved=True,
        scheduled_at__lte=now,
    ).select_related("grid")

    count = pending.count()
    if not count:
        return "No hay posts pendientes."

    published = 0
    failed = 0

    for post in pending:
        try:
            result = post_to_social(
                caption=post.caption,
                platforms=post.platforms or ["instagram", "facebook"],
            )
            post.publish_status   = "published"
            post.published_at     = now
            post.ayrshare_post_id = result.get("id", "")
            post.publish_error    = ""
            post.save(update_fields=[
                "publish_status", "published_at", "ayrshare_post_id", "publish_error",
            ])
            published += 1
            logger.info("Post %s publicado via Ayrshare (id=%s)", post.id, post.ayrshare_post_id)
        except Exception as exc:
            post.publish_status = "failed"
            post.publish_error  = str(exc)
            post.save(update_fields=["publish_status", "publish_error"])
            failed += 1
            logger.error("Error publicando post %s: %s", post.id, exc)

    return f"Publicados: {published} | Errores: {failed}"
