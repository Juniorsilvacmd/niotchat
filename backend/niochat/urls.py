"""
URL configuration for nio chat project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from my_app import urls
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.authtoken.views import obtain_auth_token
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
from django.views.decorators.csrf import csrf_exempt
from core.views import custom_auth_token
from core.admin import admin_site
from integrations.views import webhook_evolution_uazapi

custom_obtain_auth_token = permission_classes([AllowAny])(obtain_auth_token)
custom_obtain_auth_token = csrf_exempt(custom_obtain_auth_token)

urlpatterns = [
    path('admin/', admin_site.urls),
    path('api/', include('core.urls')),
    path('api/', include('conversations.urls')),
    path('api/', include('integrations.urls')),
    path('api-token-auth/', custom_auth_token, name='api_token_auth'),
    path('api-auth/', include('rest_framework.urls')),
    path('webhook/evolution-uazapi/', webhook_evolution_uazapi, name='webhook_evolution_uazapi'),
    path('webhook/evolution-uazapi', webhook_evolution_uazapi, name='webhook_evolution_uazapi_no_slash'),
]

# Servir arquivos de mídia em desenvolvimento
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

