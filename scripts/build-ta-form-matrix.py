#!/usr/bin/env python3
"""
Precompute the therapeutic-area × dosage-form matrix used by the "delivery
fingerprint" bridge in the Shape of Drug Development essay.

Reads the synced drug-level export and writes a small derived matrix to the
public data dir. Re-run after sync-shape-data.sh.

Usage:
    python3 scripts/build-ta-form-matrix.py
"""
from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/data/shape-of-drug-development/fda_nme_approvals_with_therapeutic_area.json"
DST = ROOT / "public/data/shape-of-drug-development/therapeutic_area_dosage_form_matrix.json"


def norm(form: str | None) -> str | None:
    if not form:
        return None
    f = str(form).lower()
    table = [
        ("inhal", "Inhaler"),
        ("patch", "Patch"),
        ("spray", "Spray"),
        ("cream", "Topical"),
        ("ointment", "Topical"),
        ("lotion", "Topical"),
        ("gel", "Topical"),
        ("inject", "Injectable"),
        ("infus", "Injectable"),
        ("tablet", "Tablet"),
        ("capsule", "Capsule"),
        ("powder", "Powder"),
        ("suspension", "Suspension"),
        ("solution", "Solution"),
        ("drops", "Solution"),
        ("emulsion", "Solution"),
        ("syrup", "Solution"),
    ]
    for key, label in table:
        if key in f:
            return label
    return "Other"


def main() -> None:
    drugs = json.loads(SRC.read_text())
    ta_totals: Counter[str] = Counter()
    ta_form: dict[str, Counter[str]] = defaultdict(Counter)
    for r in drugs:
        ta = r.get("therapeutic_area_primary")
        form = norm(r.get("dosage_form_1"))
        if ta and form:
            ta_form[ta][form] += 1
            ta_totals[ta] += 1

    top_tas = [t for t, _ in ta_totals.most_common(8)]
    top_forms_pool: Counter[str] = Counter()
    for t in top_tas:
        for f, c in ta_form[t].items():
            top_forms_pool[f] += c
    top_forms = [f for f, _ in top_forms_pool.most_common(6)]

    out = {
        "therapeutic_areas": [
            {"therapeutic_area": t, "total": ta_totals[t]} for t in top_tas
        ],
        "dosage_forms": top_forms,
        "matrix": [],
    }
    for t in top_tas:
        row_total = ta_totals[t] or 1
        row = {
            "therapeutic_area": t,
            "total": ta_totals[t],
            "forms": {},
        }
        for f in top_forms:
            c = ta_form[t][f]
            row["forms"][f] = {"count": c, "share": c / row_total}
        other = ta_totals[t] - sum(ta_form[t][f] for f in top_forms)
        row["forms"]["Other"] = {
            "count": max(0, other),
            "share": max(0, other) / row_total,
        }
        out["matrix"].append(row)

    DST.write_text(json.dumps(out, indent=2))
    print(f"wrote {DST.relative_to(ROOT)} ({len(out['matrix'])} rows)")


if __name__ == "__main__":
    main()
