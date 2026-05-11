from django.db import models
from accounts.models import UserProfile

class TeamMemberProxy(UserProfile):
    class Meta:
        proxy = True
        verbose_name = 'Miembro del equipo'
