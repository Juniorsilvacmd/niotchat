from django.apps import AppConfig


class ConversationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'conversations'
    
    def ready(self):
        """Importar signals quando o app estiver pronto"""
        try:
            import conversations.signals
        except ImportError:
            pass