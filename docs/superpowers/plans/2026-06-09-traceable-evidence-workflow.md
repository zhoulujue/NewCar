# Traceable Evidence Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the local NewCar workbench trace decisions to profile snapshots, apply AI analysis with field-level provenance, turn evidence scripts into trackable actions, harden redline gate language, and improve mobile i6 benchmark readability.

**Architecture:** Keep the current static single-page app and localStorage persistence, but add small normalized substructures to the existing state: `profileSnapshots`, `fieldSources`, and `evidenceActionTasks`. Avoid a backend in this batch. Static tests assert the new behavior and a browser pass verifies the main user journey.

**Tech Stack:** Plain HTML/CSS/JavaScript, Node `node:test`, localStorage, browser DOM APIs.

---

### Task 1: Profile Snapshot Provenance

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Test: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [x] Add a failing static test that requires `profileSnapshots`, `profileVersion`, `profileSnapshotId`, `createProfileSnapshot`, and `ensureCurrentProfileSnapshot`.
- [x] Implement snapshot normalization in `normalizeState`, `normalizeUserRequirement`, and helper functions.
- [x] Stamp selected candidates, refresh payloads, and AI payloads with the current `profileSnapshotId`.
- [x] Show the latest profile version in the requirement preview.
- [x] Run `node --test scripts/tests/ui-static.test.mjs`.

### Task 2: Field-Level AI Provenance

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Test: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [x] Add a failing static test that requires `fieldSources`, `recordFieldSource`, `renderFieldSourceBadges`, and field-level source text in the detail/report UI.
- [x] Add a normalized `fieldSources` map to every candidate.
- [x] Update `applyCarPatch` to accept source metadata and record each applied field.
- [x] Render field source badges in detail/report areas where price, rights, and quality facts are shown.
- [x] Run `node --test scripts/tests/ui-static.test.mjs`.

### Task 3: Evidence Action Tasks

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Test: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [x] Add a failing static test that requires `evidenceActionTasks`, task status transitions, and action buttons for sent/replied/evidence/closed.
- [x] Normalize evidence action task state per candidate.
- [x] Derive stable action task ids from seller/inspection/contract script items.
- [x] Render each action item with task status controls and decision-log entries.
- [ ] Future enhancement: let uploaded evidence be linked to a currently active action task.
- [x] Run `node --test scripts/tests/ui-static.test.mjs`.

### Task 4: Redline Gate Language

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Test: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [x] Add a failing static test that rejects `可继续谈，但暂不建议下订` as a primary blocked conclusion.
- [x] Replace blocked report language with `只适合取证/复检/排除`.
- [x] Include the next permitted actions in copied decision reports.
- [x] Run `node --test scripts/tests/ui-static.test.mjs`.

### Task 5: Mobile i6 Benchmark Cards

**Files:**
- Modify: `/Users/michael/Documents/NewCar/app.js`
- Modify: `/Users/michael/Documents/NewCar/styles.css`
- Test: `/Users/michael/Documents/NewCar/scripts/tests/ui-static.test.mjs`

- [x] Add a failing static test requiring `.i6-card-list`, `.i6-benchmark-card`, and a mobile media rule that hides the wide matrix table.
- [x] Render card alternatives for each i6 benchmark dimension.
- [x] Hide/show table versus cards by breakpoint.
- [x] Run `node --test scripts/tests/ui-static.test.mjs`.

### Task 6: Full Verification

**Files:**
- Verify only.

- [x] Run `node --check app.js`.
- [x] Run `node --check scripts/dongchedi-newcar-server.mjs`.
- [x] Run `node --check scripts/gemini-analyzer-server.mjs`.
- [x] Run `node --test scripts/tests/*.test.mjs`.
- [x] Start a local static server and use the in-app browser to check dashboard, detail, copy/action controls, and mobile detail.
