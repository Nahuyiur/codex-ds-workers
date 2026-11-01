# Miniature handoff exercise

Implement the two functions in `mini/text.py` and `mini/stats.py` using Python 3's standard library. These modules have no dependency on each other. Keep this document, `tests/`, `verify.py`, and `protected.json` unchanged.

`clean_tags(values)` consumes an iterable of strings once, strips whitespace, applies Unicode `casefold`, drops empty tags, and deduplicates while preserving first occurrence. It returns a new list and does not mutate the input. A string or bytes object as the entire input, or any non-string element, raises `TypeError`.

`summarize(values)` consumes an iterable of finite built-in `int` and `float` values once. Reject booleans and other types with `TypeError`; reject non-finite floats with `ValueError`. Return a dictionary with `count`, `min`, `max`, and `mean`. Empty input returns `count=0` and `None` for the other fields. Do not mutate the input.

Run:

```bash
python3 verify.py
```

The starter intentionally raises `NotImplementedError`. A completed implementation passes eight test methods and leaves all protected-file hashes unchanged. These tests cover the exercise, not every possible Python numeric edge case.

For the parallel exercise, create two independent workspace copies. Worker A owns only `mini/text.py`; worker B owns only `mini/stats.py`. The parent reviews both diffs, copies only those owned files into an integration copy, verifies protected inputs independently, and runs the combined checks. Keep this exercise out of a production working tree.
