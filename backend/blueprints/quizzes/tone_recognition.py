import random
from functools import cmp_to_key


TOTAL_QUESTIONS = 10
SUPPORTED_INSTRUMENTS = {"Piano", "Violin", "Guitar", "Trumpet"}
NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]


# Keep the existing random-sort approach when building the four choices.
def generate_question():
    correct = random.choice(NOTES)
    random_order = cmp_to_key(lambda a, b: -1 if random.random() > 0.5 else 1)
    incorrect = sorted((note for note in NOTES if note != correct), key=random_order)[:3]
    return {
        "note": correct,
        "choices": sorted(incorrect + [correct], key=random_order),
    }


# The frontend plays the target note; the backend checks the selected answer.
def check_answer(question, answer):
    if not isinstance(answer, str) or answer not in question["choices"]:
        raise ValueError("Choose one of the available answers")
    return answer == question["note"]
