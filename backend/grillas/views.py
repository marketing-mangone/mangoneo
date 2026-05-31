import json
from groq import Groq
from django.conf import settings
from rest_framework import viewsets, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import ContentGrid, GridPost
from .serializers import ContentGridSerializer, ContentGridListSerializer, GridPostSerializer
from .prompts import build_generation_prompt


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
        try:
            posts_data = _generate_with_groq(
                grid.get_tema_display(),
                str(grid.week_start),
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


def _generate_with_groq(tema_display: str, week_start: str) -> list:
    client = Groq(api_key=settings.GROQ_API_KEY)

    user_prompt = (
        f"Genera la grilla de contenido para la semana del {week_start}.\n"
        f"Tema de la semana: {tema_display}\n\n"
        "Genera exactamente 21 posts (3 por cada uno de los 7 días, day_of_week de 0 a 6).\n"
        "Responde ÚNICAMENTE con el JSON válido, sin texto adicional."
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": build_generation_prompt()},
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
