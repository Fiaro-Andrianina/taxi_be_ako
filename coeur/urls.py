from django.urls import path

from . import views

urlpatterns = [
    path("", views.accueil, name="accueil"),
    path("health/", views.health, name="health"),
    path("stats/", views.statistiques, name="statistiques"),
]
