import json
import logging
import urllib.request
import xml.etree.ElementTree as ET
from groq import Groq
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from django.utils.dateparse import parse_datetime
from .models import ContentGrid, GridPost, GridPostComment, GridPostVersion
from .serializers import (
    ContentGridSerializer, ContentGridListSerializer, GridPostSerializer,
    GridPostCommentSerializer, GridPostVersionSerializer,
)
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
    def to_calendar(self, request, pk=None):
        """Bulk-create CalendarEvents from every post in this grid."""
        from datetime import timedelta
        from tasks_app.models import CalendarEvent

        grid = self.get_object()
        if not grid.posts.exists():
            return Response({'error': 'La grilla no tiene posts generados.'}, status=400)

        SLOT_LABEL = {'carousel': 'Carrusel', 'foto': 'Foto', 'reel': 'Reel'}
        SLOT_CHANNEL = {'carousel': 'instagram', 'foto': 'instagram', 'reel': 'instagram'}

        # Remove previously pushed events for this grid (idempotent re-push)
        marker = f'[grilla:{grid.id}]'
        CalendarEvent.objects.filter(description__startswith=marker).delete()

        events = []
        for post in grid.posts.select_related().order_by('day_of_week', 'slot'):
            post_date = grid.week_start + timedelta(days=post.day_of_week)

            if post.slot == 'carousel':
                preview = (post.headline or post.caption or '').split('\n')[0][:80]
            elif post.slot == 'reel':
                preview = (post.video_title or post.caption or '').split('\n')[0][:80]
            else:
                preview = (post.photo_suggestion or post.caption or '').split('\n')[0][:80]

            title = f"[{SLOT_LABEL[post.slot]}] {preview}" if preview else f"[{SLOT_LABEL[post.slot]}] {grid.get_tema_display()}"

            events.append(CalendarEvent(
                title=title[:255],
                type='content',
                date=post_date,
                channel=SLOT_CHANNEL[post.slot],
                status='scheduled',
                description=f"{marker}\n{post.caption}",
                created_by=request.user,
            ))

        CalendarEvent.objects.bulk_create(events)
        return Response({'created': len(events), 'week': str(grid.week_start), 'tema': grid.get_tema_display()})

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
                tono=grid.tono or 'educativo',
                notes=grid.notes or '',
            )
        except Exception as e:
            return Response({'error': f'Error al generar contenido: {str(e)}'}, status=500)

        grid.posts.all().delete()
        for post_data in posts_data:
            GridPost.objects.create(grid=grid, **post_data)

        serializer = ContentGridSerializer(grid)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def hashtags(self, request, pk=None):
        """Generate 30 themed hashtags segmented by reach."""
        grid = self.get_object()
        try:
            result = _generate_hashtags(grid.get_tema_display(), grid.tono or 'educativo')
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        return Response(result)


class GridPostUpdateView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = GridPostSerializer
    queryset = GridPost.objects.all()

    def perform_update(self, serializer):
        instance = self.get_object()
        old_caption = instance.caption
        serializer.save()
        new_caption = serializer.instance.caption
        # Save version snapshot if caption actually changed
        if new_caption and new_caption.strip() != old_caption.strip():
            user = self.request.user
            name = user.get_full_name() or user.username
            GridPostVersion.objects.create(
                post=serializer.instance,
                caption=old_caption,
                changed_by_name=name,
            )


