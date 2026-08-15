import json

from django.db import models, transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .models import Arret, Ligne, LigneArret, TrajetHistorique
from .permissions import admin_required
from .serializers import (
    arret_to_dict,
    graphe_to_dict,
    historique_to_dict,
    ligne_to_dict,
    sync_to_dict,
    trajet_to_dict,
)
from .services import AlgorithmeRecherche, TrajetIntrouvable, AlgorithmeSearchBaseline, AlgorithmeSearchOptimized


def health(request):
    return JsonResponse({"status": "ok", "service": "taxi_be_ako"})


def osm_bus_stops(request):
    """Expose l'index des arrêts bus OSM pour aligner la carte Leaflet."""
    if request.method != "GET":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)

    from .services.stop_geocoding import get_osm_index

    try:
        osm_index = get_osm_index()
    except Exception:
        osm_index = {}

    index = {
        key: [{"nom": label, "lat": lat, "lng": lng} for label, lat, lng in items]
        for key, items in osm_index.items()
    }
    return JsonResponse(
        {
            "index": index,
            "count": sum(len(items) for items in index.values()),
        }
    )


# ── LIGNE WRITE VIEWS ────────────────────────────────────────────────────────

@admin_required
@csrf_exempt
def lignes(request):
    if request.method == "GET":
        return JsonResponse([ligne_to_dict(ligne) for ligne in Ligne.objects.all()], safe=False)

    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            ligne = Ligne.objects.create(
                numero=payload["numero"],
                nom=payload["nom"],
                description=payload.get("description", ""),
            )
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        except KeyError as exc:
            return JsonResponse({"detail": f"Champ obligatoire: {exc.args[0]}"}, status=400)
        return JsonResponse(ligne_to_dict(ligne, detail=True), status=201)

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


@admin_required
@csrf_exempt
def ligne_detail(request, pk):
    try:
        ligne = Ligne.objects.get(pk=pk)
    except Ligne.DoesNotExist:
        return JsonResponse({"detail": "Ligne introuvable"}, status=404)

    if request.method == "GET":
        return JsonResponse(ligne_to_dict(ligne, detail=True))

    if request.method in ["PUT", "PATCH"]:
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        ligne.numero = payload.get("numero", ligne.numero)
        ligne.nom = payload.get("nom", ligne.nom)
        ligne.description = payload.get("description", ligne.description)
        ligne.save()
        return JsonResponse(ligne_to_dict(ligne, detail=True))

    if request.method == "DELETE":
        ligne.delete()
        return JsonResponse({"detail": "Ligne supprimee"})

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


def ligne_arrets(request, pk):
    if request.method != "GET":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)
    arrets = Arret.objects.filter(lignearret__ligne_id=pk).order_by("lignearret__ordre")
    return JsonResponse([arret_to_dict(arret) for arret in arrets], safe=False)


# ── ARRET WRITE VIEWS ────────────────────────────────────────────────────────

@admin_required
@csrf_exempt
def arrets(request):
    if request.method == "GET":
        queryset = Arret.objects.all()
        ligne_id = request.GET.get("ligne")
        if ligne_id:
            queryset = queryset.filter(lignearret__ligne_id=ligne_id).order_by("lignearret__ordre")
        return JsonResponse([arret_to_dict(arret) for arret in queryset], safe=False)

    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            arret = Arret.objects.create(
                nom=payload["nom"],
                latitude=payload["latitude"],
                longitude=payload["longitude"],
            )
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        except KeyError as exc:
            return JsonResponse({"detail": f"Champ obligatoire: {exc.args[0]}"}, status=400)
        return JsonResponse(arret_to_dict(arret), status=201)

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


@admin_required
@csrf_exempt
def arret_detail(request, pk):
    try:
        arret = Arret.objects.get(pk=pk)
    except Arret.DoesNotExist:
        return JsonResponse({"detail": "Arret introuvable"}, status=404)

    if request.method == "GET":
        return JsonResponse(arret_to_dict(arret))

    if request.method in ["PUT", "PATCH"]:
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        arret.nom = payload.get("nom", arret.nom)
        arret.latitude = payload.get("latitude", arret.latitude)
        arret.longitude = payload.get("longitude", arret.longitude)
        arret.save()
        return JsonResponse(arret_to_dict(arret))

    if request.method == "DELETE":
        arret.delete()
        return JsonResponse({"detail": "Arret supprime"})

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


