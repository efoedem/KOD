import uuid
import os
import requests
import json
import hmac
import hashlib
import time
from django.shortcuts import render, redirect, get_object_or_404
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse

from .models import Listing, Order
from .forms import CheckoutForm



#-- Webhook Settings ---
SECRET = b"whsec_xxx" # Ensure this is the byte-string secret

def verify(sig_header, body):
    try:
        if not sig_header:
            return False

        # Split the signature header (e.g., "t=1748...,v1=...")
        parts = dict(p.split('=') for p in sig_header.split(','))
        ts, sig = parts['t'], parts['v1']

        # 1. Check if the timestamp is within 5 minutes (300 seconds)
        if abs(time.time() - int(ts)) > 300:
            return False

        # 2. Re-calculate the expected signature using HMAC-SHA256
        expected = hmac.new(
            SECRET,
            f"{ts}.{body.decode()}".encode(),
            hashlib.sha256
        ).hexdigest()

        # 3. Compare the calculated signature with the provided one
        return hmac.compare_digest(expected, sig)

    except (ValueError, KeyError, AttributeError):
        # This handles cases where the header might be malformed
        return False


@csrf_exempt
def svdpay_webhook(request):
    if request.method == 'POST':
        sig_header = request.headers.get('X-SvdPay-Signature')
        body = request.body
        if verify(sig_header, body):
            event_data = json.loads(body)
            if event_data.get('event') == 'payment.completed':
                # Process success here (e.g., mark Order as paid if found via reference)
                return HttpResponse(status=200)
            return HttpResponse(status=200)
        return HttpResponse(status=400)
    return HttpResponse(status=405)


# --- Marketplace Views ---

def book_list(request):
    query = request.GET.get('q')
    listings = Listing.objects.all()
    if query:
        listings = listings.filter(Q(book__title__icontains=query))
    for listing in listings:
        listing.formatted_price = f"GH₵{float(listing.price):,.2f}"
    return render(request, 'marketplace/book_list.html', {'listings': listings, 'query': query})


def order_checkout(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)
    if request.method == 'POST':
        form = CheckoutForm(request.POST)
        if form.is_valid():
            request.session['checkout_info'] = form.cleaned_data
            request.session['listing_id'] = listing.id
            return redirect('payment_page', listing_id=listing.id)
    else:
        form = CheckoutForm()
    return render(request, 'marketplace/checkout.html', {'form': form, 'listing': listing})


def payment_page(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)
    checkout_data = request.session.get('checkout_info')
    if not checkout_data:
        return redirect('order_checkout', listing_id=listing_id)

    secret_key = settings.SDVPAY_SECRET_KEY
    url = "https://api.svdpay.com/api/v1/payments/initialize/"
    headers = {"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"}

    payload = {
        "amount": float(listing.price),
        "description": f"Payment for {listing.book.title}",
        "customer_phone": checkout_data['phone_number'],
        "customer_name": checkout_data['full_name'],
        "email": checkout_data.get('email'),
        "callback_url": "https://prolonged-postal-levitate.ngrok-free.dev/checkout-success/"
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        checkout_url = response.json().get('data', {}).get('checkout_url') if response.status_code == 200 else None
    except Exception as e:
        print(f"Error: {e}")
        checkout_url = None

    return render(request, 'marketplace/payment.html', {'listing': listing, 'checkout_url': checkout_url})


def checkout_success(request):
    print("DEBUG: The checkout_success view was called!")
    reference = request.GET.get('ref') or request.GET.get('reference')
    listing_id = request.session.get('listing_id')
    checkout_data = request.session.get('checkout_info')

    if not reference or not listing_id or not checkout_data:
        return redirect('book_list')

    # Verification Logic
    url = f"https://api.svdpay.com/api/v1/payments/{reference}/verify/"
    headers = {"Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}"}

    response = requests.get(url, headers=headers).json()

    if response.get('status') in [True, 'success']:
        listing = get_object_or_404(Listing, id=listing_id)
        order = Order.objects.create(
            listing=listing, buyer_name=checkout_data['full_name'],
            phone_number=checkout_data['phone_number'], email=checkout_data.get('email', ''),
            status='PAID'
        )
        # Send Email
        send_mail('Order Confirmation', f"Success! Ref: {reference}", settings.EMAIL_HOST_USER, [order.email])
        request.session.flush()  # Clear everything
        return render(request, 'marketplace/success.html', {'order': order})

    return render(request, 'marketplace/failed.html', {'error': 'Verification failed.'})