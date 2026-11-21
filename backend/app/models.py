"""SQLAlchemy models: users, documents (schema in PLAN.md). Owner: Thành (day 2)."""
from datetime import datetime, timezone

from . import db


def _now():
    return datetime.now(timezone.utc)


# Added early by Dương because auth (day 3) needs it; Thành adds Document here.
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    google_sub = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=_now, nullable=False)

    def to_dict(self):
        return {"id": self.id, "email": self.email, "name": self.name}
