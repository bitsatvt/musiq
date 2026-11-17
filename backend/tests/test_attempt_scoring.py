import pytest

from blueprints.quizzes.attempt_scoring import (
    SCORING_CONFIG as CONFIG, TIME_LIMIT_SEC as T, expire_if_timed_out, finish_attempt,
    question_done, record_guess, start_question, time_remaining,
)
from blueprints.quizzes.scoring import score

QUESTION = {"note": "C4", "choices": ["C4", "D4", "E4", "F4"]}


def new_attempt(started_at=0.0):
    attempt = {"time_limit": T, "question_scores": [], "first_try_correct": 0,
               "final_score": None, "completed": False}
    start_question(attempt, QUESTION, started_at)
    return attempt


def test_server_clock_measures_t():
    attempt = new_attempt(started_at=100.0)
    record_guess(attempt, "C4", True, now=108.0)
    assert attempt["question_score"] == pytest.approx(score(8.0, 0, T, 4, CONFIG))


def test_instant_first_try_is_ceiling():
    attempt = new_attempt()
    record_guess(attempt, "C4", True, now=1.0)
    assert attempt["question_score"] == CONFIG.ceiling
    assert attempt["first_try_correct"] == 1


def test_clock_runs_through_wrong_answers():
    attempt = new_attempt()
    record_guess(attempt, "D4", False, now=3.0)
    record_guess(attempt, "C4", True, now=9.0)
    assert attempt["question_score"] == pytest.approx(score(9.0, 1, T, 4, CONFIG))
    assert attempt["first_try_correct"] == 0


def test_repeat_wrong_guess_counts_once():
    repeated = new_attempt()
    for _ in range(5):
        record_guess(repeated, "D4", False, now=0.5)
    record_guess(repeated, "C4", True, now=1.0)
    once = new_attempt()
    record_guess(once, "D4", False, now=0.5)
    record_guess(once, "C4", True, now=1.0)
    assert repeated["question_score"] == once["question_score"]


def test_correct_by_elimination_is_floor():
    attempt = new_attempt()
    for wrong in ("D4", "E4", "F4"):
        record_guess(attempt, wrong, False, now=0.5)
    record_guess(attempt, "C4", True, now=1.0)
    assert attempt["question_score"] == pytest.approx(CONFIG.floor)


def test_timeout_scores_floor_and_locks():
    attempt = new_attempt()
    record_guess(attempt, "C4", True, now=T + 0.1)
    assert attempt["timed_out"] and not attempt["answered_correctly"]
    assert attempt["question_scores"] == [CONFIG.floor]
    record_guess(attempt, "C4", True, now=T + 0.2)
    assert attempt["question_scores"] == [CONFIG.floor]


def test_timeout_is_enforced_without_an_answer():
    attempt = new_attempt()
    expire_if_timed_out(attempt, now=T - 0.01)
    assert not question_done(attempt)
    expire_if_timed_out(attempt, now=T)
    expire_if_timed_out(attempt, now=T + 1)
    assert attempt["timed_out"] and attempt["question_scores"] == [CONFIG.floor]


def test_guesses_after_correct_answer_change_nothing():
    attempt = new_attempt()
    record_guess(attempt, "C4", True, now=1.0)
    record_guess(attempt, "D4", False, now=2.0)
    record_guess(attempt, "C4", True, now=3.0)
    assert attempt["question_scores"] == [CONFIG.ceiling]
    assert attempt["first_try_correct"] == 1


def test_time_remaining():
    attempt = new_attempt(started_at=50.0)
    assert time_remaining(attempt, now=55.0) == pytest.approx(T - 5)
    assert time_remaining(attempt, now=50.0 + T + 3) == 0.0
    record_guess(attempt, "C4", True, now=56.0)
    assert time_remaining(attempt, now=56.0) == 0.0


def test_next_question_resets_state_and_restarts_clock():
    attempt = new_attempt()
    record_guess(attempt, "D4", False, now=1.0)
    record_guess(attempt, "C4", True, now=2.0)
    start_question(attempt, QUESTION, now=30.0)
    assert not question_done(attempt) and attempt["question_score"] is None
    assert attempt["wrong_choices"] == set()
    assert time_remaining(attempt, now=30.0) == T


def test_finish_attempt_scales_to_final_ceiling():
    attempt = new_attempt()
    attempt["question_scores"] = [CONFIG.ceiling, CONFIG.floor]
    finish_attempt(attempt)
    assert attempt["completed"]
    assert attempt["final_score"] == pytest.approx(
        CONFIG.final_score_ceiling * (CONFIG.ceiling + CONFIG.floor) / (2 * CONFIG.ceiling))
