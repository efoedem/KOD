from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
# --- ADD THIS LINE ---
from marketplace import views

urlpatterns = [
    path('admin/', admin.site.urls),
    # This includes all your other marketplace paths (book_list, checkout, etc.)
    path('', include('marketplace.urls')),
    # This is your new webhook path
    path('webhook/svdpay/', views.svdpay_webhook, name='svdpay_webhook'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)