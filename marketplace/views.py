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


from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json


@csrf_exempt
def svdpay_webhook(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        reference = data.get('reference')
        status = data.get('status')

        # 1. Log the incoming webhook to verify it's working
        print(f"DEBUG: Webhook received! Ref: {reference}, Status: {status}")

        # 2. Logic to verify and update your Order/Listing
        # You should call the SvdPay verification API here just to be safe
        if status == 'success':
            # Find the order associated with this reference and mark as PAID
            # Order.objects.filter(reference=reference).update(status='PAID')
            return JsonResponse({'message': 'Webhook processed'}, status=200)

        return JsonResponse({'message': 'Event ignored'}, status=200)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

# --- Marketplace Views ---

def book_list(request):
    query = request.GET.get('q')
    listings = Listing.objects.all()
    if query:
        listings = listings.filter(Q(book__title__icontains=query))

    # REMOVE THIS FOR LOOP:
    # for listing in listings:
    #     listing.formatted_price = f"GH₵{float(listing.price):,.2f}"

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

    # Debug: Check price in logs
    print(f"DEBUG: Processing payment for Listing ID {listing_id}, Price: {listing.price}")

    checkout_data = request.session.get('checkout_info')
    if not checkout_data:
        return redirect('order_checkout', listing_id=listing_id)

    # Use getattr to avoid AttributeErrors
    secret_key = getattr(settings, 'SDVPAY_SECRET_KEY', None)

    if not secret_key:
        print("ERROR: SDVPAY_SECRET_KEY is missing in settings!")
        return render(request, 'marketplace/error.html', {'message': 'Payment service is currently unavailable.'})

    url = "https://api.svdpay.com/api/v1/payments/initialize/"
    headers = {"Authorization": f"Bearer {secret_key}", "Content-Type": "application/json"}

    payload = {
        "amount": float(listing.price),
        "description": f"Payment for {listing.book.title}",
        "customer_phone": checkout_data.get('phone_number'),
        "customer_name": checkout_data.get('full_name'),
        "email": checkout_data.get('email'),
        "callback_url": "https://kod-psi.vercel.app/checkout-success/",
        "return_url": "https://kod-psi.vercel.app/checkout-success/"
    }

    checkout_url = None
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code == 200:
            checkout_url = response.json().get('data', {}).get('checkout_url')
        else:
            print(f"SvdPay API Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Connection Error: {e}")

    return render(request, 'marketplace/payment.html', {
        'listing': listing,
        'checkout_url': checkout_url,
        'amount': listing.price  # Pass this explicitly for the template
    })
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