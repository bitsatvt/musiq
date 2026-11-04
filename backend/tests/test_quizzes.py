import importlib
import sys
import unittest
from concurrent.futures import ThreadPoolExecutor
from types import ModuleType
from unittest.mock import Mock, patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token
from sqlalchemy.exc import SQLAlchemyError

# Existing database modules reflect MySQL tables on import; isolate these tests.
with patch.dict(sys.modules, {"blueprints.users.user_db": ModuleType("user_db")}):
    sys.modules["blueprints.users.user_db"].get_user_by_id = Mock()
    quiz_module = importlib.import_module("blueprints.quizzes.quizzes")
active_attempts = quiz_module.active_attempts
quizzes = quiz_module.quizzes
tone_recognition = quiz_module.tone_recognition


class QuizTests(unittest.TestCase):
    def setUp(self):
        active_attempts.clear()
        self.app = Flask(__name__)
        self.app.config.update(TESTING=True, JWT_SECRET_KEY="test-secret-for-quiz-regression-tests")
        JWTManager(self.app)
        self.app.register_blueprint(quizzes, url_prefix="/quizzes")
        self.client = self.app.test_client()
        with self.app.app_context():
            self.headers = {"Authorization": f"Bearer {create_access_token(identity='1')}"}
            self.other_headers = {"Authorization": f"Bearer {create_access_token(identity='2')}"}
        profile_patch = patch.object(quiz_module, "get_user_by_id", return_value={
            "user_id": 1, "instruments": [{"instrument_id": 1, "name": "Piano"}],
        })
        self.profile = profile_patch.start()
        self.addCleanup(profile_patch.stop)

    def start(self):
        response = self.client.post("/quizzes/start", headers=self.headers,
                                    json={"quiz_type": "tone_recognition", "instrument_id": 1})
        self.assertEqual(response.status_code, 201)
        return response.get_json()

    def post(self, attempt, action, answer=None, headers=None):
        return self.client.post(f"/quizzes/{attempt['attempt_id']}/{action}",
                                headers=self.headers if headers is None else headers,
                                json={"question_number": attempt["question_number"], "answer": answer})

    def update(self, attempt, action, answer=None):
        response = self.post(attempt, action, answer)
        self.assertEqual(response.status_code, 200)
        return response.get_json()

    def finish(self, wrong_questions):
        attempt = self.start()
        for number in range(1, 11):
            self.assertEqual(attempt["question_number"], number)
            self.assertEqual(attempt["total_questions"], 10)
            self.assertFalse(attempt["answered_correctly"])
            self.assertFalse(attempt["completed"])
            question = attempt["question"]
            self.assertEqual(len(set(question["choices"])), 4)
            self.assertTrue(set(question["choices"]).issubset(tone_recognition.NOTES))
            self.assertIn(question["note"], question["choices"])
            self.assertEqual(self.post(attempt, "next").status_code, 409)
            self.assertEqual(self.post(attempt, "complete").status_code, 409)
            if number in wrong_questions:
                wrong = next(choice for choice in question["choices"] if choice != question["note"])
                for _ in range(3):
                    result = self.update(attempt, "answer", wrong)
                    self.assertFalse(result["is_correct"])
                    self.assertFalse(result["answered_correctly"])
                    self.assertEqual(result["question"], question)
            attempt = self.update(attempt, "answer", question["note"])
            self.assertTrue(attempt["is_correct"])
            self.assertTrue(attempt["answered_correctly"])
            self.assertEqual(attempt["first_try_correct"], number - len(set(range(1, number + 1)) & wrong_questions))
            self.assertFalse(attempt["completed"])
            self.assertEqual(self.update(attempt, "answer", question["note"]), attempt)
            if number < 10:
                previous = attempt
                attempt = self.update(attempt, "next")
                self.assertEqual(self.update(previous, "next"), attempt)
        self.assertEqual(self.post(attempt, "next").status_code, 409)
        attempt = self.update(attempt, "complete")
        self.assertTrue(attempt["completed"])
        self.assertEqual(attempt["first_try_correct"], 10 - len(wrong_questions))
        self.assertEqual(self.update(attempt, "complete"), attempt)
        self.assertEqual(self.post(attempt, "answer", attempt["question"]["note"]).status_code, 409)
        return attempt

    def test_quiz_flow_and_first_try_scoring(self):
        for wrong_questions in (set(), {2, 4, 6, 8, 10}, set(range(1, 11))):
            with self.subTest(wrong_questions=wrong_questions):
                self.finish(wrong_questions)
        restarted = self.start()
        self.assertEqual(restarted["question_number"], 1)
        self.assertEqual(restarted["first_try_correct"], 0)
        self.assertFalse(restarted["completed"])

    def test_authentication_and_attempt_ownership(self):
        self.assertEqual(self.client.post("/quizzes/start", json={}).status_code, 401)
        attempt = self.start()
        for action in ("answer", "next", "complete"):
            self.assertEqual(self.post(attempt, action, headers={}).status_code, 401)
            self.assertEqual(self.post(attempt, action, headers=self.other_headers).status_code, 404)

    def test_start_validates_existing_profile_instruments(self):
        for data in ({}, {"quiz_type": []}, {"quiz_type": "not_supported"},
                     {"quiz_type": "tone_recognition", "instrument_id": True},
                     {"quiz_type": "tone_recognition", "instrument_id": 2}):
            response = self.client.post("/quizzes/start", headers=self.headers, json=data)
            self.assertEqual(response.status_code, 400)
        self.profile.return_value = None
        self.assertEqual(self.client.post("/quizzes/start", headers=self.headers,
                         json={"quiz_type": "tone_recognition", "instrument_id": 1}).status_code, 404)
        self.profile.side_effect = SQLAlchemyError("database unavailable")
        response = self.client.post("/quizzes/start", headers=self.headers,
                                    json={"quiz_type": "tone_recognition", "instrument_id": 1})
        self.assertEqual(response.status_code, 500)
        self.assertIn("Error", response.get_json())

    def test_invalid_and_stale_questions_do_not_change_score(self):
        attempt = self.start()
        self.assertEqual(self.post(attempt, "answer", "C5").status_code, 400)
        for number in (None, True, "1", 0):
            self.assertEqual(self.post({**attempt, "question_number": number}, "answer", "C4").status_code, 400)
        self.assertEqual(self.post({**attempt, "question_number": 2}, "answer", "C4").status_code, 409)
        result = self.update(attempt, "answer", attempt["question"]["note"])
        advanced = self.update(result, "next")
        self.assertEqual(self.post(attempt, "answer", attempt["question"]["note"]).status_code, 409)
        self.assertEqual(advanced["first_try_correct"], 1)

    def test_active_attempts_are_independent(self):
        first, second = self.start(), self.start()
        self.assertNotEqual(first["attempt_id"], second["attempt_id"])
        self.update(first, "answer", first["question"]["note"])
        result = self.update(second, "answer", second["question"]["note"])
        self.assertEqual(result["first_try_correct"], 1)

    def test_simultaneous_correct_answers_only_count_once(self):
        attempt = self.start()

        def answer():
            with self.app.test_client() as client:
                return client.post(f"/quizzes/{attempt['attempt_id']}/answer", headers=self.headers,
                                   json={"question_number": 1, "answer": attempt["question"]["note"]}).get_json()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda _: answer(), range(2)))
        self.assertTrue(all(result["first_try_correct"] == 1 for result in results))


if __name__ == "__main__":
    unittest.main()
