from django.contrib import admin
from .models import TelegramIntegration, EmailIntegration, WhatsAppIntegration, WebchatIntegration


@admin.register(TelegramIntegration)
class TelegramIntegrationAdmin(admin.ModelAdmin):
    list_display = ('provedor', 'phone_number', 'is_active', 'is_connected', 'last_sync')
    list_filter = ('is_active', 'is_connected', 'created_at')
    search_fields = ('provedor__nome', 'phone_number')
    readonly_fields = ('session_string', 'last_sync')


@admin.register(EmailIntegration)
class EmailIntegrationAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'provider', 'provedor', 'is_active', 'is_connected')
    list_filter = ('provider', 'is_active', 'is_connected', 'created_at')
    search_fields = ('name', 'email', 'provedor__nome')
    readonly_fields = ('last_sync',)


@admin.register(WhatsAppIntegration)
class WhatsAppIntegrationAdmin(admin.ModelAdmin):
    list_display = ('provedor', 'phone_number', 'is_active', 'is_connected', 'last_sync')
    list_filter = ('is_active', 'is_connected', 'created_at')
    search_fields = ('provedor__nome', 'phone_number')
    readonly_fields = ('last_sync',)


@admin.register(WebchatIntegration)
class WebchatIntegrationAdmin(admin.ModelAdmin):
    list_display = ('provedor', 'widget_color', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('provedor__nome',)
    readonly_fields = ()

