from django import forms
from .models import Profile

class CheckoutForm(forms.Form):
    full_name = forms.CharField(max_length=255)
    phone_number = forms.CharField(max_length=15)
    email = forms.EmailField(required=False) # Optional