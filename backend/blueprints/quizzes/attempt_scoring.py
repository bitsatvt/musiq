"""Server-side timing and scoring for quiz attempts.

The server's clock is the only one that counts: a question's timer starts when the server
issues it, and t is measured when the server receives the correct answer. The client never
sends a time; its countdown is display only. Kept free of Flask and the database so it can be
unit tested on its own. Every function takes `now` (a time.monotonic() reading) from the caller.
"""
from .scoring import PRESETS, final_score, score

SCORING_CONFIG = PRESETS["balanced"]
TIME_LIMIT_SEC = 20


def start_question(attempt, question, now):
    """Issue a question and start its server-side timer."""
    attempt["question"] = question
    attempt["question_started_at"] = now
    attempt["wrong_choices"] = set()
    attempt["answered_correctly"] = False
    attempt["timed_out"] = False
    attempt["question_score"] = None


def question_done(attempt):
    return attempt["answered_correctly"] or attempt["timed_out"]


def _finish_question(attempt, value):
    attempt["question_score"] = value
    attempt["question_scores"].append(value)


def expire_if_timed_out(attempt, now):
    """Enforce the timeout: once T has passed on the server clock, the question scores F and locks.
    Checked lazily on every request, so no background timer is needed."""
    if question_done(attempt):
        return
    if now - attempt["question_started_at"] >= attempt["time_limit"]:
        attempt["timed_out"] = True
        _finish_question(attempt, float(SCORING_CONFIG.floor))


def record_guess(attempt, answer, is_correct, now):
    expire_if_timed_out(attempt, now)
    if question_done(attempt):
        return  # Extra clicks after a correct answer or a timeout change nothing.
    if not is_correct:
        # A set, so clicking the same wrong choice again does not count twice (and I stays <= N - 1).
        attempt["wrong_choices"].add(answer)
        return
    if not attempt["wrong_choices"]:
        attempt["first_try_correct"] += 1
    attempt["answered_correctly"] = True
    _finish_question(attempt, score(
        now - attempt["question_started_at"],
        len(attempt["wrong_choices"]),
        attempt["time_limit"],
        len(attempt["question"]["choices"]),
        SCORING_CONFIG,
    ))


def time_remaining(attempt, now):
    """Seconds left on the server clock, for the client's display-only countdown."""
    if question_done(attempt):
        return 0.0
    return max(0.0, attempt["time_limit"] - (now - attempt["question_started_at"]))


def finish_attempt(attempt):
    attempt["completed"] = True
    attempt["final_score"] = final_score(attempt["question_scores"], SCORING_CONFIG)
