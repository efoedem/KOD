from django.contrib import admin
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from .models import Book, Listing, Order

# Define the custom resource for export
class OrderResource(resources.ModelResource):
    book_title = fields.Field(attribute='listing__book__title', column_name='Book Title')

    class Meta:
        model = Order
        fields = ('book_title', 'buyer_name', 'phone_number', 'email', 'status', 'created_at')

@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author') # Add other fields as needed

@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ('book', 'price', 'condition', 'is_available')

@admin.register(Order)
class OrderAdmin(ImportExportModelAdmin):
    resource_class = OrderResource
    list_display = ('listing_title', 'buyer_name', 'phone_number', 'email', 'status', 'created_at')
    list_filter = ('listing__book__title', 'status', 'created_at')

    def listing_title(self, obj):
        return obj.listing.book.title
    listing_title.short_description = "Book Title"