class PostApproveView(generics.GenericAPIView):
    """Toggle approval on a GridPost. POST toggles the current state."""
    permission_classes = [IsAuthenticated]
    queryset = GridPost.objects.all()

    def post(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if post.approved:
            post.approved = False
            post.approved_by = None
            post.approved_at = None
        else:
            post.approved = True
            post.approved_by = user
            post.approved_at = timezone.now()
        post.save(update_fields=['approved', 'approved_by', 'approved_at'])
        serializer = GridPostSerializer(post)
        return Response(serializer.data)


class PostCommentsView(generics.ListCreateAPIView):
    """List or add comments on a GridPost."""
    permission_classes = [IsAuthenticated]
    serializer_class = GridPostCommentSerializer

    def get_queryset(self):
        return GridPostComment.objects.filter(post_id=self.kwargs['pk'])

    def perform_create(self, serializer):
        user = self.request.user
        name = user.get_full_name() or user.username
        serializer.save(post_id=self.kwargs['pk'], author_name=name)


class PostHistoryView(generics.ListAPIView):
    """List caption version history for a GridPost."""
    permission_classes = [IsAuthenticated]
    serializer_class = GridPostVersionSerializer

    def get_queryset(self):
        return GridPostVersion.objects.filter(post_id=self.kwargs['pk'])


class PostImproveView(generics.GenericAPIView):
    """Return an AI-improved version of a post's caption without saving it."""
    permission_classes = [IsAuthenticated]
    queryset = GridPost.objects.all()

    def post(self, request, pk=None):
        post = self.get_object()
        if not post.caption or not post.caption.strip():
            return Response({'error': 'El post no tiene caption para mejorar.'}, status=400)
        try:
            improved = _improve_caption(post)
        except Exception as e:
            return Response({'error': str(e)}, status=500)
        return Response({'caption': improved})


class PostScheduleView(generics.GenericAPIView):
    """Schedule a GridPost for publishing via Ayrshare."""
    permission_classes = [IsAuthenticated]
    queryset = GridPost.objects.all()

    def post(self, request, pk=None):
        post = self.get_object()
        if not post.approved:
            return Response({'error': 'El post debe estar aprobado antes de programarlo.'}, status=400)
        if not post.caption or not post.caption.strip():
            return Response({'error': 'El post no tiene caption para publicar.'}, status=400)

        scheduled_at_raw = request.data.get('scheduled_at')
        platforms        = request.data.get('platforms', ['instagram', 'facebook'])

        if not scheduled_at_raw:
            return Response({'error': 'Se requiere una fecha de publicación.'}, status=400)
        if not platforms:
            return Response({'error': 'Selecciona al menos una plataforma.'}, status=400)

        scheduled_dt = parse_datetime(scheduled_at_raw)
        if not scheduled_dt:
            return Response({'error': 'Formato de fecha inválido.'}, status=400)

        post.scheduled_at   = scheduled_dt
        post.platforms      = platforms
        post.publish_status = 'scheduled'
        post.publish_error  = ''
        post.save(update_fields=['scheduled_at', 'platforms', 'publish_status', 'publish_error'])

        serializer = GridPostSerializer(post)
        return Response(serializer.data)


class PostPublishNowView(generics.GenericAPIView):
    """Immediately publish a GridPost via Ayrshare."""
    permission_classes = [IsAuthenticated]
    queryset = GridPost.objects.all()

    def post(self, request, pk=None):
        from .ayrshare import post_to_social

        post = self.get_object()
        if not post.approved:
            return Response({'error': 'El post debe estar aprobado antes de publicarlo.'}, status=400)
        if not post.caption or not post.caption.strip():
            return Response({'error': 'El post no tiene caption para publicar.'}, status=400)

        platforms = request.data.get('platforms') or post.platforms or ['instagram', 'facebook']

        try:
            result = post_to_social(caption=post.caption, platforms=platforms)
            post.platforms        = platforms
            post.publish_status   = 'published'
            post.published_at     = timezone.now()
            post.ayrshare_post_id = result.get('id', '')
            post.publish_error    = ''
            post.save(update_fields=[
                'platforms', 'publish_status', 'published_at',
                'ayrshare_post_id', 'publish_error',
            ])
        except Exception as exc:
            post.publish_status = 'failed'
            post.publish_error  = str(exc)
            post.save(update_fields=['publish_status', 'publish_error'])
            return Response({'error': f'Error al publicar: {exc}'}, status=500)

        serializer = GridPostSerializer(post)
        return Response(serializer.data)


class PostCancelScheduleView(generics.GenericAPIView):
    """Cancel a scheduled GridPost."""
    permission_classes = [IsAuthenticated]
    queryset = GridPost.objects.all()

    def post(self, request, pk=None):
        post = self.get_object()
        if post.publish_status != 'scheduled':
            return Response({'error': 'Solo se pueden cancelar posts programados.'}, status=400)

        # If Ayrshare already has the post queued, attempt to cancel it there too.
        if post.ayrshare_post_id:
            try:
                from .ayrshare import delete_scheduled_post
                delete_scheduled_post(post.ayrshare_post_id)
            except Exception as exc:
                logger.warning("No se pudo cancelar en Ayrshare post %s: %s", post.ayrshare_post_id, exc)

        post.publish_status   = 'cancelled'
        post.scheduled_at     = None
        post.ayrshare_post_id = ''
        post.save(update_fields=['publish_status', 'scheduled_at', 'ayrshare_post_id'])

        serializer = GridPostSerializer(post)
        return Response(serializer.data)


class PublishingQueueView(generics.ListAPIView):
    """All posts that have ever been scheduled or published."""
    permission_classes = [IsAuthenticated]
    serializer_class   = GridPostSerializer

    def get_queryset(self):
        qs = (
            GridPost.objects
            .filter(publish_status__isnull=False)
            .select_related('grid', 'approved_by')
            .order_by('-scheduled_at', '-published_at')
        )
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(publish_status=status)
        platform = self.request.query_params.get('platform')
        if platform:
            qs = qs.filter(platforms__contains=platform)
        return qs


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


TONO_INSTRUCCIONES = {
    'educativo':  'Tono EDUCATIVO: explica conceptos legales con claridad, usa analogías simples, prioriza que el lector entienda y aprenda.',
    'emotivo':    'Tono EMOTIVO: conecta con la historia personal del inmigrante, usa narrativa de transformación, evoca esperanza sin prometer resultados.',
    'urgente':    'Tono URGENTE: resalta plazos reales, consecuencias de no actuar, llamado claro a la acción inmediata sin generar miedo innecesario.',
    'inspirador': 'Tono INSPIRADOR: historias de superación, posibilidades que se abren, énfasis en el futuro positivo que es posible con el proceso correcto.',
}


def _generate_with_groq(
    tema_display: str,
    week_start: str,
    uscis_news: list | None = None,
    tono: str = 'educativo',
    notes: str = '',
) -> list:
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

    tono_instruccion = TONO_INSTRUCCIONES.get(tono, TONO_INSTRUCCIONES['educativo'])
    notes_block = f"\n\nCONTEXTO ADICIONAL (priorizar en la generación):\n{notes}" if notes.strip() else ""

    user_prompt = (
        f"Genera la grilla de contenido para la semana del {week_start}.\n"
        f"Tema de la semana: {tema_display}\n\n"
        f"TONO REQUERIDO: {tono_instruccion}"
        f"{news_block}"
        f"{notes_block}\n\n"
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


def _improve_caption(post: GridPost) -> str:
    """Return an AI-improved caption for a given post (does NOT save)."""
    client = Groq(api_key=settings.GROQ_API_KEY)

    slot_context = {
        'carousel': f"Tipo: Carrusel/Post estático.\nHeadline de la imagen: {post.headline or '(sin headline)'}",
        'foto':     f"Tipo: Foto.\nSugerencia visual: {post.photo_suggestion or '(sin sugerencia)'}",
        'reel':     f"Tipo: Reel.\nTítulo en pantalla: {post.video_title or '(sin título)'}",
    }.get(post.slot, '')

    system_prompt = (
        "Eres el copywriter experto de Mangone Law Firm, LLC.\n"
        "Tu misión: mejorar el caption recibido manteniendo el mismo tema y ángulo.\n"
        "REGLAS OBLIGATORIAS:\n"
        "- NUNCA uses 'especialistas' ni 'especializada' (restricción ética NJ RPC 7.4).\n"
        "- Sin garantías de resultado ('garantizamos', 'aprobación garantizada', etc.).\n"
        "- Sin estadísticas propias ('miles de familias', 'X casos ganados').\n"
        "- Voz en primera persona plural: nosotros, podemos, estamos.\n"
        "- Estructura: Hook emocional → Desarrollo (2-3 párrafos cortos) → CTA → Disclaimer legal.\n"
        "- CTA siempre por DM o teléfono (862) 701-2097, nunca en comentarios públicos.\n"
        "- RESPONDE ÚNICAMENTE con el caption mejorado, sin explicaciones ni comillas externas."
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": (
                f"{slot_context}\n\n"
                f"Caption actual:\n{post.caption}\n\n"
                "Mejora este caption: hazlo más impactante, con mejor estructura y mayor poder de enganche. "
                "Mantén el mismo tema, tono y cumplimiento legal."
            )},
        ],
        temperature=0.75,
        max_tokens=1200,
    )
    return completion.choices[0].message.content.strip()


