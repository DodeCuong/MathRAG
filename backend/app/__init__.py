import os

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

load_dotenv()
db = SQLAlchemy()


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ["DATABASE_URL"]
    app.config["MAX_CONTENT_LENGTH"] = 20 * 1024 * 1024  # 20MB upload limit
    CORS(app, origins=os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"))
    db.init_app(app)

    from . import models  # noqa: F401  register tables
    from .auth import bp as auth_bp
    from .documents import bp as documents_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")

    @app.get("/api/health")
    def health():
        return {"ok": True}

    return app
