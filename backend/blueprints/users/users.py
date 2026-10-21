from flask import Blueprint, request, jsonify, current_app
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from .user_db import *
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

users = Blueprint("users", __name__)
instruments = Blueprint("instruments", __name__)


def serialize_user(user):
    return {
        "user_id": user["user_id"],
        "username": user["username"],
        "email": user["email"],
        "instruments": user["instruments"],
    }


@instruments.get("")
def list_instruments():
    return jsonify({"Instruments": [dict(row) for row in get_instruments()]}), 200

'''
    Endpoint for creating a new user and inserting into the database,
    returns a message stating sign up success and a user dictionary
'''
@users.post('/signup')
def signup():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"Error": "A JSON object is required"}), 400
    for field in ("username", "password", "email"):
        if not isinstance(data.get(field), str) or not data[field].strip():
            return jsonify({"Error": f"{field} is required"}), 400
    try:
        new_user = sign_up(data["username"], data["password"], data["email"],
                           data.get("instrument_ids"))
    except InstrumentSelectionError as error:
        current_app.logger.warning("Signup rejected: %s", error)
        return jsonify({"Error": str(error)}), 400
    except IntegrityError:
        current_app.logger.warning("Signup rejected due to a database constraint conflict")
        return jsonify({"Error": "Account could not be created. Username or email may already exist, or an instrument is no longer available."}), 400
    except SQLAlchemyError:
        current_app.logger.error("Database failure during signup")
        return jsonify({"Error": "Unable to create account. Please try again."}), 500

    access_token = create_access_token(identity=str(new_user["user_id"]))

    return jsonify({"Message": "Account creation successful!",
                    "User": serialize_user(new_user),
                    "Token": access_token}), 201


# Replace the authenticated user's complete instrument selection atomically.
@users.post('/update_instruments')
@jwt_required()
def update_instruments():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"Error": "A JSON object is required"}), 400
    try:
        user_id = get_jwt_identity()
        user = update_user_instruments(user_id, data.get("instrument_ids"))
    except InstrumentSelectionError as error:
        current_app.logger.warning("Instrument update rejected: %s", error)
        return jsonify({"Error": str(error)}), 400
    except IntegrityError:
        current_app.logger.warning("Instrument update rejected due to a database constraint conflict")
        return jsonify({"Error": "An instrument is no longer available. Reload and try again."}), 409
    except SQLAlchemyError:
        current_app.logger.error("Database failure while updating instruments")
        return jsonify({"Error": "Unable to save instruments. Please try again."}), 500
    if user is None:
        return jsonify({"Error": "The user cannot be found"}), 404
    return jsonify({"Message": "Instruments updated successfully!",
                    "User": serialize_user(user)}), 200


'''
    Log in and return account information, instruments, and an access token.
'''
@users.post('/login')
def login():
    data = request.json
    user = get_user(data["username"], data["password"])
    if not user:
        return jsonify({"Error": "Invalid username or password"}), 401

    access_token = create_access_token(identity=str(user["user_id"]))

    return jsonify({"Message": "Login Successful!",
                    "User": serialize_user(user),
                    "Token": access_token}), 200


'''
    Endpoint for deleting a user from the database, returns the messsage 
    for deletion status
'''
@users.delete('/delete_user')
@jwt_required()
def delete():
    data = request.json
    user_id = get_jwt_identity()
    success = delete_user(user_id, data["password"])
    if not success:
        return jsonify({"Error": "Delete Failed"}), 401
    return jsonify({"Message": "Account delete successful!"}), 200


'''
    Endpoint for updating username, returns the message for whether the username
    update was successful or not.
'''
@users.post('/update_username')
@jwt_required()
def update_user():
    data = request.json
    user_id = get_jwt_identity()
    status = update_username(user_id, data["new_user"])

    if status == "user_not_found":
        return jsonify({"Error": "The user cannot be found"}), 404
    elif status == "new_username_exists":
        return jsonify({"Error": "The new username is already taken"}), 409
    return jsonify({"Message": "Username update successful!"}), 200


'''
    Endpoint for updating password, returns the message for whether the password
    update was successful or not.
'''
@users.post('/update_password')
@jwt_required()
def update_pass():
    data = request.json
    user_id = get_jwt_identity()
    success = update_password(
        user_id, data["old_password"], data["new_password"])
    if not success:
        return jsonify({"Error": "Password update failed"}), 400
    return jsonify({"Message": "Password update successful!"}), 200


'''
    Endpoint for getting all users in the database, returns message for whether retrieval
    was successful.
'''
@users.get('/get_users')
@jwt_required()
def get_users():
    users = get_all_users()
    if users is None:
        return jsonify({"Error": "Database error"}), 500
    return jsonify({"Message": "Successful retrieval of users!",
                    "Users": [{"username": user["username"], "user_id": user["user_id"]} for user in users]}), 200


'''
    Endpoint for retrieving the user based on the token passed in, returns 
    whether user retrieval was successful and the user dictionary
'''
@users.get('/profile')
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"Error": "Authentication error, user not retrieved"}), 404
    safe_user = serialize_user(user)
    return jsonify({"Message": "User successfully retrieved!",
                    "User": safe_user})
