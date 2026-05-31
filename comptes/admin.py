from django.contrib import admin

from .models import ProfilUtilisateur, TripHistory, TripLeg


class TripLegInline(admin.TabularInline):
    """Affiche les étapes en inline dans l'admin du TripHistory."""
    model = TripLeg
    extra = 0
    readonly_fields = ["arret", "ligne", "ordre"]
    fields = ["ordre", "arret", "ligne"]
    can_delete = False


@admin.register(TripHistory)
class TripHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "depart",
        "arrivee",
        "nb_changements",
        "duree_minutes",
        "prix",
        "date_voyage",
        "date_creation",
        "est_explicite",
        "est_supprime",
    ]
    list_filter = [
        "est_explicite",
        "est_supprime",
        "point_accrochage",
        "date_voyage",
        "date_creation",
    ]
    search_fields = [
        "user__username",
        "user__email",
        "depart__nom",
        "arrivee__nom",
    ]
    list_select_related = ["user", "depart", "arrivee"]
    readonly_fields = ["date_creation", "date_modification"]
    inlines = [TripLegInline]
    date_hierarchy = "date_creation"


@admin.register(TripLeg)
class TripLegAdmin(admin.ModelAdmin):
    list_display = ["trip_history", "ordre", "arret", "ligne"]
    list_filter = ["arret"]
    search_fields = ["arret__nom", "ligne__numero"]
    list_select_related = ["trip_history", "arret", "ligne"]


@admin.register(ProfilUtilisateur)
class ProfilUtilisateurAdmin(admin.ModelAdmin):
    list_display = ["user", "role", "telephone", "date_creation"]
    list_filter = ["role"]
    search_fields = ["user__username", "user__email", "telephone"]
