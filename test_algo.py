import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from transport.services import AlgorithmeRecherche, AlgorithmeSearchBaseline
from transport.models import Arret
import random

algo = AlgorithmeRecherche()
baseline = AlgorithmeSearchBaseline()

stops = list(Arret.objects.all())
random.seed(42)
pairs = [(random.choice(stops), random.choice(stops)) for _ in range(500)]

failures_algo = 0
failures_base = 0

for s1, s2 in pairs:
    if s1.id == s2.id: continue
    
    ok_algo = False
    ok_base = False
    
    try:
        algo.calculer_trajet(s1.id, s2.id)
        ok_algo = True
    except Exception:
        failures_algo += 1
        
    try:
        baseline.calculer_trajet(s1.id, s2.id)
        ok_base = True
    except Exception:
        failures_base += 1
        
    if ok_base and not ok_algo:
        print(f"BUG! Baseline succeeds, Algo fails: {s1.nom} -> {s2.nom}")

print(f"Total tested: {len(pairs)}")
print(f"Algo failures: {failures_algo}, Base failures: {failures_base}")
