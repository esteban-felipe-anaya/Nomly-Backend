from rest_framework.test import APITestCase

from .models import User


class AuthContractTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="sofia@example.com", password="password", name="Sofia"
        )

    def test_login_returns_token_and_user(self):
        res = self.client.post(
            "/auth/login",
            {"email": "sofia@example.com", "password": "password"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["email"], "sofia@example.com")
        self.assertEqual(set(res.data["user"]), {"id", "name", "email", "phone", "avatar"})

    def test_login_bad_password_is_400(self):
        res = self.client.post(
            "/auth/login",
            {"email": "sofia@example.com", "password": "nope"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_register_returns_token_and_user(self):
        res = self.client.post(
            "/auth/register",
            {"name": "New", "email": "new@example.com", "password": "secret"},
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        self.assertIn("token", res.data)
        self.assertEqual(res.data["user"]["email"], "new@example.com")

    def test_me_requires_authentication(self):
        self.assertEqual(self.client.get("/auth/me").status_code, 401)

    def test_me_returns_user_with_token(self):
        token = self.client.post(
            "/auth/login",
            {"email": "sofia@example.com", "password": "password"},
            format="json",
        ).data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        res = self.client.get("/auth/me")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["email"], "sofia@example.com")
