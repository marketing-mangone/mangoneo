"""
Ayrshare API client.

Para activar: agrega AYRSHARE_API_KEY en tu .env
Documentación: https://docs.ayrshare.com
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

AYRSHARE_BASE = "https://app.ayrshare.com/api"

PLATFORM_LABELS = {
    "instagram": "Instagram",
    "facebook":  "Facebook",
    "tiktok":    "TikTok",
    "linkedin":  "LinkedIn",
    "youtube":   "YouTube",
}


def _headers() -> dict:
    api_key = getattr(settings, "AYRSHARE_API_KEY", None)
    if not api_key:
        raise ValueError("AYRSHARE_API_KEY no está configurada en el entorno.")
    return {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}


def post_to_social(
    caption: str,
    platforms: list[str],
    scheduled_at=None,
    media_urls: list[str] | None = None,
) -> dict:
    """
    Publish or schedule a post via Ayrshare.

    Args:
        caption:      Text of the post (caption).
        platforms:    List of platform slugs, e.g. ['instagram', 'facebook'].
        scheduled_at: Optional aware datetime for scheduled posting.
        media_urls:   Optional list of public media URLs.

    Returns:
        Ayrshare API response dict with at least an 'id' key on success.
    """
    payload: dict = {
        "post":      caption,
        "platforms": platforms,
    }
    if scheduled_at:
        payload["scheduleDate"] = scheduled_at.isoformat()
    if media_urls:
        payload["mediaUrls"] = media_urls

    resp = requests.post(
        f"{AYRSHARE_BASE}/post",
        json=payload,
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    logger.info("Ayrshare post created: %s", data.get("id"))
    return data


def delete_scheduled_post(ayrshare_post_id: str) -> dict:
    """Cancel a scheduled post in Ayrshare by its post ID."""
    resp = requests.delete(
        f"{AYRSHARE_BASE}/post",
        json={"id": ayrshare_post_id},
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def get_post_status(ayrshare_post_id: str) -> dict:
    """Retrieve the current status of a specific post."""
    resp = requests.get(
        f"{AYRSHARE_BASE}/post/{ayrshare_post_id}",
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def get_history(platform: str | None = None) -> list:
    """Return post history from Ayrshare, optionally filtered by platform."""
    params = {}
    if platform:
        params["platform"] = platform
    resp = requests.get(
        f"{AYRSHARE_BASE}/history",
        params=params,
        headers=_headers(),
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()


def verify_connection() -> dict:
    """Verify the API key is valid and return profile info."""
    resp = requests.get(
        f"{AYRSHARE_BASE}/user",
        headers=_headers(),
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()
