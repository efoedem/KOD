from django.contrib import admin
from django.urls import path, reverse
from django.shortcuts import render
from django.db.models import Count, Sum
from django.utils.html import format_html
from import_export.admin import ImportExportModelAdmin
from .models import Book, Listing, Order, Profile, School

# 1. Define the Custom Admin Site
class MarketplaceAdminSite(admin.AdminSite):
    site_header = 'Marketplace Administration'
    site_title = 'Marketplace Admin'
    index_title = 'Marketplace Management'

    def has_permission(self, request):
        return request.user.is_active and request.user.is_staff

# 2. Instantiate the custom site
marketplace_admin = MarketplaceAdminSite(name='marketplace_admin')

# 3. Custom Dashboard View
def order_stats_view(request):
    books = Book.objects.all()
    selected_book_id = request.GET.get('book_id')
    stats = None

    if selected_book_id:
        stats = Order.objects.filter(listing__book_id=selected_book_id).aggregate(
            total_orders=Count('id'),
            total_revenue=Sum('listing__price')
        )

    context = {
        'books': books,
        'selected_book_id': int(selected_book_id) if selected_book_id else None,
        'stats': stats,
        **marketplace_admin.each_context(request),
    }
    return render(request, 'admin/order_stats.html', context)

# 4. Model Registrations
@admin.register(Book, site=marketplace_admin)
class BookAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'added_by')

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

@admin.register(Order, site=marketplace_admin)
class OrderAdmin(ImportExportModelAdmin):
    list_display = ('listing_title', 'buyer_name', 'phone_number', 'school', 'level', 'course', 'status', 'created_at', 'stats_button')
    list_filter = ('listing__book__title', 'school', 'course', 'status', 'created_at')

    def listing_title(self, obj):
        return obj.listing.book.title

    # Adds a button to the list view to navigate to stats
    def stats_button(self, obj):
        url = reverse('marketplace_admin:order-stats')
        return format_html('<a class="button" href="{}">View Stats</a>', url)
    stats_button.short_description = "Dashboard"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('stats/', self.admin_site.admin_view(order_stats_view), name='order-stats'),
        ]
        return custom_urls + urls

@admin.register(Profile, site=marketplace_admin)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'full_name')

@admin.register(School, site=marketplace_admin)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)