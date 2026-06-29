from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from .models import Book, Listing, Order, Profile

# 1. Define the custom Admin Site
class MarketplaceAdminSite(admin.AdminSite):
    site_header = 'Marketplace Administration'
    site_title = 'Marketplace Admin'
    index_title = 'Marketplace Management'

    def has_permission(self, request):
        return request.user.is_active and request.user.is_staff

# 2. Instantiate the custom site
marketplace_admin = MarketplaceAdminSite(name='marketplace_admin')

# 3. Define and Register all models using decorators
# This approach ensures models are registered exactly once to the custom site.

@admin.register(Book, site=marketplace_admin)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'added_by')

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(added_by=request.user)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.added_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Listing, site=marketplace_admin)
class ListingAdmin(admin.ModelAdmin):
    list_display = ('book', 'price', 'condition', 'is_available', 'created_at')
    exclude = ('seller',)

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.seller = request.user
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(seller=request.user)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "book" and not request.user.is_superuser:
            # Only show books added by the current user
            kwargs["queryset"] = Book.objects.filter(added_by=request.user)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

@admin.register(Order, site=marketplace_admin)
class OrderAdmin(ImportExportModelAdmin):
    list_display = ('listing_title', 'buyer_name', 'phone_number', 'email', 'status', 'created_at')
    list_filter = ('listing__book__title', 'status', 'created_at')

    def listing_title(self, obj):
        return obj.listing.book.title

@admin.register(Profile, site=marketplace_admin)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name')