from django.db import models
from django.contrib.auth.models import User
from django.contrib.auth.models import User

class Book(models.Model):
    isbn = models.CharField(max_length=13, unique=True)
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    course_code = models.CharField(max_length=20)

    def __str__(self):
        return self.title

from django.db import models
from django.contrib.auth.models import User

class Listing(models.Model):
    CONDITION_CHOICES = [('NEW', 'New'), ('GOOD', 'Good'), ('WORN', 'Worn')]
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    book = models.ForeignKey('Book', on_delete=models.CASCADE) # Ensure 'Book' is defined
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)
    price = models.DecimalField(max_digits=6, decimal_places=2)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    image = models.ImageField(upload_to='book_images/', blank=True, null=True)

    def __str__(self):
        return f"{self.book.title} - {self.seller.username}"

    @property
    def formatted_price(self):
        """Returns the price formatted as Ghana Cedis."""
        return f"GH₵ {self.price}"
class Order(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    buyer_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    status = models.CharField(max_length=20, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    # Add this field
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        return f"{self.quantity}x {self.listing.book.title} by {self.buyer_name}"

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=15)

    def __str__(self):
        return self.full_name