import pytest

from blueprints.quizzes.scoring import PRESETS, quiz_score, satisfies_anti_spam, score

T = 20
# Every choice count a quiz type uses. tone_recognition always sends 4.
CHOICE_COUNTS_IN_USE = [4]
TIMES = [i * 0.1 for i in range(int(T * 10) + 1)]  # 0.0 .. 20.0
EPS = 1e-9


@pytest.fixture(params=sorted(PRESETS))
def config(request):
    return PRESETS[request.param]


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_within_floor_and_ceiling(config, n):
    for wrong in range(n):
        for t in TIMES:
            assert config.floor - EPS <= score(t, wrong, T, n, config) <= config.ceiling + EPS


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_never_increases_with_time(config, n):
    for wrong in range(n):
        scores = [score(t, wrong, T, n, config) for t in TIMES]
        assert all(later <= earlier + EPS for earlier, later in zip(scores, scores[1:]))


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_never_increases_with_mistakes(config, n):
    for t in TIMES:
        scores = [score(t, wrong, T, n, config) for wrong in range(n)]
        assert all(later <= earlier + EPS for earlier, later in zip(scores, scores[1:]))


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_instant_first_try_is_ceiling(config, n):
    assert score(0, 0, T, n, config) == pytest.approx(config.ceiling)
    assert score(config.grace_period, 0, T, n, config) == pytest.approx(config.ceiling)


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_all_wrong_or_timeout_is_floor(config, n):
    assert score(0, n - 1, T, n, config) == pytest.approx(config.floor)
    assert score(T, 0, T, n, config) == pytest.approx(config.floor)
    assert score(T + 5, 0, T, n, config) == pytest.approx(config.floor)


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_slow_correct_answer_keeps_accuracy_share(config, n):
    guaranteed = config.floor + config.accuracy_weight * (config.ceiling - config.floor)
    assert score(T - 1e-6, 0, T, n, config) >= guaranteed - 1e-3


@pytest.mark.parametrize("n", CHOICE_COUNTS_IN_USE)
def test_anti_spam(config, n):
    assert satisfies_anti_spam(config, n)
    assert score(0, 1, T, n, config) <= score(T - 1e-6, 0, T, n, config) + 1e-3


def test_quiz_score_ignores_quiz_length(config):
    s = score(5, 1, T, 4, config)
    assert quiz_score([s] * 3) == pytest.approx(quiz_score([s] * 10)) == pytest.approx(s)


@pytest.mark.parametrize("args", [(1, 0, T, 1), (1, 4, T, 4), (1, -1, T, 4), (1, 0, 1.0, 4)])
def test_rejects_bad_inputs(config, args):
    with pytest.raises(ValueError):
        score(*args, config)
