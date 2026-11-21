import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.update(DATABASE_URL="sqlite://", JWT_SECRET="test-secret-at-least-32-bytes-long!!", GOOGLE_CLIENT_ID="test-client")

from app import auth, create_app, db  # noqa: E402

FAKE_GOOGLE = {"sub": "g-123", "email": "a@example.com", "name": "A"}


def fake_verify(credential, _request, client_id):
    assert client_id == "test-client"
    if credential != "good":
        raise ValueError("bad token")
    return FAKE_GOOGLE


def make_client():
    auth.id_token.verify_oauth2_token = fake_verify
    app = create_app()
    with app.app_context():
        db.create_all()
    return app.test_client()


def test_login_creates_user_once_and_issues_working_token():
    c = make_client()
    r1 = c.post("/api/auth/google", json={"credential": "good"})
    r2 = c.post("/api/auth/google", json={"credential": "good"})
    assert r1.status_code == 200 and r1.json["user"] == r2.json["user"]
    me = c.get("/api/auth/me", headers={"Authorization": "Bearer " + r1.json["token"]})
    assert me.status_code == 200 and me.json["user"]["email"] == "a@example.com"


def test_rejects_bad_input():
    c = make_client()
    assert c.post("/api/auth/google", json={}).status_code == 400
    assert c.post("/api/auth/google", json={"credential": "bad"}).status_code == 401
    assert c.get("/api/auth/me").status_code == 401
    assert c.get("/api/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
    print("all auth tests passed")
