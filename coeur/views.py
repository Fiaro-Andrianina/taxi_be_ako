from django.http import JsonResponse

from transport.models import Arret, Ligne, TrajetHistorique


def accueil(request):
    """
    Vue d'accueil de l'API Taxi_be_ako.
    
    Retourne les informations de base sur le service et les endpoints disponibles.
    
    Args:
        request: Objet requête HTTP
        
    Returns:
        JsonResponse: JSON contenant le service, version et endpoints
    """
    return JsonResponse(
        {
            "service": "Taxi be Ako",
            "version": "1.0",
            "endpoints": {
                "transport": "/api/",
                "accounts": "/api/accounts/",
                "booking": "/api/booking/",
                "payments": "/api/payments/",
            },
        }
    )


def health(request):
    """
    Endpoint de vérification de santé du service.
    
    Utilisé pour surveiller la disponibilité du backend.
    
    Args:
        request: Objet requête HTTP
        
    Returns:
        JsonResponse: JSON avec le statut "ok" et le nom du service
    """
    return JsonResponse({"status": "ok", "service": "taxi_be_ako"})


def statistiques(request):
    """
    Endpoint de statistiques globales du service.
    
    Retourne les compteurs pour les lignes, arrêts, trajets recherchés,
    réservations et paiements.
    
    Args:
        request: Objet requête HTTP
        
    Returns:
        JsonResponse: JSON avec les différentes statistiques
    """
    try:
        from reservations.models import Reservation
        reservations_count = Reservation.objects.count()
    except ModuleNotFoundError:
        reservations_count = 0

    try:
        from paiements.models import Paiement
        paiements_count = Paiement.objects.count()
    except ModuleNotFoundError:
        paiements_count = 0

    return JsonResponse(
        {
            "lignes": Ligne.objects.count(),
            "arrets": Arret.objects.count(),
            "trajets_recherches": TrajetHistorique.objects.count(),
            "reservations": reservations_count,
            "paiements": paiements_count,
        }
    )