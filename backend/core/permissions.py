"""
Permisos basados en roles (RBAC) reutilizables.

Roles del sistema (ver accounts.models.UserProfile.ROLE_CHOICES):
    admin       — Director de Marketing. Acceso total.
    team        — Equipo de marketing. Operación diaria.
    leadership  — Auguy + partners. Vista ejecutiva de solo lectura.
    viewer      — Otros departamentos. Solo recursos públicos.

Un superusuario sin perfil se trata como 'admin'.
"""
from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_role(user):
    """Devuelve el rol del usuario, o None si no está autenticado."""
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, 'profile', None)
    if profile is not None:
        return profile.role
    return 'admin' if user.is_superuser else None


class RoleBasedAccess(BasePermission):
    """
    Base RBAC: define `read_roles` (métodos seguros) y `write_roles` (mutaciones).
    Subclasea y declara los conjuntos de roles.
    """
    read_roles: set = set()
    write_roles: set = set()

    def has_permission(self, request, view):
        role = get_role(request.user)
        if role is None:
            return False
        allowed = self.read_roles if request.method in SAFE_METHODS else self.write_roles
        return role in allowed


class SalesAccess(RoleBasedAccess):
    """
    CRM de Ventas — modelo colaborativo.
      admin, team        → lectura y escritura (operan los leads en equipo)
      leadership         → solo lectura (vista ejecutiva del pipeline)
      viewer             → sin acceso (los leads contienen PII de clientes)
    """
    read_roles = {'admin', 'team', 'leadership'}
    write_roles = {'admin', 'team'}
