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
    mistake_exponent: float
    accuracy_weight: float

    @classmethod
    def from_dict(cls, raw):
        config = cls(
            ceiling=raw["ceiling"],
            floor=raw["floor"],
            grace_period=raw["gracePeriodSec"],
            time_exponent=raw["timeExponent"],
            mistake_exponent=raw["mistakeExponent"],
            accuracy_weight=raw["accuracyWeight"],
        )
        if not 0 <= config.floor < config.ceiling:
            raise ValueError("floor must be in [0, ceiling)")
        if config.grace_period < 0:
            raise ValueError("gracePeriodSec must be >= 0")
        if config.time_exponent <= 0 or config.mistake_exponent <=0:
            raise ValueError("exponents must be > 0")
        if not 0 <= config.accuracy_weight <= 1:
            raise ValueError("accuracyWeight must be in [0, 1]")
        return config

def load_presets(path=CONFIG_PATH):
    """Loads the settings for the desired preset from the config file"""
    with open(path) as file:
        raw = json.load(file)
    return {name: ScoringConfig.from_dict(values) for name, values
            in raw["presets"].items()}


PRESETS = load_presets()

def score(t, wrong, time_limit, num_choices, config):
    """Score per question. Follows the formula dictated within the scoring section in the wiki. Will error on bad or impossible
inputs. Returns a high score when the user answers quick and accurately and low when slow and inaccurate."""
    if num_choices < 2:
        raise ValueError("num_choices must be at least 2")
    if time_limit <= config.grace_period:
        raise ValueError("time_limit must be greater than the grace period")
    if not 0 <= wrong <= num_choices - 1:
        raise ValueError("wrong must be between 0 and num_choices -1")
    if t >= time_limit:
        return float(config.floor)
    x = min(1.0, max(0.0, (t - config.grace_period) / (time_limit - config.grace_period)))
    accuracy = (1 - wrong / (num_choices - 1)) ** config.mistake_exponent
    speed = config.accuracy_weight + (1 - config.accuracy_weight) * (1 - x ** config.time_exponent)
    return config.floor + (config.ceiling - config.floor) * accuracy * speed

def quiz_score(question_scores):
    """Quiz scoring for the end of the test when we calculate the entire score. Essentially all points
    earned summed and scaled to the number of scores (number of questions in the test)"""
    if not question_scores:
        raise ValueError("at least one question score is required")
    return sum(question_scores) / len(question_scores)


def satisfies_anti_spam(config, num_choices):
    """Ensures that "One quick wrong pick must never beat a slow first-try
    answer." for each preset config."""
    return (1 - 1 / (num_choices - 1)) ** config.mistake_exponent <= config.accuracy_weight
