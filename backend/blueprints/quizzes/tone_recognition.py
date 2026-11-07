import random


TOTAL_QUESTIONS = 10
SUPPORTED_INSTRUMENTS = {"Piano", "Violin", "Guitar", "Trumpet"}
NOTES = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"]


# Choose three incorrect notes and shuffle them with the correct note.
def generate_question():
    correct = random.choice(NOTES)
    incorrect = random.sample([note for note in NOTES if note != correct], 3)
    choices = incorrect + [correct]
    random.shuffle(choices)
    return {
        "note": correct,
        "choices": choices,
    }


# The frontend plays the target note; the backend checks the selected answer.
def check_answer(question, answer):
    if not isinstance(answer, str) or answer not in question["choices"]:
        raise ValueError("Choose one of the available answers")
    return answer == question["note"]
