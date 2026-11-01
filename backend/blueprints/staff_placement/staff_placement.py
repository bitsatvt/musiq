from random import choice, shuffle
from uuid import uuid4

from flask import Blueprint, jsonify, request


staff_placement = Blueprint("staff_placement", __name__)

QUIZ_LENGTH = 10

INSTRUMENTS = {
    "Piano": {
        "staff_type": "grand",
        "clefs": "Treble and bass clefs",
        "range": "A0–C8",
        "notation_note": "Grand staff for the standard 88-key piano range.",
        "layouts": [("treble", "Treble staff"), ("bass", "Bass staff")],
    },
    "Violin": {
        "staff_type": "single",
        "clefs": "Treble clef",
        "range": "G3–A7",
        "notation_note": "Standard orchestral written range.",
        "layouts": [("treble", "Treble staff")],
    },
    "Guitar": {
        "staff_type": "single",
        "clefs": "Treble clef",
        "range": "E3–E6",
        "notation_note": "Written notation; guitar sounds one octave lower.",
        "layouts": [("treble", "Treble staff")],
    },
    "Trumpet": {
        "staff_type": "single",
        "clefs": "Treble clef",
        "range": "F♯3–C6",
        "notation_note": "Written range for a B♭ trumpet.",
        "layouts": [("treble", "Treble staff")],
    },
}

# A quiz is intentionally short-lived for now. Persistent history can be added
# later without moving question generation or validation back into the client.
QUIZ_SESSIONS = {}


def _staff_positions(clef, label):
    # Ordered top-to-bottom. The center of each staff line/space is eight SVG
    # units apart in the frontend.
    notes = {
        "treble": [
            ("F5", "line"), ("E5", "space"), ("D5", "line"),
            ("C5", "space"), ("B4", "line"), ("A4", "space"),
            ("G4", "line"), ("F4", "space"), ("E4", "line"),
        ],
        "bass": [
            ("A3", "line"), ("G3", "space"), ("F3", "line"),
            ("E3", "space"), ("D3", "line"), ("C3", "space"),
            ("B2", "line"), ("A2", "space"), ("G2", "line"),
        ],
    }
    return [
        {
            "id": f"{clef}-{index}",
            "label": f"{label} {kind} {index // 2 + 1}",
            "kind": kind,
            "note": note,
            "clef": clef,
            "index": index,
        }
        for index, (note, kind) in enumerate(notes[clef])
    ]


def _question(position, question_number):
    letter = position["note"][0]
    return {
        "id": f"question-{question_number}-{uuid4().hex[:8]}",
        "display_name": position["note"],
        "letter": letter,
        "octave": int(position["note"][-1]),
        "staff": position["clef"],
        "position_id": position["id"],
        "hint": f"This note belongs on a {position['kind']}.",
    }


@staff_placement.post("/start")
def start_quiz():
    data = request.get_json(silent=True) or {}
    instrument_name = data.get("instrument_name")
    instrument = INSTRUMENTS.get(instrument_name)
    if instrument is None:
        return jsonify({"Error": "Choose a supported instrument."}), 400

    positions = [
        position
        for clef, label in instrument["layouts"]
        for position in _staff_positions(clef, label)
    ]
    question_pool = [_question(position, 0) for position in positions]
    repeated_pool = question_pool * ((QUIZ_LENGTH + len(question_pool) - 1) // len(question_pool))
    shuffle(repeated_pool)
    questions = [
        {**question, "id": f"question-{index}-{uuid4().hex[:8]}"}
        for index, question in enumerate(repeated_pool[:QUIZ_LENGTH])
    ]
    quiz_id = uuid4().hex
    QUIZ_SESSIONS[quiz_id] = {
        "instrument_name": instrument_name,
        "questions": questions,
        "positions": {position["id"]: position for position in positions},
    }

    return jsonify({
        "quiz_id": quiz_id,
        "instrument": {
            "name": instrument_name,
            "staff_type": instrument["staff_type"],
            "clefs": instrument["clefs"],
            "range": instrument["range"],
            "notation_note": instrument["notation_note"],
        },
        "questions": questions,
        "positions": positions,
    }), 201


@staff_placement.post("/validate")
def validate_placement():
    data = request.get_json(silent=True) or {}
    session = QUIZ_SESSIONS.get(data.get("quiz_id"))
    if session is None:
        return jsonify({"Error": "This quiz session is no longer available."}), 404

    question = next((item for item in session["questions"] if item["id"] == data.get("question_id")), None)
    selected = session["positions"].get(data.get("position_id"))
    if question is None or selected is None:
        return jsonify({"Error": "The question or staff position is invalid."}), 400

    is_correct = selected["id"] == question["position_id"]
    return jsonify({
        "correct": is_correct,
        "selected_note": selected["note"],
        "correct_note": question["display_name"],
        "feedback": "Correct placement." if is_correct else f"Incorrect. The target note is {question['display_name']}.",
    }), 200
