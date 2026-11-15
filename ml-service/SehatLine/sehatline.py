"""The SehatLine model wrapper — load weights, score, and prioritise."""

import os
import json
import numpy as np

from .core import FEATURES, build_matrix, rule_score, level_for
# NOTE: .model imports torch, so it is imported lazily inside __init__ —
# importing it here made `from SehatLine import SehatLine` crash (and the whole
# FastAPI service fail to start) on any machine without torch, despite the
# documented rule-fallback.

_HERE = os.path.dirname(os.path.abspath(__file__))


class SehatLine:
    """SehatLine deep-learning triage model.

    >>> from SehatLine import SehatLine
    >>> m = SehatLine()
    >>> m.prioritize([{ "age": 78, "conditions": ["heart disease"], "spo2": 89 }])
    """

    def __init__(self, weights_path=None, scaler_path=None):
        self._torch = None
        self._net = None
        self._mean = None
        self._std = None
        self.trained = False

        weights_path = weights_path or os.path.join(_HERE, "weights.pt")
        scaler_path = scaler_path or os.path.join(_HERE, "scaler.json")
        try:
            import torch  # imported lazily so the package imports even w/o torch
            from .model import SehatLineNet
            self._torch = torch
            net = SehatLineNet(len(FEATURES))
            try:
                state = torch.load(weights_path, map_location="cpu", weights_only=True)
            except TypeError:  # torch < 1.13 has no weights_only
                state = torch.load(weights_path, map_location="cpu")
            net.load_state_dict(state)
            net.eval()
            with open(scaler_path, "r") as f:
                meta = json.load(f)
            self._net = net
            self._mean = np.array(meta["mean"], dtype=float)
            self._std = np.array(meta["std"], dtype=float)
            self.trained = True
        except Exception:
            # No weights / no torch → fall back to the clinical rules.
            self.trained = False

    @property
    def engine(self):
        return "SehatLine-DL(pytorch)" if self.trained else "SehatLine-rule-fallback"

    def _predict(self, X):
        if X.shape[0] == 0:
            return np.zeros(0)
        rules = rule_score(X)
        if self.trained:
            Xs = (X - self._mean) / self._std
            with self._torch.no_grad():
                out = self._net(self._torch.tensor(Xs, dtype=self._torch.float32)).numpy()
            out = np.nan_to_num(np.clip(out, 0, 100), nan=0.0)
            # SAFETY FLOOR. Evaluated against its own training target, the
            # network regresses to the mean on rare high-risk cases: it scored
            # ~96% of rule-"critical" patients below 85 (e.g. SpO2 85% -> 6.9
            # instead of 30). A triage model must never under-rank clinical
            # red flags, so the clinical rule is a hard lower bound.
            return np.maximum(out, rules)
        return rules

    def score(self, patient):
        s = float(round(float(self._predict(build_matrix([patient]))[0]), 2))
        return {"priorityScore": s, "priorityLevel": level_for(s)}

    def prioritize(self, patients):
        scores = self._predict(build_matrix(patients))
        scored = [
            {"id": p.get("id"), "priorityScore": float(round(float(s), 2)),
             "priorityLevel": level_for(float(s))}
            for p, s in zip(patients, scores)
        ]
        order = sorted(range(len(scored)), key=lambda i: -scored[i]["priorityScore"])
        ranked = []
        for rank, idx in enumerate(order, start=1):
            item = dict(scored[idx])
            item["rank"] = rank
            ranked.append(item)
        return {"engine": self.engine, "count": len(ranked), "ranked": ranked}
