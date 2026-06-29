from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
# Import the custom marketplace admin instance
from marketplace.admin import marketplace_admin
from marketplace import views

urlpatterns = [
    # 1. Global Admin (includes your Quiz app and Users)
    path('admin/', admin.site.urls),

    # 2. ISOLATED Marketplace Admin (only for your Marketplace models)
    path('marketplace-admin/', marketplace_admin.urls),

    # 3. Includes all your other marketplace paths (book_list, checkout, etc.)
    path('', include('marketplace.urls')),

    # Webhook path
    path('webhook/svdpay/', views.svdpay_webhook, name='svdpay_webhook'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)