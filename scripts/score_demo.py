"""Accuracy over PathAgent per-case result JSONs."""
import argparse
import json
import os


def score(results_dir):
    n = correct = 0
    for f in sorted(os.listdir(results_dir)):
        if not f.endswith(".json"):
            continue
        d = json.load(open(os.path.join(results_dir, f), encoding="utf-8"))
        if "pred_answer" not in d:
            continue
        n += 1
        correct += str(d["pred_answer"]).strip().lower() == str(d["ground_truth"]).strip().lower()
    return {"n": n, "correct": int(correct), "accuracy": (correct / n) if n else 0.0}


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--results_dir", required=True)
    print(json.dumps(score(ap.parse_args().results_dir), indent=2))