@admin_required
@csrf_exempt
def ligne_arrets_crud(request):
    if request.method == "GET":
        queryset = LigneArret.objects.select_related("ligne", "arret").all().order_by("ligne__id", "ordre")
        return JsonResponse(
            [
                {
                    "id": item.id,
                    "ligne": ligne_to_dict(item.ligne),
                    "arret": arret_to_dict(item.arret),
                    "ordre": item.ordre,
                }
                for item in queryset
            ],
            safe=False,
        )

    if request.method == "POST":
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
            ligne_id = int(payload["ligne"])
            nouvel_ordre = int(payload["ordre"])
            with transaction.atomic():
                LigneArret.objects.filter(ligne_id=ligne_id, ordre__gte=nouvel_ordre).update(
                    ordre=models.F("ordre") + 1
                )
                item = LigneArret.objects.create(
                    ligne_id=ligne_id,
                    arret_id=payload["arret"],
                    ordre=nouvel_ordre,
                )
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        except KeyError as exc:
            return JsonResponse({"detail": f"Champ obligatoire: {exc.args[0]}"}, status=400)
        except Exception as e:
            return JsonResponse({"detail": f"Erreur: {str(e)}"}, status=400)
        return JsonResponse({"id": item.id, "ordre": item.ordre}, status=201)

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


