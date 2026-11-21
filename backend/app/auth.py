"""Google login -> JWT, and @login_required. Owner: Dương."""
import os
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import Blueprint, g, request
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from . import db
from .models import User

bp = Blueprint("auth", __name__)
TOKEN_TTL = timedelta(days=7)


def _secret():
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    return secret


@bp.post("/google")
def google_login():
    credential = (request.get_json(silent=True) or {}).get("credential")
    if not credential:
        return {"error": "Thiếu credential"}, 400
    try:
        info = id_token.verify_oauth2_token(
            credential, google_requests.Request(), os.environ["GOOGLE_CLIENT_ID"]
        )
    except ValueError:
        return {"error": "Token Google không hợp lệ"}, 401

    user = User.query.filter_by(google_sub=info["sub"]).first()
    if user is None:
        user = User(google_sub=info["sub"], email=info["email"])
        db.session.add(user)
    user.email, user.name = info["email"], info.get("name")
    db.session.commit()

    token = jwt.encode(
        {"sub": str(user.id), "exp": datetime.now(timezone.utc) + TOKEN_TTL},
        _secret(),
        algorithm="HS256",
    )
    return {"token": token, "user": user.to_dict()}


def login_required(fn):
    """Sets g.user_id from 'Authorization: Bearer <jwt>', else 401."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return {"error": "Chưa đăng nhập"}, 401
        try:
            payload = jwt.decode(header[7:], _secret(), algorithms=["HS256"])
        except jwt.InvalidTokenError:
            return {"error": "Phiên đăng nhập hết hạn"}, 401
        g.user_id = int(payload["sub"])
        return fn(*args, **kwargs)

    return wrapper


@bp.get("/me")
@login_required
def me():
    user = db.session.get(User, g.user_id)
    if user is None:
        return {"error": "Không tìm thấy user"}, 401
    return {"user": user.to_dict()}
