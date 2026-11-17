import json
from dataclasses import dataclass
from pathlib import Path

CONFIG_PATH = Path(__file__).with_name("scoring_config.json")


@dataclass(frozen=True)
class ScoringConfig:
    """Validates settings, translates naming convention from camel to snake, builds a scoring config object for
    use in subsequent methods"""
    ceiling: float
    floor: float
    grace_period: float
    time_exponent: float
    mistake_retention: float
    accuracy_weight: float
    final_score_ceiling: float

    @classmethod
    def from_dict(cls, raw):
        config = cls(
            ceiling=raw["ceiling"],
            floor=raw["floor"],
            grace_period=raw["gracePeriodSec"],
            time_exponent=raw["timeExponent"],
            mistake_retention=raw["mistakeRetention"],
            accuracy_weight=raw["accuracyWeight"],
            final_score_ceiling=raw["finalScoreCeiling"],
        )
        if not 0 <= config.floor < config.ceiling:
            raise ValueError("floor must be in [0, ceiling)")
        if config.grace_period < 0:
            raise ValueError("gracePeriodSec must be >= 0")
        if config.time_exponent <= 0:
            raise ValueError("timeExponent must be > 0")
        if not 0 <= config.accuracy_weight <= 1:
            raise ValueError("accuracyWeight must be in [0, 1]")
        # r <= alpha is the anti-spam constraint; it holds for every N, so it is enforced on load.
        if not 0 < config.mistake_retention <= config.accuracy_weight:
            raise ValueError("mistakeRetention must be in (0, accuracyWeight]")
        if config.final_score_ceiling <= 0:
            raise ValueError("finalScoreCeiling must be > 0")
        return config

def load_presets(path=CONFIG_PATH):
    """Loads the settings for the desired preset from the config file"""
    with open(path) as file:
        raw = json.load(file)
    return {name: ScoringConfig.from_dict(values) for name, values
            in raw["presets"].items()}


PRESETS = load_presets()


def accuracy_factor(wrong, num_choices, config):
    """A(I) = r^I * (1 - I/(N-1)). Each mistake keeps a share r of the credit, and a correct
    answer by elimination (I = N - 1) gets 0. Works for any N >= 2."""
    return config.mistake_retention ** wrong * (1 - wrong / (num_choices - 1))


def score(t, wrong, time_limit, num_choices, config):
    """Score per question. Follows the formula dictated within the scoring section in the wiki. Will error on bad or impossible
inputs. Returns a high score when the user answers quick and accurately and low when slow and inaccurate."""
    if num_choices < 2:
        raise ValueError("num_choices must be at least 2")
    if time_limit <= config.grace_period:
        raise ValueError("time_limit must be greater than the grace period")
    if not 0 <= wrong <= num_choices - 1:
        raise ValueError("wrong must be between 0 and num_choices -1")
    # Timing out locks the question at the floor.
    if t >= time_limit:
        return float(config.floor)
    x = min(1.0, max(0.0, (t - config.grace_period) / (time_limit - config.grace_period)))
    speed = config.accuracy_weight + (1 - config.accuracy_weight) * (1 - x ** config.time_exponent)
    return config.floor + (config.ceiling - config.floor) * accuracy_factor(wrong, num_choices, config) * speed


def final_score(question_scores, config):
    """Final quiz score: question scores summed and scaled to the fixed ceiling M, so quiz length
    does not change it. Ranges from M * F / C to M."""
    if not question_scores:
        raise ValueError("at least one question score is required")
    return config.final_score_ceiling * sum(question_scores) / (len(question_scores) * config.ceiling)


def satisfies_anti_spam(config, num_choices):
    """Ensures that "One quick wrong pick must never beat a slow first-try
    answer." for each preset config: A(1) <= alpha."""
    return accuracy_factor(1, num_choices, config) <= config.accuracy_weight
