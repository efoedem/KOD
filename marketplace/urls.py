from django.urls import path
from . import views

urlpatterns = [
    path('', views.book_list, name='book_list'),

    # 1. Shows the form for user details
    path('checkout/<int:listing_id>/', views.order_checkout, name='order_checkout'),


    # 3. Final confirmation
    path('success/', views.checkout_success, name='checkout_success'),
    path('checkout-success/', views.checkout_success, name='checkout_success'),
# marketplace/urls.py
    path('webhook/svdpay/', views.svdpay_webhook, name='svdpay_webhook'),

]