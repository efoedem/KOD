import uuid
import os
import requests
import json
import hmac
import hashlib
import time
from django.contrib import messages
from django.shortcuts import render, redirect, get_object_or_404
from django.conf import settings
from django.core.mail import send_mail
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from twilio.rest import Client
from .models import Order, Listing
from .forms import CheckoutForm

# --- Webhook Settings ---
SECRET = b"whsec_xxx"


def verify_webhook_signature(sig_header, body):
    try:
        if not sig_header: return False
        parts = dict(p.split('=') for p in sig_header.split(','))
        ts, sig = parts['t'], parts['v1']
        if abs(time.time() - int(ts)) > 300: return False
        expected = hmac.new(SECRET, f"{ts}.{body.decode()}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig)
    except Exception:
        return False


@csrf_exempt
def svdpay_webhook(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        if data.get('status') == 'success':
            # Logic to handle background verification
            return JsonResponse({'message': 'Webhook processed'}, status=200)
        return JsonResponse({'message': 'Event ignored'}, status=200)
    return JsonResponse({'error': 'Invalid request method'}, status=405)


# --- Marketplace Views ---

def book_list(request):
    query = request.GET.get('q')
    listings = Listing.objects.filter(is_available=True)
    if query:
        listings = listings.filter(book__title__icontains=query)
    return render(request, 'marketplace/book_list.html', {'listings': listings, 'query': query})


def order_checkout(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)
    if request.method == 'POST':
        form = CheckoutForm(request.POST)
        if form.is_valid():
            quantity = form.cleaned_data.get('quantity', 1)
            phone = form.cleaned_data['phone_number']

            # Normalize Phone for Twilio/API
            if phone.startswith('0'):
                phone = '+233' + phone[1:]
            elif not phone.startswith('+'):
                phone = '+' + phone

            request.session['checkout_info'] = {**form.cleaned_data, 'phone_number': phone}
            request.session['listing_id'] = listing.id

            payload = {
                "amount": float(listing.price) * quantity,
                "currency": "GHS",
                "description": f"Payment for {quantity}x {listing.book.title}",
                "customer_phone": phone,
                "customer_name": form.cleaned_data['full_name'],
                "callback_url": "https://shellboks.app/checkout-success/",
                "return_url": "https://shellboks.app/checkout-success/",
                "reference": str(uuid.uuid4())
            }
            headers = {"Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}", "Content-Type": "application/json"}
            response = requests.post("https://api.svdpay.com/api/v1/payments/initialize/", headers=headers,
                                     json=payload)

            if response.status_code == 200:
                return redirect(response.json().get('data', {}).get('checkout_url'))
            messages.error(request, "Payment initialization failed.")
    return render(request, 'marketplace/checkout.html', {'form': CheckoutForm(), 'listing': listing})


def checkout_success(request):
    reference = request.GET.get('ref') or request.GET.get('reference')
    listing_id = request.session.get('listing_id')
    checkout_data = request.session.get('checkout_info')

    if not reference or not listing_id or not checkout_data:
        return redirect('book_list')

    # 1. Verify Payment
    headers = {"Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}"}
    response = requests.get(f"https://api.svdpay.com/api/v1/payments/{reference}/verify/", headers=headers).json()

    if response.get('status') in [True, 'success']:
        listing = get_object_or_404(Listing, id=listing_id)
        order = Order.objects.create(
            listing=listing,
            buyer_name=checkout_data['full_name'],
            phone_number=checkout_data['phone_number'],
            email=checkout_data.get('email', ''),
            quantity=checkout_data.get('quantity', 1),
            status='PAID'
        )

        # 2. Email Confirmation
        try:
            send_mail('Order Confirmation', f"Order Success! Ref: {reference}", settings.EMAIL_HOST_USER, [order.email])
        except Exception as e:
            print(f"Email failed: {e}")

        # 3. WhatsApp Notification to Seller
        try:
            seller_phone = order.listing.seller.profile.phone_number
            client = Client(os.environ.get('TWILIO_ACCOUNT_SID'), os.environ.get('TWILIO_AUTH_TOKEN'))
            client.messages.create(
                body=f"✅ New Order! {order.buyer_name} purchased {order.quantity} x '{order.listing.book.title}'.",
                from_='whatsapp:' + os.environ.get('TWILIO_PHONE_NUMBER'),
                to='whatsapp:' + seller_phone
            )
        except Exception as e:
            print(f"WhatsApp failed: {e}")

        request.session.flush()
        return render(request, 'marketplace/success.html', {'order': order})

    return render(request, 'marketplace/failed.html', {'error': 'Verification failed.'})