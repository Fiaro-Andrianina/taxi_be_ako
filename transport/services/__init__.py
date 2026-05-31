from .common import Edge, TrajetIntrouvable, calculer_distance
from .baseline import AlgorithmeSearchBaseline
from .optimized import AlgorithmeSearchOptimized

# Alias pour compatibilité avec l'ancien import
AlgorithmeRecherche = AlgorithmeSearchOptimized

__all__ = [
    'TrajetIntrouvable',
    'Edge',
    'calculer_distance',
    'AlgorithmeSearchBaseline',
    'AlgorithmeSearchOptimized',
    'AlgorithmeRecherche',  # Pour compatibilité
]
