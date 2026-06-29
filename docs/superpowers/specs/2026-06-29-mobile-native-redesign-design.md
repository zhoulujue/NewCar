# NewCar Mobile Native Redesign Design

Date: 2026-06-29

## 1. Background

NewCar has accumulated strong desktop-side decision tooling: requirement profile, new-car discovery, used-car source collection, candidate due diligence, information wall, quality and three-electric evidence, market feedback, seller checks, and decision reports.

The current mobile experience is technically responsive, but structurally it is still a compressed desktop workbench. The bottom navigation exists, yet mobile pages remain dense: filters, headers, cards, evidence modules, and detail rails are stacked rather than rethought for phone use.

The user selected **Approach C: native-app-like mobile redesign** during visual review. The chosen direction is:

- Mobile should feel like a focused car-buying companion app.
- Desktop should keep the existing professional workbench.
- The first implementation should reshape the mobile shell and four core mobile scenes rather than rewrite every module.

## 2. Product Goal

Create a phone-first NewCar experience that helps the user make car-buying decisions while browsing listings, visiting stores, test driving, chatting with sellers, and capturing screenshots.

The mobile app should answer:

1. What should I do today?
2. Which candidate is worth attention?
3. What evidence should I collect next?
4. How do I quickly save photos, screenshots, links, and seller promises?
5. Can I assess one car without navigating a desktop-style dashboard?

## 3. Non-Goals

This redesign does not:

- Replace the desktop layout.
- Rebuild all data models.
- Change AI provider behavior.
- Build native iOS or Android apps.
- Implement every report, seller, and comparison workflow as a first-class mobile page in the first release.
- Remove existing desktop modules such as compare, seller, report, or risk pages.

## 4. Mobile Information Architecture

Mobile primary navigation becomes:

```text
Today / Candidates / + Capture / Discover / More
```

### 4.1 Today

Purpose: mobile home and decision board.

It shows:

- Current recommendation.
- Best candidate or candidate to watch.
- Three most important tasks.
- Indicator deadline window.
- AI/system status only when action is needed.

It should not show every metric or every module. It replaces the current dashboard density with a short decision summary.

### 4.2 Candidates

Purpose: mobile candidate list.

It shows cards sorted by current priority. Stage chips replace the desktop-heavy filter toolbar.

Primary filters:

- All
- Watch
- Evidence
- Test Drive
- Negotiate
- Excluded

Each mobile candidate card shows only:

- Image.
- Name and trim.
- Price.
- City/source.
- Recommendation.
- Risk count or risk score.
- Due diligence progress.
- Next action.

Actions on the card:

- Tap card: open full-screen candidate detail.
- Optional overflow: edit, compare, remove, external source.

### 4.3 + Capture

Purpose: the most important mobile action.

This is a central raised action in bottom navigation. It opens a bottom sheet rather than a full page.

Capture choices:

- Take photo.
- Upload screenshot/photo.
- Paste listing or article link.
- Write note or seller promise.

The sheet asks for:

- Associated candidate, defaulting to the most recently viewed candidate.
- Optional title.
- Optional note.

After saving:

- The information enters the information wall.
- It is marked as queued for AI analysis when payload size is acceptable.
- The UI returns to the previous context and shows a concise toast.

The user should not have to decide whether a piece of information is "quality", "rights", "price", or "seller". AI and later review can classify it.

### 4.4 Discover

Purpose: find new cars and used sources.

First release keeps the existing Discover concept but makes it mobile-scannable:

- Segmented control: New Cars / Used Sources.
- Profile summary collapses to one short strip.
- Refresh action is full-width and sticky only where useful.
- Cards use image-first layout with only core facts.

Discover remains lighter than Candidates in this phase.

### 4.5 More

Purpose: secondary features.

More contains:

- Requirement profile.
- Compare.
- Test drives.
- Sellers.
- Reports.
- Import/export JSON.
- Account.

This avoids overloading bottom navigation while preserving all existing functionality.

## 5. Core Mobile Scenes

### 5.1 Today Scene

Visual style:

- Dark app-like background.
- Large title, concise subtitle.
- One strong recommendation card.
- White or light cards for tasks and candidate shortcuts.

Required sections:

1. Current Decision
   - Example: "继续等，不急买".
   - One-sentence reason.

2. Focus Candidate
   - Candidate name and trim.
   - Match score, recommendation, and price state.
   - Tap opens detail.

3. Today Tasks
   - Three tasks maximum.
   - Each task maps to a candidate or a workflow action.

4. Deadline
   - Days until Beijing indicator expiry.
   - Warning only when the window becomes tight.

Interaction:

- Tap a task to open the relevant candidate detail or section.
- Tap focus candidate to open mobile candidate detail.
- Pull-to-refresh behavior is not required for first release; explicit refresh buttons remain.

### 5.2 Candidates Scene

Visual style:

- Light background.
- Stage chips near top.
- Card feed.
- Avoid sticky desktop toolbar on mobile.

Candidate card hierarchy:

1. Vehicle photo.
2. Name, trim, price.
3. Source line: city, seller/source, mileage if used.
4. Three compact badges:
   - Recommendation.
   - Price state or stage.
   - Risk state.
5. Due diligence progress strip.
6. Next action sentence.

Interaction:

- Tap card body: detail.
- Overflow menu: edit, compare, remove, source link.
- Stage chip changes list filter without scrolling to top.

### 5.3 Capture Sheet

Visual style:

- Bottom sheet with rounded top corners.
- Dimmed page behind it.
- Four large action tiles.
- Candidate selector row.

States:

- Default: shows four capture actions and recent candidate.
- Uploading: shows local file preview and save action.
- Link: shows URL input and note input.
- Note: shows textarea and save action.
- Saved: closes sheet and confirms with toast.
- Error: stays open and shows clear recovery text.

Accessibility:

- Sheet uses dialog semantics.
- Escape/cancel closes.
- Touch targets are at least 44px high.
- Focus moves into sheet when opened and returns to trigger on close.

### 5.4 Candidate Detail Scene

Visual style:

- Full-screen mobile detail.
- Top bar: back, title/context, more/report.
- Hero card: image, name, source, price, recommendation, risk.
- Horizontal segment anchors.
- Bottom action bar.

Segments:

1. Overview
   - Current gate: worth seeing, keep watching, do not pay, exclude.
   - Next action.
   - Market feedback summary.

2. Quality
   - Quality and three-electric summary.
   - Missing evidence.
   - AI refresh and copy questions.

3. Info
   - Information wall.
   - Add information shortcut.
   - AI analysis status.

4. Cost
   - Real cost.
   - Price timeline.
   - Target price.

5. Drive
   - i6 benchmark.
   - Test drive notes.

Bottom action bar:

- Feedback.
- Quality.
- Evidence.
- Source.

The existing desktop decision rail becomes a mobile Overview gate card, not a sidebar stacked above all content.

## 6. Visual System

### 6.1 Overall Style

Mobile should feel more like a premium native app than a web dashboard.

Rules:

- Today can use dark background.
- Content pages use light background.
- Cards remain calm, with subtle borders and low shadow.
- Vehicle images remain primary visual assets.
- Use strong hierarchy rather than dense labels.
- Avoid decorative orbs, heavy gradients, and marketing hero layouts.

### 6.2 Color Roles

Use existing tokens where possible:

```css
--mobile-ink: #101820;
--mobile-bg: #f5f7f9;
--mobile-surface: #ffffff;
--mobile-primary: #0f766e;
--mobile-muted: #64748b;
--mobile-line: #dfe5ec;
--mobile-warning: #b54708;
--mobile-danger: #b42318;
```

Dark Today scene:

- Background: `#101820`.
- Primary card: `#0f766e`.
- Text: white and muted blue-gray.
- Content cards: white.

Light scenes:

- Background: `#f5f7f9`.
- Cards: white.
- Primary action: deep teal.
- Risk: restrained red badges only.

### 6.3 Layout Rules

Mobile breakpoint remains `max-width: 820px`, but mobile should get dedicated classes and structure.

