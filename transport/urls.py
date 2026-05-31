from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="transport-health"),
    path("lignes/", views.lignes, name="lignes"),
    path("lignes/<int:pk>/", views.ligne_detail, name="ligne-detail"),
    path("lignes/<int:pk>/arrets/", views.ligne_arrets, name="ligne-arrets"),
    path("arrets/", views.arrets, name="arrets"),
    path("arrets/<int:pk>/", views.arret_detail, name="arret-detail"),
    path("ligne-arrets/", views.ligne_arrets_crud, name="ligne-arrets-crud"),
    path("ligne-arrets/<int:pk>/", views.ligne_arret_detail, name="ligne-arret-detail"),
    path("sync/", views.sync, name="sync"),
    path("osm-bus-stops/", views.osm_bus_stops, name="osm-bus-stops"),
    path("graphe/", views.graphe, name="graphe"),
    path("trajet/", views.trajet, name="trajet"),
    path("trajets/historique/", views.historique_trajets, name="historique-trajets"),
]
