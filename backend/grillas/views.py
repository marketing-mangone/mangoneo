import json
import logging
import urllib.request
import xml.etree.ElementTree as ET
from groq import Groq
from django.conf import settings
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ContentGrid, GridPost
from .serializers import ContentGridSerializer, ContentGridListSerializer, GridPostSerializer
from .prompts import build_generation_prompt, build_uscis_angles

logger = logging.getLogger(__name__)


class ContentGridViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ContentGrid.objects.prefetch_related('posts').all()

    def get_serializer_class(self):
        if self.action == 'list':
            return ContentGridListSerializer
        return ContentGridSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        grid = self.get_object()
        uscis_news = None
        if grid.tema == 'uscis':
            uscis_news = _fetch_uscis_news()
        try:
            posts_data = _generate_with_groq(
                grid.get_tema_display(),
                str(grid.week_start),
                uscis_news=uscis_news,
            )
        except Exception as e:
            return Response({'error': f'Error al generar contenido: {str(e)}'}, status=500)

        grid.posts.all().delete()
        for post_data in posts_data:
            GridPost.objects.create(grid=grid, **post_data)

        serializer = ContentGridSerializer(grid)
        return Response(serializer.data)


class GridPostUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GridPostSerializer
    queryset = GridPost.objects.all()


def _fetch_uscis_news(max_items: int = 7) -> list[dict]:
    """Fetch latest USCIS news from their RSS feeds. Returns list of {title, summary, date} dicts."""
    feeds = [
        "https://www.uscis.gov/newsroom/news-releases.rss",
        "https://www.uscis.gov/newsroom/alerts.rss",
    ]
    items = []
    for url in feeds:
        if len(items) >= max_items:
            break
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                tree = ET.fromstring(resp.read())
            ns = {"atom": "http://www.w3.org/2005/Atom"}
            channel = tree.find("channel")
            rss_items = channel.findall("item") if channel is not None else tree.findall(".//item")
            for item in rss_items[:max_items - len(items)]:
                title = (item.findtext("title") or "").strip()
                desc = (item.findtext("description") or "").strip()
                pub_date = (item.findtext("pubDate") or "").strip()
                if title:
                    items.append({"title": title, "summary": desc[:300], "date": pub_date})
        except Exception as exc:
            logger.warning("No se pudo obtener RSS de USCIS (%s): %s", url, exc)
    return items


def _generate_with_groq(tema_display: str, week_start: str, uscis_news: list | None = None) -> list:
    client = Groq(api_key=settings.GROQ_API_KEY)

    news_block = ""
    if uscis_news:
        lines = [f"- [{item['date']}] {item['title']}: {item['summary']}" for item in uscis_news]
        news_block = (
            "\n\nÚLTIMAS NOTICIAS DE USCIS (úsalas como fuente de inspiración y contexto para los posts):\n"
            + "\n".join(lines)
            + "\n\nCada día de la semana debe abordar una de estas noticias o un ángulo relacionado con ellas."
        )
    elif uscis_news is not None:
        news_block = (
            "\n\nNota: No se pudieron obtener noticias recientes de USCIS en este momento. "
            "Genera contenido sobre novedades migratorias y cambios de política de USCIS en general."
        )

    user_prompt = (
        f"Genera la grilla de contenido para la semana del {week_start}.\n"
        f"Tema de la semana: {tema_display}"
        f"{news_block}\n\n"
        "Genera exactamente 21 posts (3 por cada uno de los 7 días, day_of_week de 0 a 6).\n"
        "Responde ÚNICAMENTE con el JSON válido, sin texto adicional."
    )

    system_prompt = build_generation_prompt()
    if uscis_news is not None:
        system_prompt += build_uscis_angles()

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.7,
        max_tokens=8000,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content.strip()
    data = json.loads(raw)
    posts = data.get("posts", [])

    result = []
    for post in posts:
        result.append({
            "day_of_week": int(post.get("day_of_week", 0)),
            "slot": post.get("slot", "carousel"),
            "format": post.get("format", "carousel"),
            "headline": post.get("headline", ""),
            "slide_titles": post.get("slide_titles", []),
            "copy": post.get("copy", ""),
            "cta": post.get("cta", ""),
            "hashtags": post.get("hashtags", ""),
            "caption": post.get("caption", ""),
            "photo_suggestion": post.get("photo_suggestion", ""),
            "video_title": post.get("video_title", ""),
            "script_points": post.get("script_points", []),
        })

    return result