Rules:

- Bottom nav is fixed and safe-area aware.
- Main content bottom padding must account for nav and detail action bars.
- Horizontal chip rows are scrollable and no-wrap.
- Forms and buttons use 44px minimum touch target.
- Cards use stable dimensions for image areas.
- Long text wraps and never causes horizontal overflow.

## 7. Interaction Logic

### 7.1 Navigation Mapping

Desktop views remain:

```text
dashboard, discover, garage, compare, drives, sellers, report, detail
```

Mobile labels become:

```text
Today -> dashboard
Candidates -> garage
Capture -> opens sheet, not a view
Discover -> discover
More -> report or a new mobileMore composition
```

Compare, drives, sellers, and report should be reachable from More.

### 7.2 Scroll Behavior

Tab switching should preserve scroll positions.

Candidate card to detail:

- Opening detail starts at top.
- Returning to Candidates restores previous list scroll and filter state.

Detail segments:

- Segment chips scroll to anchored sections.
- Selected segment updates when the user taps a chip.
- Scrollspy is optional for first release.

### 7.3 Capture Association

Default associated candidate:

1. Currently selected detail candidate.
2. Most recently viewed candidate.
3. Top-ranked active candidate.
4. "稍后再选".

Captured information should be saved even if no candidate is chosen, but first release may store it as unassigned only if the current data model supports that cleanly. If not, require a candidate selection and default intelligently.

## 8. Implementation Boundary For First Release

First release should implement:

- Mobile-only bottom nav visual redesign.
- Central `+ Capture` bottom sheet.
- Mobile Today composition.
- Mobile Candidate card feed and stage chips.
- Mobile Candidate Detail composition with segment chips.
- Mobile-specific CSS tokens and safe-area rules.
- Static tests and browser checks for 390px and desktop widths.

First release can defer:

- Full mobile More page redesign.
- Advanced scrollspy.
- Gesture interactions.
- Offline upload queue.
- Push notifications.
- Dedicated mobile compare experience.

## 9. Acceptance Criteria

### 9.1 Functional

- Mobile bottom navigation shows Today, Candidates, central Capture, Discover, More.
- Tapping Capture opens a bottom sheet without changing the active view.
- Capture sheet can add information with text and/or images to an associated candidate.
- Candidates view uses stage chips and mobile cards.
- Candidate detail has segment chips and bottom action bar.
- Desktop layout remains functionally unchanged.

### 9.2 UX

- At 390px width, there is no horizontal overflow.
- Primary mobile tasks are reachable within one or two taps.
- Top-level mobile pages do not begin with dense desktop toolbars.
- Candidate cards are scannable without reading long paragraphs.
- Detail bottom action bar does not overlap bottom navigation or content.

### 9.3 Visual

- Today scene has distinct dark native-app feel.
- Light pages remain consistent with NewCar's calm professional style.
- Touch targets are large enough.
- Images are stable and do not stretch awkwardly.
- Badges are meaningful and limited.

### 9.4 Technical

- `node --check app.js` passes.
- `node --test scripts/tests/*.test.mjs` passes.
- Static tests cover mobile nav, capture sheet, mobile candidate cards, and detail segments.
- Browser verification covers:
  - Desktop width, no regression.
  - 390px mobile Today.
  - 390px mobile Candidates.
  - 390px mobile Detail.
  - Capture sheet open/close.

## 10. Open Decisions Resolved

- Selected approach: native-app-like mobile redesign.
- Primary mobile nav: Today / Candidates / Capture / Discover / More.
- First release priority: Today, Candidates, Capture, Candidate Detail.
- Desktop behavior: preserve existing workbench.
- Mobile visual direction: dark decision home plus light content pages.

## 11. Spec Self-Review

- Placeholder scan: no unresolved placeholder markers remain.
- Internal consistency: navigation, page structure, and implementation boundary all match the selected C direction.
- Scope check: first release is bounded to mobile shell and four core mobile scenes.
- Ambiguity check: deferred items and first-release items are explicitly separated.