@admin_required
@csrf_exempt
def ligne_arret_detail(request, pk):
    try:
        item = LigneArret.objects.select_related("ligne", "arret").get(pk=pk)
    except LigneArret.DoesNotExist:
        return JsonResponse({"detail": "Association ligne-arret introuvable"}, status=404)

    if request.method == "GET":
        return JsonResponse(
            {
                "id": item.id,
                "ligne": ligne_to_dict(item.ligne),
                "arret": arret_to_dict(item.arret),
                "ordre": item.ordre,
            }
        )

    if request.method in ["PUT", "PATCH"]:
        try:
            payload = json.loads(request.body.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            return JsonResponse({"detail": "JSON invalide"}, status=400)
        new_ordre = payload.get("ordre", item.ordre)
        new_ligne_id = payload.get("ligne", item.ligne_id)
        if new_ordre != item.ordre or new_ligne_id != item.ligne_id:
            with transaction.atomic():
                if new_ligne_id != item.ligne_id:
                    old_ordre = item.ordre
                    old_ligne_id = item.ligne_id
                    LigneArret.objects.filter(ligne_id=old_ligne_id, ordre__gt=old_ordre).update(
                        ordre=models.F("ordre") - 1
                    )
                    item.ligne_id = new_ligne_id
                    item.ordre = new_ordre
                    LigneArret.objects.filter(ligne_id=new_ligne_id, ordre__gte=new_ordre).update(
                        ordre=models.F("ordre") + 1
                    )
                elif new_ordre > item.ordre:
                    LigneArret.objects.filter(
                        ligne_id=item.ligne_id,
                        ordre__gt=item.ordre,
                        ordre__lte=new_ordre
                    ).update(ordre=models.F("ordre") - 1)
                    item.ordre = new_ordre
                elif new_ordre < item.ordre:
                    LigneArret.objects.filter(
                        ligne_id=item.ligne_id,
                        ordre__gte=new_ordre,
                        ordre__lt=item.ordre
                    ).update(ordre=models.F("ordre") + 1)
                    item.ordre = new_ordre
                item.ligne_id = new_ligne_id
                item.arret_id = payload.get("arret", item.arret_id)
                item.save()
        else:
            item.ligne_id = payload.get("ligne", item.ligne_id)
            item.arret_id = payload.get("arret", item.arret_id)
            item.save()
        return JsonResponse({"id": item.id, "ordre": item.ordre})

    if request.method == "DELETE":
        deleted_ordre = item.ordre
        deleted_ligne_id = item.ligne_id
        item.delete()
        # Décrémenter les ordres des arrêts suivants
        LigneArret.objects.filter(ligne_id=deleted_ligne_id, ordre__gt=deleted_ordre).update(
            ordre=models.F("ordre") - 1
        )
        return JsonResponse({"detail": "Association ligne-arret supprimee"})

    return JsonResponse({"detail": "Methode non autorisee"}, status=405)


# ── READ-ONLY VIEWS (public) ─────────────────────────────────────────────────

def sync(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)
    return JsonResponse(sync_to_dict())


def graphe(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)
    data = AlgorithmeRecherche().get_graphe()
    return JsonResponse(graphe_to_dict(data))


@csrf_exempt
def trajet(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"detail": "JSON invalide"}, status=400)

    depart = payload.get("depart", payload.get("dep"))
    arrivee = payload.get("arrivee", payload.get("arr"))
    if depart is None or arrivee is None:
        return JsonResponse({"detail": "Les champs depart/arrivee sont obligatoires"}, status=400)
    if depart == arrivee:
        return JsonResponse({"detail": "Le depart et l'arrivee doivent etre differents"}, status=400)

    # Si les deux valeurs sont des entiers, on traite par ID (cas frontend legacy)
    if isinstance(depart, (int, str)) and str(depart).isdigit() and isinstance(arrivee, (int, str)) and str(arrivee).isdigit():
        depart_id, arrivee_id = int(depart), int(arrivee)
    else:
        depart_obj = Arret.objects.filter(nom__iexact=depart).first()
        if depart_obj is None:
            return JsonResponse({"detail": f"Arrêt de départ introuvable: {depart}"}, status=400)
        arrivee_obj = Arret.objects.filter(nom__iexact=arrivee).first()
        if arrivee_obj is None:
            return JsonResponse({"detail": f"Arrêt d'arrivée introuvable: {arrivee}"}, status=400)

        # Si l'arrêt n'est desservi par aucune ligne, chercher un arrêt voisin (mêmes coordonnées)
        if not LigneArret.objects.filter(arret=depart_obj).exists():
            voisin = (Arret.objects
                      .filter(latitude=depart_obj.latitude, longitude=depart_obj.longitude)
                      .exclude(id=depart_obj.id)
                      .filter(lignearret__isnull=False)
                      .distinct().first())
            if voisin:
                depart_obj = voisin
        if not LigneArret.objects.filter(arret=arrivee_obj).exists():
            voisin = (Arret.objects
                      .filter(latitude=arrivee_obj.latitude, longitude=arrivee_obj.longitude)
                      .exclude(id=arrivee_obj.id)
                      .filter(lignearret__isnull=False)
                      .distinct().first())
            if voisin:
                arrivee_obj = voisin

        depart_id, arrivee_id = depart_obj.id, arrivee_obj.id

    try:
        resultat = AlgorithmeRecherche().calculer_trajet(depart_id, arrivee_id)
    except TrajetIntrouvable as exc:
        # Cas 3 : trajet indisponible — retourner les lignes au départ et à
        # l'arrivée pour que le frontend puisse proposer des alternatives.
        try:
            depart_arret = Arret.objects.get(pk=depart_id)
            arrivee_arret = Arret.objects.get(pk=arrivee_id)
        except Arret.DoesNotExist:
            return JsonResponse({"detail": str(exc), "cas": 3}, status=404)

        dep_lines = Ligne.objects.filter(lignearret__arret_id=depart_id).distinct()
        arr_lines = Ligne.objects.filter(lignearret__arret_id=arrivee_id).distinct()
        return JsonResponse({
            "detail": str(exc),
            "cas": 3,
            "depart": arret_to_dict(depart_arret),
            "arrivee": arret_to_dict(arrivee_arret),
            "lignes_depart": [ligne_to_dict(l, detail=True) for l in dep_lines],
            "lignes_arrivee": [ligne_to_dict(l, detail=True) for l in arr_lines],
        }, status=404)

    return JsonResponse(trajet_to_dict(resultat))


def historique_trajets(request):
    if request.method != "GET":
        return JsonResponse({"detail": "Methode non autorisee"}, status=405)
    trajets = TrajetHistorique.objects.select_related("depart", "arrivee").prefetch_related(
        "lignes", "correspondances"
    )
    return JsonResponse([historique_to_dict(item) for item in trajets], safe=False)
