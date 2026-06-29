from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from .models import Book, Listing, Order, Profile

# 1. Define the custom Admin Site
class MarketplaceAdminSite(admin.AdminSite):
    site_header = 'Marketplace Administration'
    site_title = 'Marketplace Admin'
    index_title = 'Marketplace Management'

    # This allows any user with "Staff" status to log into this admin panel
    # without requiring them to be a Superuser.
    def has_permission(self, request):
        return request.user.is_active and request.user.is_staff

# 2. Instantiate the custom site
marketplace_admin = MarketplaceAdminSite(name='marketplace_admin')

# 3. Define Admin Classes
# 3. Define Admin Classes
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'added_by')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(added_by=request.user)

    # Indent this method so it belongs to BookAdmin
    def save_model(self, request, obj, form, change):
        if not obj.pk:  # Only set on creation
            obj.added_by = request.user
        super().save_model(request, obj, form, change)

class ListingAdmin(admin.ModelAdmin):
    list_display = ('book', 'price', 'condition', 'is_available')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(book__added_by=request.user)
class OrderAdmin(ImportExportModelAdmin):
    list_display = ('listing_title', 'buyer_name', 'phone_number', 'email', 'status', 'created_at')
    list_filter = ('listing__book__title', 'status', 'created_at')

    def listing_title(self, obj):
        return obj.listing.book.title

class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name')

# 4. Register models to the custom site
marketplace_admin.register(Book, BookAdmin)
marketplace_admin.register(Listing, ListingAdmin)
marketplace_admin.register(Order, OrderAdmin)
marketplace_admin.register(Profile, ProfileAdmin)