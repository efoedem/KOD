import uuid
import os
import requests
import json
import hmac
import hashlib
import time
from django.contrib import messages
from .forms import CheckoutForm
import requests
import os
from django.shortcuts import render, redirect, get_object_or_404
from django.conf import settings
from django.core.mail import send_mail
from twilio.rest import Client
from .models import Order, Listing



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

    # Start with all available listings
    listings = Listing.objects.filter(is_available=True)

    # Filter by search query if provided
    if query:
        listings = listings.filter(book__title__icontains=query)

    return render(request, 'marketplace/book_list.html', {
        'listings': listings,
        'query': query
    })

def order_checkout(request, listing_id):
    listing = get_object_or_404(Listing, id=listing_id)

    if request.method == 'POST':
        form = CheckoutForm(request.POST)
        if form.is_valid():
            # Extract and validate quantity
            quantity = form.cleaned_data.get('quantity', 1)
            if quantity < 1:
                messages.error(request, "Please enter a valid quantity of at least 1.")
                return render(request, 'marketplace/checkout.html', {'form': form, 'listing': listing})

            # Save data to session
            request.session['checkout_info'] = form.cleaned_data
            request.session['listing_id'] = listing.id

            # Calculate total based on dynamic quantity
            total_amount = float(listing.price) * quantity

            payload = {
                "amount": total_amount,
                "currency": "GHS",
                "description": f"Payment for {quantity}x {listing.book.title}",
                "customer_phone": form.cleaned_data['phone_number'],
                "customer_name": form.cleaned_data['full_name'],
                "callback_url": "https://kod-psi.vercel.app/checkout-success/",
                "return_url": "https://kod-psi.vercel.app/checkout-success/",
                "reference": str(uuid.uuid4())
            }

            headers = {
                "Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}",
                "Content-Type": "application/json"
            }

            try:
                response = requests.post("https://api.svdpay.com/api/v1/payments/initialize/",
                                         headers=headers, json=payload, timeout=15)

                if response.status_code == 200:
                    checkout_url = response.json().get('data', {}).get('checkout_url')
                    return redirect(checkout_url)  # Instant redirect
                else:
                    messages.error(request, "Payment initialization failed. Please try again.")
            except Exception as e:
                messages.error(request, "A connection error occurred.")

    else:
        form = CheckoutForm()

    return render(request, 'marketplace/checkout.html', {'form': form, 'listing': listing})


def checkout_success(request):
    # 1. Get transaction details from request/session
    reference = request.GET.get('ref') or request.GET.get('reference')
    listing_id = request.session.get('listing_id')
    checkout_data = request.session.get('checkout_info')

    if not reference or not listing_id or not checkout_data:
        return redirect('book_list')

    # 2. Payment Verification Logic
    url = f"https://api.svdpay.com/api/v1/payments/{reference}/verify/"
    headers = {"Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}"}

    try:
        response = requests.get(url, headers=headers).json()
    except Exception as e:
        return render(request, 'marketplace/failed.html', {'error': 'Verification connection failed.'})

    if response.get('status') in [True, 'success']:
        # 3. Create the Order
        listing = get_object_or_404(Listing, id=listing_id)
        order = Order.objects.create(
            listing=listing,
            buyer_name=checkout_data['full_name'],
            phone_number=checkout_data['phone_number'],
            email=checkout_data.get('email', ''),
            quantity=checkout_data.get('quantity', 1),
            status='PAID'
        )

        # 4. Send Email Confirmation
        try:
            send_mail(
                'Order Confirmation',
                f"Success! You ordered {order.quantity} copy/copies. Ref: {reference}",
                settings.EMAIL_HOST_USER,
                [order.email]
            )
        except Exception as e:
            print(f"Email failed: {e}")

        # 5. Trigger WhatsApp Notification to Seller
        try:
            account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
            auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
            from_number = 'whatsapp:' + os.environ.get('TWILIO_PHONE_NUMBER')
            # Ensure seller has a profile and a phone number
            seller_phone = order.listing.seller.profile.phone_number
            to_number = 'whatsapp:' + seller_phone

            client = Client(account_sid, auth_token)
            client.messages.create(
                body=f"✅ New Order! {order.buyer_name} purchased {order.quantity} x '{order.listing.book.title}'. Order ID: {order.id}.",
                from_=from_number,
                to=to_number
            )
        except Exception as e:
            print(f"WhatsApp notification failed: {e}")

        # 6. Cleanup and Finalize
        request.session.flush()
        return render(request, 'marketplace/success.html', {'order': order})

    return render(request, 'marketplace/failed.html', {'error': 'Payment verification failed.'})