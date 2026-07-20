# marketplace/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.book_list, name='book_list'),

    # 1. Shows the form for user details
    path('checkout/<int:listing_id>/', views.order_checkout, name='order_checkout'),

    # 2. Final confirmation (Removed the duplicate 'success/' path)
    path('checkout-success/', views.checkout_success, name='checkout_success'),

    # 3. SvdPay Webhook
    path('webhook/svdpay/', views.svdpay_webhook, name='svdpay_webhook'),

    path('receipt/download/<int:order_id>/', views.download_receipt, name='download_receipt'),

]