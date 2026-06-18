from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from .models import Book, Listing, Order, Profile  # Ensure all are imported

# Register your models here
@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author')

@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ('book', 'price', 'condition', 'is_available')

@admin.register(Order)
class OrderAdmin(ImportExportModelAdmin):
    # If you have OrderResource defined, make sure it is defined ABOVE this class
    list_display = ('listing_title', 'buyer_name', 'phone_number', 'email', 'status', 'created_at')
    list_filter = ('listing__book__title', 'status', 'created_at')

    def listing_title(self, obj):
        return obj.listing.book.title

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name')