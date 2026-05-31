from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = "Creer un utilisateur admin par defaut pour les tests"

    def handle(self, *args, **options):
        # Create admin user if not exists
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser(
                username="admin",
                email="admin@taxibeako.mg",
                password="admin123",
                first_name="Admin",
                last_name="TaxiBeAko",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    "Utilisateur admin cree avec succes!\n"
                    "Identifiants: admin / admin123"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING("L'utilisateur admin existe deja.")
            )