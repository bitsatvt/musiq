import json

import pytest

from blueprints.quizzes.scoring import (
    PRESETS, ScoringConfig, accuracy_factor, final_score, satisfies_anti_spam, score,
)

T = 20
# N has no upper limit, so the properties are checked across a wide range of choice counts.
CHOICE_COUNTS = [2, 3, 4, 5, 6, 10, 25, 100]
TIMES = [i * 0.1 for i in range(int(T * 10) + 1)]  # 0.0 .. 20.0
EPS = 1e-9


@pytest.fixture(params=sorted(PRESETS))
def config(request):
    return PRESETS[request.param]


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_within_floor_and_ceiling(config, n):
    for wrong in range(n):
        for t in TIMES:
            assert config.floor - EPS <= score(t, wrong, T, n, config) <= config.ceiling + EPS


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_never_increases_with_time(config, n):
    for wrong in range(n):
        scores = [score(t, wrong, T, n, config) for t in TIMES]
        assert all(later <= earlier + EPS for earlier, later in zip(scores, scores[1:]))


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_never_increases_with_mistakes(config, n):
    for t in TIMES:
        scores = [score(t, wrong, T, n, config) for wrong in range(n)]
        assert all(later <= earlier + EPS for earlier, later in zip(scores, scores[1:]))


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_instant_first_try_is_ceiling(config, n):
    assert score(0, 0, T, n, config) == pytest.approx(config.ceiling)
    assert score(config.grace_period, 0, T, n, config) == pytest.approx(config.ceiling)


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_all_wrong_or_timeout_is_floor(config, n):
    assert score(0, n - 1, T, n, config) == pytest.approx(config.floor)
    assert score(T, 0, T, n, config) == pytest.approx(config.floor)
    assert score(T + 5, 0, T, n, config) == pytest.approx(config.floor)


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_slow_correct_answer_keeps_accuracy_share(config, n):
    guaranteed = config.floor + config.accuracy_weight * (config.ceiling - config.floor)
    assert score(T - 1e-6, 0, T, n, config) >= guaranteed - 1e-3


@pytest.mark.parametrize("n", CHOICE_COUNTS)
def test_anti_spam(config, n):
    assert satisfies_anti_spam(config, n)
    assert score(0, 1, T, n, config) <= score(T - 1e-6, 0, T, n, config) + 1e-3


def test_more_choices_score_higher_for_same_mistakes(config):
    for wrong in (1, 2, 3):
        scores = [score(0, wrong, T, n, config) for n in CHOICE_COUNTS if n > wrong]
        assert all(later >= earlier - EPS for earlier, later in zip(scores, scores[1:]))


@pytest.mark.parametrize("wrong, n, expected", [
    (1, 4, 400), (2, 4, 175), (3, 4, 100),
    (1, 10, 500), (2, 10, 275), (3, 10, 175), (5, 10, 112.5),
])
def test_matches_doc_table_for_balanced(wrong, n, expected):
    assert score(0, wrong, T, n, PRESETS["balanced"]) == pytest.approx(expected)


def test_accuracy_factor_by_elimination_is_zero(config):
    for n in CHOICE_COUNTS:
        assert accuracy_factor(n - 1, n, config) == pytest.approx(0)


def test_final_score_ignores_quiz_length(config):
    s = score(5, 1, T, 4, config)
    assert final_score([s] * 3, config) == pytest.approx(final_score([s] * 10, config))


def test_final_score_range(config):
    m = config.final_score_ceiling
    assert final_score([config.ceiling] * 5, config) == pytest.approx(m)
    assert final_score([config.floor] * 5, config) == pytest.approx(m * config.floor / config.ceiling)


def test_final_score_requires_scores(config):
    with pytest.raises(ValueError):
        final_score([], config)


@pytest.mark.parametrize("args", [(1, 0, T, 1), (1, 4, T, 4), (1, -1, T, 4), (1, 0, 1.0, 4)])
def test_rejects_bad_inputs(config, args):
    with pytest.raises(ValueError):
        score(*args, config)


def test_config_rejects_retention_above_accuracy_weight():
    raw = {"ceiling": 1000, "floor": 100, "gracePeriodSec": 1.5, "timeExponent": 2,
           "mistakeRetention": 0.6, "accuracyWeight": 0.5, "finalScoreCeiling": 100}
    with pytest.raises(ValueError):
        ScoringConfig.from_dict(raw)
    ScoringConfig.from_dict(json.loads(json.dumps({**raw, "mistakeRetention": 0.5})))
