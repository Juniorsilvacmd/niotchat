# Enterprise Settings for 1000 Providers Scale
import os
from .settings import *

# Override base settings for enterprise scale
DEBUG = False
ALLOWED_HOSTS = ['*']  # Configure with specific domains in production

# Database Configuration - PostgreSQL Cluster
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'niochat_master'),
        'USER': os.environ.get('DB_USER', 'niochat'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'postgres-master.internal'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'MAX_CONNS': 200,
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 300,  # 5 minutes
    },
    'read_replica_1': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'niochat_replica1'),
        'USER': os.environ.get('DB_USER', 'niochat_read'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_REPLICA1_HOST', 'postgres-replica1.internal'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'MAX_CONNS': 100,
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 300,
    },
    'read_replica_2': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'niochat_replica2'),
        'USER': os.environ.get('DB_USER', 'niochat_read'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_REPLICA2_HOST', 'postgres-replica2.internal'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'MAX_CONNS': 100,
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 300,
    },
    'read_replica_3': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'niochat_replica3'),
        'USER': os.environ.get('DB_USER', 'niochat_read'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_REPLICA3_HOST', 'postgres-replica3.internal'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'MAX_CONNS': 100,
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 300,
    },
    'read_replica_4': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'niochat_replica4'),
        'USER': os.environ.get('DB_USER', 'niochat_read'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_REPLICA4_HOST', 'postgres-replica4.internal'),
        'PORT': os.environ.get('DB_PORT', '5432'),
        'OPTIONS': {
            'MAX_CONNS': 100,
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 300,
    },
}

# Database Router
DATABASE_ROUTERS = [
    'core.routers.ProviderDatabaseRouter',
]

# Redis Cluster Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': [
            f"redis://{os.environ.get('REDIS_NODE1', 'redis-node1.internal')}:7000/0",
            f"redis://{os.environ.get('REDIS_NODE2', 'redis-node2.internal')}:7001/0",
            f"redis://{os.environ.get('REDIS_NODE3', 'redis-node3.internal')}:7002/0",
            f"redis://{os.environ.get('REDIS_NODE4', 'redis-node4.internal')}:7003/0",
            f"redis://{os.environ.get('REDIS_NODE5', 'redis-node5.internal')}:7004/0",
            f"redis://{os.environ.get('REDIS_NODE6', 'redis-node6.internal')}:7005/0",
        ],
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.RedisClusterClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 1000,
                'retry_on_timeout': True,
                'socket_timeout': 5,
                'socket_connect_timeout': 5,
                'health_check_interval': 30,
            }
        }
    }
}

# Channels Layer - WebSocket Scaling
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [
                (os.environ.get('REDIS_NODE1', 'redis-node1.internal'), 7000),
                (os.environ.get('REDIS_NODE2', 'redis-node2.internal'), 7001),
                (os.environ.get('REDIS_NODE3', 'redis-node3.internal'), 7002),
            ],
            'capacity': 10000,  # Messages per channel
            'expiry': 60,       # Message expiry in seconds
            'group_expiry': 86400,  # Group expiry in seconds
            'symmetric_encryption_keys': [os.environ.get('CHANNELS_ENCRYPTION_KEY', 'your-secret-key')],
        },
    },
}

# Celery Configuration for Background Tasks
CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', 'redis://redis-node1.internal:7000/1')
CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', 'redis://redis-node1.internal:7000/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_ROUTES = {
    'core.tasks.process_ai_request': {'queue': 'ai_queue'},
    'integrations.tasks.send_message': {'queue': 'message_queue'},
    'conversations.tasks.process_webhook': {'queue': 'webhook_queue'},
}

# Logging Configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/niochat/django.log',
            'maxBytes': 100*1024*1024,  # 100MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'console': {
            'level': 'WARNING',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'sentry': {
            'level': 'ERROR',
            'class': 'sentry_sdk.integrations.logging.SentryHandler',
        },
    },
    'root': {
        'handlers': ['file', 'console', 'sentry'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'core': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'conversations': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Security Settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
X_FRAME_OPTIONS = 'DENY'

# Performance Settings
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# OpenAI Enterprise Configuration
OPENAI_ENTERPRISE_POOLS = [
    {'key': os.environ.get('OPENAI_KEY_1'), 'limit': 10000, 'name': 'pool_1'},
    {'key': os.environ.get('OPENAI_KEY_2'), 'limit': 10000, 'name': 'pool_2'},
    {'key': os.environ.get('OPENAI_KEY_3'), 'limit': 10000, 'name': 'pool_3'},
    {'key': os.environ.get('OPENAI_KEY_4'), 'limit': 10000, 'name': 'pool_4'},
    {'key': os.environ.get('OPENAI_KEY_5'), 'limit': 10000, 'name': 'pool_5'},
    {'key': os.environ.get('OPENAI_KEY_6'), 'limit': 10000, 'name': 'pool_6'},
    {'key': os.environ.get('OPENAI_KEY_7'), 'limit': 10000, 'name': 'pool_7'},
    {'key': os.environ.get('OPENAI_KEY_8'), 'limit': 10000, 'name': 'pool_8'},
    {'key': os.environ.get('OPENAI_KEY_9'), 'limit': 10000, 'name': 'pool_9'},
    {'key': os.environ.get('OPENAI_KEY_10'), 'limit': 10000, 'name': 'pool_10'},
]

# Uazapi Enterprise Pools
UAZAPI_ENTERPRISE_POOLS = [
    {
        'url': os.environ.get('UAZAPI_URL_1', 'https://api1.uazapi.com'),
        'token': os.environ.get('UAZAPI_TOKEN_1'),
        'providers_range': (1, 250),
        'rate_limit': 1000,
    },
    {
        'url': os.environ.get('UAZAPI_URL_2', 'https://api2.uazapi.com'),
        'token': os.environ.get('UAZAPI_TOKEN_2'),
        'providers_range': (251, 500),
        'rate_limit': 1000,
    },
    {
        'url': os.environ.get('UAZAPI_URL_3', 'https://api3.uazapi.com'),
        'token': os.environ.get('UAZAPI_TOKEN_3'),
        'providers_range': (501, 750),
        'rate_limit': 1000,
    },
    {
        'url': os.environ.get('UAZAPI_URL_4', 'https://api4.uazapi.com'),
        'token': os.environ.get('UAZAPI_TOKEN_4'),
        'providers_range': (751, 1000),
        'rate_limit': 1000,
    },
]

# Monitoring and Health Checks
HEALTH_CHECK_SETTINGS = {
    'DATABASE_TIMEOUT': 5,
    'REDIS_TIMEOUT': 3,
    'OPENAI_TIMEOUT': 10,
    'UAZAPI_TIMEOUT': 5,
}

# Rate Limiting
RATELIMIT_ENABLE = True
RATELIMIT_USE_CACHE = 'default'
RATELIMIT_VIEW = 'core.views.ratelimited'

# Provider Isolation Settings
PROVIDER_ISOLATION = {
    'STRICT_MODE': True,
    'VALIDATE_CROSS_PROVIDER_ACCESS': True,
    'LOG_ISOLATION_VIOLATIONS': True,
    'FAIL_ON_ISOLATION_VIOLATION': True,
}