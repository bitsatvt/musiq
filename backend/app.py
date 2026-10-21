from flask import Flask
from blueprints.users.users import users, instruments
from blueprints.friends.friends import friends
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import timedelta
import os

load_dotenv()

app = Flask(__name__)

# allow frontend app to call backend auth endpoints during local development
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "DELETE", "OPTIONS"],
)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
jwt = JWTManager(app)

app.register_blueprint(users, url_prefix="/users")
app.register_blueprint(instruments, url_prefix="/instruments")
app.register_blueprint(friends, url_prefix="/friends")

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
