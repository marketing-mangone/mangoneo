"""
Meta Graph API connector — Facebook Page, Instagram y Ads.
Usa un Long-lived Access Token o System User Token almacenado en META_ACCESS_TOKEN.

Setup inicial:
1. Crea una Meta App en developers.facebook.com (tipo Business)
2. Agrega los productos: Pages API, Instagram Graph API, Marketing API
3. Obtén un token desde Meta Business Manager → System Users → Generate Token
   o desde Graph API Explorer con estos permisos:
   pages_read_engagement, instagram_basic, instagram_manage_insights, ads_read
4. Corre: python manage.py authorize_meta --token <TU_TOKEN>
5. Corre: python manage.py seed_meta_metrics

Variables de entorno requeridas:
  META_ACCESS_TOKEN          Long-lived o System User token
  META_PAGE_ID               Facebook Page ID (numérico)
  META_INSTAGRAM_ACCOUNT_ID  Instagram Business Account ID (numérico)
  META_AD_ACCOUNT_ID         Ad Account ID (solo el número, sin 'act_')
"""
import json
import requests
from datetime import date, timedelta, datetime, timezone

from django.conf import settings

BASE = 'https://graph.facebook.com/v20.0'


def _get(path: str, params: dict | None = None) -> dict:
    p = {**(params or {}), 'access_token': settings.META_ACCESS_TOKEN}
    resp = requests.get(f'{BASE}{path}', params=p, timeout=30)
    resp.raise_for_status()
    return resp.json()


def _ts(d: date) -> int:
    """Convierte date a Unix timestamp UTC."""
    return int(datetime(d.year, d.month, d.day, tzinfo=timezone.utc).timestamp())


def _sum_metric(response_data: dict, name: str) -> float:
    """Suma todos los valores diarios de una métrica en la respuesta de Insights."""
    for item in response_data.get('data', []):
        if item.get('name') == name:
            return sum(
                (v.get('value') or 0) if isinstance(v.get('value'), (int, float)) else 0
                for v in item.get('values', [])
            )
    return 0.0


# ── Facebook Page ─────────────────────────────────────────────────────────────

def fetch_page_info() -> dict:
    """Total de fans actuales de la página."""
    if not getattr(settings, 'META_PAGE_ID', ''):
        return {}
    data = _get(f'/{settings.META_PAGE_ID}', {'fields': 'fan_count,name'})
    return {
        'page_name': data.get('name', ''),
        'fan_count': int(data.get('fan_count', 0)),
    }


def fetch_page_insights(start_date: date, end_date: date) -> dict:
    """Métricas orgánicas semanales de la página de Facebook."""
    if not getattr(settings, 'META_PAGE_ID', ''):
        return {}
    data = _get(f'/{settings.META_PAGE_ID}/insights', {
        'metric': 'page_impressions,page_reach,page_engaged_users',
        'period': 'day',
        'since': _ts(start_date),
        'until': _ts(end_date + timedelta(days=1)),
    })
    return {
        'fb_impressions': int(_sum_metric(data, 'page_impressions')),
        'fb_reach':       int(_sum_metric(data, 'page_reach')),
        'fb_engagement':  int(_sum_metric(data, 'page_engaged_users')),
        'start_date': start_date.isoformat(),
        'end_date':   end_date.isoformat(),
    }


# ── Instagram ─────────────────────────────────────────────────────────────────

def fetch_instagram_info() -> dict:
    """Total de seguidores actuales de Instagram."""
    if not getattr(settings, 'META_INSTAGRAM_ACCOUNT_ID', ''):
        return {}
    data = _get(f'/{settings.META_INSTAGRAM_ACCOUNT_ID}', {
        'fields': 'followers_count,username',
    })
    return {
        'ig_username':      data.get('username', ''),
        'followers_count':  int(data.get('followers_count', 0)),
    }


def fetch_instagram_insights(start_date: date, end_date: date) -> dict:
    """Métricas orgánicas semanales de Instagram."""
    if not getattr(settings, 'META_INSTAGRAM_ACCOUNT_ID', ''):
        return {}
    data = _get(f'/{settings.META_INSTAGRAM_ACCOUNT_ID}/insights', {
        'metric': 'impressions,reach,profile_views',
        'period': 'day',
        'since': _ts(start_date),
        'until': _ts(end_date + timedelta(days=1)),
    })
    return {
        'ig_impressions':    int(_sum_metric(data, 'impressions')),
        'ig_reach':          int(_sum_metric(data, 'reach')),
        'ig_profile_views':  int(_sum_metric(data, 'profile_views')),
        'start_date': start_date.isoformat(),
        'end_date':   end_date.isoformat(),
    }


# ── Meta Ads ──────────────────────────────────────────────────────────────────

def fetch_ads_insights(start_date: date, end_date: date) -> dict:
    """Métricas de campaña semanales desde Meta Ads."""
    if not getattr(settings, 'META_AD_ACCOUNT_ID', ''):
        return {}
    data = _get(f'/act_{settings.META_AD_ACCOUNT_ID}/insights', {
        'fields': 'spend,impressions,reach,clicks,actions',
        'time_range': json.dumps({
            'since': start_date.isoformat(),
            'until': end_date.isoformat(),
        }),
        'level': 'account',
    })
    rows = data.get('data', [])
    if not rows:
        return {
            'ads_spend': 0.0, 'ads_impressions': 0,
            'ads_reach': 0,   'ads_clicks': 0,
            'start_date': start_date.isoformat(),
            'end_date':   end_date.isoformat(),
        }
    row = rows[0]
    actions = row.get('actions', [])
    leads = sum(
        int(a.get('value', 0)) for a in actions
        if a.get('action_type') in ('lead', 'onsite_conversion.lead_grouped')
    )
    spend = float(row.get('spend', 0))
    return {
        'ads_spend':       spend,
        'ads_impressions': int(row.get('impressions', 0)),
        'ads_reach':       int(row.get('reach', 0)),
        'ads_clicks':      int(row.get('clicks', 0)),
        'ads_leads':       leads,
        'start_date': start_date.isoformat(),
        'end_date':   end_date.isoformat(),
    }
