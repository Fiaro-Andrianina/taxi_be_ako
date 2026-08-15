import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from transport.services import AlgorithmeSearchOptimized
from transport.models import Arret
from transport.services.common import Edge

class TestAlgo(AlgorithmeSearchOptimized):
    def _chemin_bus_direct(self, depart_id, arrivee_id):
        return None # Force A*

algo = TestAlgo()
# find a walk edge
walk_edges = []
for k, edges in algo.graphe.items():
    for e in edges:
        if e.mode == "walk":
            walk_edges.append((k, e.destination_id))

if walk_edges:
    start, end = walk_edges[0]
    print(f"Testing walk from {start} to {end}")
    try:
        algo.calculer_trajet(start, end)
        print("Success!")
    except Exception as e:
        print(f"Failed: {e}")
