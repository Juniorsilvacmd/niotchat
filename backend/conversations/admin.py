from django.contrib import admin
from .models import Contact, Inbox, Conversation, Message, TeamMember, Team, RecoverySettings, RecoveryAttempt


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'provedor', 'created_at')
    list_filter = ('provedor', 'created_at')
    search_fields = ('name', 'email', 'phone')


@admin.register(Inbox)
class InboxAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel_type', 'provedor', 'is_active', 'created_at')
    list_filter = ('channel_type', 'provedor', 'is_active', 'created_at')
    search_fields = ('name', 'provedor__nome')


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('created_at',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'contact', 'inbox', 'assignee', 'status', 'created_at')
    list_filter = ('status', 'inbox', 'created_at')
    search_fields = ('contact__name', 'contact__email')
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'message_type', 'is_from_customer', 'created_at')
    list_filter = ('message_type', 'is_from_customer', 'created_at')
    search_fields = ('content', 'conversation__contact__name')


@admin.register(TeamMember)
class TeamMemberAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'role', 'joined_at')
    list_filter = ('role', 'joined_at')
    search_fields = ('user__username', 'team__name')





@admin.register(RecoverySettings)
class RecoverySettingsAdmin(admin.ModelAdmin):
    list_display = ('provedor', 'enabled', 'delay_minutes', 'max_attempts', 'auto_discount', 'discount_percentage')
    list_filter = ('enabled', 'auto_discount', 'created_at')
    search_fields = ('provedor__nome',)


@admin.register(RecoveryAttempt)
class RecoveryAttemptAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'attempt_number', 'status', 'sent_at', 'potential_value')
    list_filter = ('status', 'attempt_number', 'sent_at')
    search_fields = ('conversation__contact__name',)

