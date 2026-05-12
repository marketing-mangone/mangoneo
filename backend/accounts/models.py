from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    ROLE_CHOICES = [('admin','Admin'),('team','Team'),('leadership','Leadership'),('viewer','Viewer')]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='team')
    position = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, default='Marketing')
    area = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.CharField(max_length=10, blank=True)
    skills = models.JSONField(default=list, blank=True)
    start_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    reports_to = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='direct_reports',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.role})"