def _generate_hashtags(tema_display: str, tono: str) -> dict:
    """Generate 30 hashtags segmented by reach for a grid theme."""
    client = Groq(api_key=settings.GROQ_API_KEY)

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "Eres un experto en SEO y marketing en redes sociales para firmas legales de inmigración en EE.UU. "
                    "Generas hashtags en español e inglés que son seguros legalmente (sin garantías ni promesas). "
                    "PROHIBIDO: #garantiz*, #aprobacionsegura, #visagarantizada, #residenciagarantizada. "
                    "Responde ÚNICAMENTE con JSON válido."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Genera 30 hashtags para contenido sobre '{tema_display}' con tono '{tono}' "
                    f"para una firma de abogados de inmigración que sirve al mercado Latino en EE.UU.\n\n"
                    "Organízalos en 3 grupos de 10:\n"
                    "- pequeños: menos de 100K posts — muy específicos, alta conversión\n"
                    "- medianos: 100K–1M posts — buen balance reach/competencia\n"
                    "- grandes: más de 1M posts — máximo alcance\n\n"
                    'Formato exacto: {"pequeños": ["#tag1", ...], "medianos": ["#tag1", ...], "grandes": ["#tag1", ...]}'
                ),
            },
        ],
        temperature=0.6,
        max_tokens=600,
        response_format={"type": "json_object"},
    )

    return json.loads(completion.choices[0].message.content.strip())
