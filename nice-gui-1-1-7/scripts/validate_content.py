from __future__ import annotations

import argparse
import sys
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(APP_ROOT))

from portal_app.content_loader import CONTENT_ROOT, ContentValidationError, load_activities


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate Eduni activity JSON files.")
    parser.add_argument("root", nargs="?", default=str(CONTENT_ROOT), help="content root to validate")
    args = parser.parse_args()

    try:
        activities = load_activities(Path(args.root))
    except ContentValidationError as exc:
        print(f"INVALID: {exc}", file=sys.stderr)
        return 1

    print(f"VALID: {len(activities)} enabled activities")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

