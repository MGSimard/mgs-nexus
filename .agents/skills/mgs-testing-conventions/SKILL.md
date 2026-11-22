---
name: mgs-testing-conventions
description: "Testing gate for this repo (Vitest, Astro Container API, Playwright). Use when writing or changing a test, reviewing tests, or pruning tests in an area."
---

# Testing conventions

The rules live in `docs/agents/testing.md`. Read it before your first edit; it takes priority over the `tdd` skill where they differ. The `mgs-testing` lint enforces what a machine can check; this skill covers the judgment.

- Writing or changing a test: pass the authoring gate.
- Reviewing tests: check every one against the junk patterns.
- Pruning an area: apply guide rule 12, then report as below.

## Authoring gate

Before adding or changing a test, answer all four questions. A test with any answer missing stays unwritten.

1. **Behavior:** which behavior can a user or caller see that this test protects?
2. **Regression:** what believable bug makes it fail? Break the code once and watch it fail; for a bug fix, it fails before the fix and passes after. If you can't show that, say so in the report.
3. **Owner:** which existing test already owns this behavior? If one does, extend it (a `test.each` row, a shared fixture) instead of adding a test. A second test at another layer needs a risk the first can't catch.
4. **Layer and boundary:** which layer does guide rule 1 pick, and is the test at the real entry point, at the highest level that still fails clearly (the rendered page or component, found by role, label or text)? Production code gains no export, flag or hook for the test.

## Junk patterns

Reject, and in a cleanup delete or rewrite:

- A mock that supplies the asserted result, or a mock of the module under test.
- Fixed sleeps, retries, raised timeouts, skipped tests, a spy polled until it changes.
- Assertions on private state, internal call order, which helper ran, or internal props.
- An expected value computed with the same logic as the code (`price - price * 0.2` instead of `80`).
- Tests of the browser, Astro, ui-sdk, a library or the type system (a `<button>` renders, a click fires).
- Tests about files: removed code stays gone, a file exists, source text contains a string.
- A Container test that imports ui-sdk or a component's script itself to make it run: that behavior belongs in Playwright.
- A test for native browser UI it cannot see (guide rule 10).
- A second test for a behavior another test already owns.
- Production code that exists only for tests.

Rewrite instead of deleting when the test also covers a behavior something relies on: assert what callers see.

## Flaky tests

Find the root cause and fix it. If the cause can't be found, delete the test and write the reason in the PR description.

## Lint

Fix a lint violation at its cause. A change to a rule, the lint config, this skill or the guide is its own pull request (guide rule 14); CI fails one that mixes them with other files.

## Before the PR

Run the checks in guide rule 13.

## Report

For each change, the evidence a reviewer checks instead of rereading everything:

- each kept or new test and the behavior it guards;
- the proof it fails when broken: the edit you made to break the code and the failing test's name and message (or why proof wasn't possible);
- each deleted test and the test that still owns its behavior.

## Review

The author doesn't grade their own work. Once the checks pass, one separate reviewer (a fresh agent with only the guide, the diff and the report, or a person) checks every kept, new and deleted test against the guide. A second round builds on the first round's findings instead of starting over.
