from django.urls import path

from . import views

urlpatterns = [
    # ─── Utilisateurs ──────────────────────────────────────────────────────────
    path("utilisateurs/", views.utilisateurs, name="utilisateurs"),
    path(
        "utilisateurs/<int:pk>/",
        views.utilisateur_detail,
        name="utilisateur-detail",
    ),
    path("login/", views.se_connecter, name="login"),
    path("logout/", views.se_deconnecter, name="logout"),
    path("me/", views.utilisateur_courant, name="utilisateur-courant"),
    path("admin/check/", views.admin_check, name="admin-check"),

    # ─── Historique de trajets par utilisateur ─────────────────────────────────
    # GET  /api/users/trips/           → historique de l'utilisateur connecté
    #                                       (admin: ?user_id=<id> pour un tiers)
    path("users/trips/", views.trip_history_list, name="trip-history-list"),

    # GET  /api/users/trips/<trip_id>/ → détails complets d'un trajet spécifique
    path(
        "users/trips/<int:pk>/",
        views.trip_history_detail,
        name="trip-history-detail",
    ),
]
