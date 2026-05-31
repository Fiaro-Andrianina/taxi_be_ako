from django.contrib import admin

from .models import Arret, Correspondance, Ligne, LigneArret, TrajetHistorique

class LigneArretInline(admin.TabularInline):
    model = LigneArret
    extra = 1
    autocomplete_fields = ["arret"]

@admin.register(Arret)
class ArretAdmin(admin.ModelAdmin):
    list_display = ["nom", "latitude", "longitude", "est_correspondance"]
    search_fields = ["nom"]

@admin.register(Ligne)
class LigneAdmin(admin.ModelAdmin):
    list_display = ["numero", "nom", "get_nb_arrets"]
    search_fields = ["numero", "nom"]
    inlines = [LigneArretInline]

@admin.register(LigneArret)
class LigneArretAdmin(admin.ModelAdmin):
    list_display = ["ligne", "ordre", "arret"]
    list_filter = ["ligne"]
    autocomplete_fields = ["ligne", "arret"]

@admin.register(Correspondance)
class CorrespondanceAdmin(admin.ModelAdmin):
    list_display = ["arret", "ligne_depart", "ligne_arrivee", "temps_estime_minutes", "est_valide"]
    list_filter = ["ligne_depart", "ligne_arrivee"]
    autocomplete_fields = ["arret", "ligne_depart", "ligne_arrivee"]

@admin.register(TrajetHistorique)
class TrajetHistoriqueAdmin(admin.ModelAdmin):
    list_display = ["depart", "arrivee", "nb_changements", "duree_minutes", "distance_km", "cree_le"]
    search_fields = ["depart__nom", "arrivee__nom"]
    filter_horizontal = ["lignes", "correspondances"]
    readonly_fields = ["cree_le"]
