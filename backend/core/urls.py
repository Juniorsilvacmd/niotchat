from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'labels', views.LabelViewSet)
router.register(r'provedores', views.ProvedorViewSet)
router.register(r'canais', views.CanalViewSet)
router.register(r'companies', views.CompanyViewSet)
router.register(r'company-users', views.CompanyUserViewSet)
router.register(r'system-config', views.SystemConfigViewSet, basename='system-config')
router.register(r'audit-logs', views.AuditLogViewSet)
router.register(r'mensagens-sistema', views.MensagemSistemaViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', views.CustomAuthToken.as_view(), name='auth_login'),
    path('auth/me/', views.UserMeView.as_view(), name='auth_me'),
    path('auth/logout/', views.LogoutView.as_view(), name='auth_logout'),
    path('auth/reset-password/', views.ResetPasswordView.as_view(), name='auth_reset_password'),
    path('users/list/', views.UserListView.as_view(), name='users_list'),
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard_stats'),
    path('dashboard/response-time-hourly/', views.DashboardResponseTimeHourlyView.as_view(), name='dashboard_response_time_hourly'),
    path('atendimento/ia/', views.AtendimentoIAView.as_view(), name='atendimento_ia'),

    # Removido para evitar conflito com conversations.urls
    # path('media/<path:path>/', views.serve_media_file, name='serve_media_file'),
    path('uazapi/file/<str:file_id>/', views.serve_uazapi_file, name='serve_uazapi_file'),
    path('health/', views.health_check, name='health_check'),
    path('', views.frontend_view, name='frontend'),
]

