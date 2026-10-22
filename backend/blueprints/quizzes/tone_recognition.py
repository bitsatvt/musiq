import random
from functools import cmp_to_key
from threading import Lock
from uuid import uuid4

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required


quizzes = Blueprint("quizzes", __name__)
NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]
# Active quizzes are temporary and are not written to the database.
active_quizzes = {}
quiz_lock = Lock()


# Choose a target note and three incorrect choices, then reset question state.
def generate_question(quiz):
    correct = random.choice(NOTES)
    random_order = cmp_to_key(lambda a, b: -1 if random.random() > 0.5 else 1)
    incorrect = sorted((note for note in NOTES if note != correct), key=random_order)[:3]
    quiz["note"] = correct
    quiz["choices"] = sorted(incorrect + [correct], key=random_order)
    quiz["wrong"] = False
    quiz["answered_correctly"] = False


# Return the quiz fields needed for playback and display.
def quiz_response(quiz_id, quiz):
    return jsonify({"quiz_id": quiz_id, **{
        key: quiz[key] for key in (
            "current_question", "total_correct", "finished", "note",
            "choices", "answered_correctly",
        )
    }})


# Create an in-memory quiz for the authenticated user.
@quizzes.post("/tone-recognition/start")
@jwt_required()
def start_quiz():
    user_id = get_jwt_identity()
    quiz_id = str(uuid4())
    quiz = {"user_id": user_id, "current_question": 1,
            "total_correct": 0, "finished": False}
    generate_question(quiz)
    with quiz_lock:
        # Completed results need only live until this user starts another quiz.
        for old_id in list(active_quizzes):
            old = active_quizzes[old_id]
            if old["user_id"] == user_id and old["finished"]:
                del active_quizzes[old_id]
        active_quizzes[quiz_id] = quiz
    return quiz_response(quiz_id, quiz)


# Check an answer or advance the quiz while preventing duplicate score updates.
@quizzes.post("/tone-recognition/<quiz_id>/<action>")
@jwt_required()
def update_quiz(quiz_id, action):
    if action not in ("answer", "next"):
        return jsonify({"Error": "Unknown quiz action"}), 404
    data = request.get_json(silent=True)
    if not isinstance(data, dict) or type(data.get("current_question")) is not int:
        return jsonify({"Error": "A question number is required"}), 400
    with quiz_lock:
        quiz = active_quizzes.get(quiz_id)
        if quiz is None or quiz["user_id"] != get_jwt_identity():
            return jsonify({"Error": "Quiz not found. Please start the quiz again."}), 404
        question = data["current_question"]
        # A retried Next request must not skip a question if its response was lost.
        if action == "next" and question == quiz["current_question"] - 1:
            return quiz_response(quiz_id, quiz)
        if question != quiz["current_question"]:
            return jsonify({"Error": "This question is no longer current"}), 409
        if action == "answer":
            if data.get("choice") not in quiz["choices"]:
                return jsonify({"Error": "Choose one of the available notes"}), 400
            if not quiz["answered_correctly"]:
                if data["choice"] == quiz["note"]:
                    quiz["answered_correctly"] = True
                    if not quiz["wrong"]:
                        quiz["total_correct"] += 1
                    quiz["wrong"] = False
                else:
                    quiz["wrong"] = True
        else:
            if not quiz["answered_correctly"]:
                return jsonify({"Error": "Answer correctly before continuing"}), 409
            if quiz["current_question"] == 10:
                quiz["finished"] = True
            else:
                quiz["current_question"] += 1
                generate_question(quiz)
        return quiz_response(quiz_id, quiz)
