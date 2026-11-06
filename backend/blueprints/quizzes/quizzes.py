from threading import Lock
from time import monotonic
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.exceptions import BadRequest, Conflict, HTTPException, NotFound

from ..users.user_db import get_user_by_id
from . import tone_recognition


quizzes = Blueprint("quizzes", __name__)
QUIZ_TYPES = {"tone_recognition": tone_recognition}
ATTEMPT_TTL_SECONDS = 60 * 60
# Temporary, single-process storage until quiz_attempts is added to the database.
active_attempts = {}
attempt_lock = Lock()

# Error handling for quiz endpoints, returning JSON instead of HTML.
@quizzes.errorhandler(HTTPException)
def handle_quiz_error(error):
    return jsonify({"Error": error.description}), error.code

# Read the request body as JSON, returning a dict or raising BadRequest if not valid.
def request_data():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise BadRequest("A JSON object is required")
    return data

# Validate that the request body contains a valid question number.
def question_number(data):
    number = data.get("question_number")
    if type(number) is not int or number < 1:
        raise BadRequest("A valid question number is required")
    return number


# Called while holding attempt_lock; cleanup runs when quiz requests come in.
def remove_expired_attempts(now):
    for attempt_id, attempt in list(active_attempts.items()):
        if now - attempt["last_activity"] >= ATTEMPT_TTL_SECONDS:
            del active_attempts[attempt_id]


# Called while holding attempt_lock so ownership checks and updates stay together.
def get_attempt(attempt_id):
    now = monotonic()
    remove_expired_attempts(now)
    attempt = active_attempts.get(attempt_id)
    if attempt is None or attempt["user_id"] != get_jwt_identity():
        raise NotFound("Quiz attempt not found. Please start the quiz again.")
    attempt["last_activity"] = now
    return attempt

# Check that the request is for the current question number, raising Conflict if not.
def check_current_question(attempt, number):
    if number != attempt["question_number"]:
        raise Conflict("This question is no longer current")


# Return display state, keeping scoring flags and ownership on the backend.
def attempt_response(attempt_id, attempt, **extra):
    return jsonify({
        "attempt_id": attempt_id,
        "quiz_type": attempt["quiz_type"],
        "instrument_id": attempt["instrument_id"],
        "question_number": attempt["question_number"],
        "total_questions": attempt["total_questions"],
        "question": attempt["question"],
        "first_try_correct": attempt["first_try_correct"],
        "answered_correctly": attempt["answered_correctly"],
        "completed": attempt["completed"],
        **extra,
    })


# Use the existing profile tables to validate the instrument; no quiz rows are saved.
@quizzes.post("/start")
@jwt_required()
def start_quiz():
    data = request_data()
    quiz_type = data.get("quiz_type")
    if not isinstance(quiz_type, str) or quiz_type not in QUIZ_TYPES:
        raise BadRequest("Unsupported quiz type")
    instrument_id = data.get("instrument_id")
    if type(instrument_id) is not int or instrument_id < 1:
        raise BadRequest("A valid instrument ID is required")

    user_id = get_jwt_identity()
    try:
        user = get_user_by_id(user_id)
    except SQLAlchemyError:
        current_app.logger.error("Database failure while starting a quiz")
        return jsonify({"Error": "Unable to load your instruments. Please try again."}), 500
    if user is None:
        raise NotFound("The user cannot be found")
    module = QUIZ_TYPES[quiz_type]
    if not any(instrument["instrument_id"] == instrument_id
               and instrument["name"] in module.SUPPORTED_INSTRUMENTS
               for instrument in user["instruments"]):
        raise BadRequest("Choose a supported instrument from your profile")

    attempt_id = str(uuid4())
    attempt = {
        "user_id": user_id,
        "quiz_type": quiz_type,
        "instrument_id": instrument_id,
        "question_number": 1,
        "total_questions": module.TOTAL_QUESTIONS,
        "question": module.generate_question(),
        "first_try_correct": 0,
        "guess_count": 0,
        "wrong": False,
        "answered_correctly": False,
        "completed": False,
    }
    with attempt_lock:
        now = monotonic()
        remove_expired_attempts(now)
        for old_id in list(active_attempts):
            old = active_attempts[old_id]
            if old["user_id"] == user_id and old["completed"]:
                del active_attempts[old_id]
        attempt["last_activity"] = now
        active_attempts[attempt_id] = attempt
    return attempt_response(attempt_id, attempt), 201


# Preserve first-try scoring and allow wrong guesses until the answer is correct.
@quizzes.post("/<attempt_id>/answer")
@jwt_required()
def answer_question(attempt_id):
    data = request_data()
    number = question_number(data)
    with attempt_lock:
        attempt = get_attempt(attempt_id)
        check_current_question(attempt, number)
        if attempt["completed"]:
            raise Conflict("This attempt is already completed")
        module = QUIZ_TYPES[attempt["quiz_type"]]
        try:
            is_correct = module.check_answer(attempt["question"], data.get("answer"))
        except ValueError as error:
            raise BadRequest(str(error)) from error
        if not attempt["answered_correctly"]:
            # Count valid guesses for this question, including the correct answer.
            attempt["guess_count"] += 1
            if is_correct:
                if not attempt["wrong"]:
                    attempt["first_try_correct"] += 1
                attempt["answered_correctly"] = True
                attempt["wrong"] = False
            else:
                attempt["wrong"] = True
        return attempt_response(attempt_id, attempt, is_correct=is_correct)

# Get the next question after a correct answer, or repeat the current question if the previous response was lost.
@quizzes.post("/<attempt_id>/next")
@jwt_required()
def next_question(attempt_id):
    number = question_number(request_data())
    with attempt_lock:
        attempt = get_attempt(attempt_id)
        if attempt["completed"]:
            raise Conflict("This attempt is already completed")
        # Repeating a Next request after a lost response must not skip a question.
        if number == attempt["question_number"] - 1:
            return attempt_response(attempt_id, attempt)
        check_current_question(attempt, number)
        if not attempt["answered_correctly"]:
            raise Conflict("Answer correctly before continuing")
        if number == attempt["total_questions"]:
            raise Conflict("Complete the attempt after the final question")
        module = QUIZ_TYPES[attempt["quiz_type"]]
        attempt["question_number"] += 1
        attempt["question"] = module.generate_question()
        attempt["guess_count"] = 0
        attempt["wrong"] = False
        attempt["answered_correctly"] = False
        return attempt_response(attempt_id, attempt)



# Completion is temporary for now; database persistence will be added separately.
@quizzes.post("/<attempt_id>/complete")
@jwt_required()
def complete_quiz(attempt_id):
    number = question_number(request_data())
    with attempt_lock:
        attempt = get_attempt(attempt_id)
        check_current_question(attempt, number)
        if number != attempt["total_questions"] or not attempt["answered_correctly"]:
            raise Conflict("Finish every question before completing the quiz")
        attempt["completed"] = True
        return attempt_response(attempt_id, attempt)
