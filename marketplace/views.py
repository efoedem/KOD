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
from .models import Order, Listing,School
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

    # Define your dropdown lists
    levels = ["100", "200", "300", "400", "Postgraduate"]

    courses = [
        "BSc. Renewable Energy Engineering", "BSc. Petroleum Engineering",
        "BSc. Agricultural Engineering", "BSc. Electrical & Electronic Engineering",
        "BSc. Computer Engineering", "BSc. Mechanical Engineering",
        "BSc. Civil Engineering", "BSc. Environmental Engineering",
        "BSc. Computer Science", "BSc. Information Technology",
        "BSc. Nursing", "BSc. Medical Laboratory Sciences",
        "BSc. Actuarial Science", "BSc. Statistics",
        "BSc. Biological Science", "BSc. Biochemistry",
        "BSc. Chemistry", "BSc. Mathematics",
        "Diploma in Geoinformation Science", "Diploma in Geomatics",
        "BSc Applied Meteorology and Climate Science", "BSc Climate Change and Sustainable Development",
        "BSc Geo-Environmental Science", "BSc Geoinformation Science",
        "BSc Geomatics", "BSc Planning and Sustainability",
        "BSc Resource Enterprise & Entrepreneurship", "BSc. Accounting",
        "BSc. Economics", "BSc Development Minerals Mining",
        "BSc Urban Mining", "BSc Sustainable Mining",
        "BSc Sustainable Land Management", "BSc Resource and Development Planning",
        "Diploma Natural Resources Management", "Diploma Fire, Safety and Disaster Management",
        "BSc Aquaculture and Aquatic Resources Management", "BSc Environmental Resources Management and Sustainability",
        "BSc Fire, Safety and Disaster Management", "BSc Hospitality Management",
        "BSc Natural Resources Management"
    ]

    if request.method == 'POST':
        # Capture all form data
        form_data = {
            'full_name': request.POST.get('full_name'),
            'phone_number': request.POST.get('phone_number'),
            'school': request.POST.get('school'),
            'level': request.POST.get('level'),
            'course': request.POST.get('course'),
            'quantity': int(request.POST.get('quantity', 1))
        }

        # Normalize Phone
        phone = form_data['phone_number']
        if phone.startswith('0'):
            phone = '+233' + phone[1:]
        elif not phone.startswith('+'):
            phone = '+' + phone
        form_data['phone_number'] = phone

        request.session['checkout_info'] = form_data
        request.session['listing_id'] = listing.id

        payload = {
            "amount": float(listing.price) * form_data['quantity'],
            "currency": "GHS",
            "description": f"Payment for {form_data['quantity']}x {listing.book.title}",
            "customer_phone": phone,
            "customer_name": form_data['full_name'],
            "callback_url": "https://shellbooks.app/checkout-success/",
            "return_url": "https://shellbooks.app/checkout-success/",
            "reference": str(uuid.uuid4())
        }

        headers = {"Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}", "Content-Type": "application/json"}
        response = requests.post("https://api.svdpay.com/api/v1/payments/initialize/", headers=headers, json=payload)

        if response.status_code == 200:
            return redirect(response.json().get('data', {}).get('checkout_url'))
        messages.error(request, "Payment initialization failed.")

    return render(request, 'marketplace/checkout.html', {
        'listing': listing,
        'schools': School.objects.all(),
        'courses': courses,
        'levels': levels
    })

def checkout_success(request):
    reference = request.GET.get('ref') or request.GET.get('reference')
    listing_id = request.session.get('listing_id')
    checkout_data = request.session.get('checkout_info')

    if not reference or not listing_id or not checkout_data:
        return redirect('book_list')

    # Verification Logic...
    headers = {"Authorization": f"Bearer {settings.SDVPAY_SECRET_KEY}"}
    response = requests.get(f"https://api.svdpay.com/api/v1/payments/{reference}/verify/", headers=headers).json()

    if response.get('status') in [True, 'success']:
        listing = get_object_or_404(Listing, id=listing_id)

        # Save the new fields here
        order = Order.objects.create(
            listing=listing,
            buyer_name=checkout_data['full_name'],
            phone_number=checkout_data['phone_number'],
            school_id=checkout_data['school'],  # Saving the ID
            level=checkout_data['level'],
            course=checkout_data['course'],
            quantity=checkout_data['quantity'],
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