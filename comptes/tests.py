import json

from django.contrib.auth.models import User
from django.test import TestCase

from .models import ProfilUtilisateur


class UtilisateurPermissionsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="admin",
            password="pass12345",
            email="admin@example.com",
        )
        ProfilUtilisateur.objects.create(
            user=self.admin,
            role=ProfilUtilisateur.ROLE_ADMIN,
        )
        self.client_user = User.objects.create_user(
            username="client",
            password="pass12345",
            email="client@example.com",
        )
        ProfilUtilisateur.objects.create(
            user=self.client_user,
            role=ProfilUtilisateur.ROLE_CLIENT,
        )
        self.other_user = User.objects.create_user(
            username="other",
            password="pass12345",
            email="other@example.com",
        )
        ProfilUtilisateur.objects.create(
            user=self.other_user,
            role=ProfilUtilisateur.ROLE_CLIENT,
        )

    def test_user_list_requires_admin(self):
        response = self.client.get("/api/utilisateurs/")
        self.assertEqual(response.status_code, 401)

        self.client.force_login(self.client_user)
        response = self.client.get("/api/utilisateurs/")
        self.assertEqual(response.status_code, 403)

        self.client.force_login(self.admin)
        response = self.client.get("/api/utilisateurs/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 3)

    def test_user_detail_is_private_to_owner_or_admin(self):
        response = self.client.get(f"/api/utilisateurs/{self.client_user.id}/")
        self.assertEqual(response.status_code, 401)

        self.client.force_login(self.other_user)
        response = self.client.get(f"/api/utilisateurs/{self.client_user.id}/")
        self.assertEqual(response.status_code, 403)

        self.client.force_login(self.client_user)
        response = self.client.get(f"/api/utilisateurs/{self.client_user.id}/")
        self.assertEqual(response.status_code, 200)

        self.client.force_login(self.admin)
        response = self.client.get(f"/api/utilisateurs/{self.client_user.id}/")
        self.assertEqual(response.status_code, 200)

    def test_non_admin_cannot_promote_their_role(self):
        self.client.force_login(self.client_user)
        response = self.client.patch(
            f"/api/utilisateurs/{self.client_user.id}/",
            data=json.dumps({"role": ProfilUtilisateur.ROLE_ADMIN}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.client_user.profil_taxi.refresh_from_db()
        self.assertEqual(self.client_user.profil_taxi.role, ProfilUtilisateur.ROLE_CLIENT)

    def test_admin_can_update_user_role(self):
        self.client.force_login(self.admin)
        response = self.client.patch(
            f"/api/utilisateurs/{self.client_user.id}/",
            data=json.dumps({"role": ProfilUtilisateur.ROLE_ADMIN}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.client_user.profil_taxi.refresh_from_db()
        self.assertEqual(self.client_user.profil_taxi.role, ProfilUtilisateur.ROLE_ADMIN)
