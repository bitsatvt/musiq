# Staff Placement Quiz Progress

## Context reviewed

The instrument-aware notation quiz plan calls for the existing notation-reading entry point to open an instrument selector before a quiz begins. The selection will later determine the staff configuration, valid note positions, scoring context, and result history.

## Step 1 complete

The Quiz Library card is now labelled **Staff Placement Quiz**. Its action opens a dedicated `/staff-placement` page rather than a popup. The page uses the same opening-screen pattern as the tone-recognition quiz and contains an instrument selector with the four instruments already used there: Piano, Violin, Guitar, and Trumpet.

Selecting an instrument records the choice in the current page session. No staff interaction, audio, scoring, or results flow has been added yet.

## Step 2 plan Staff rendering

### Goal

Render a staff preview that changes immediately when the learner selects an instrument. This is a visual and data-model milestone; it does not yet ask a question, accept a note placement, or calculate a score.

### Implementation sequence

1. Define a typed instrument configuration in the staff-placement route. Each configuration will provide a stable id, display name, staff type, clef or clefs, written range, and a short notation note.
2. Build a reusable SVG staff preview from that configuration. It will draw a single treble staff for Violin, Guitar, and Trumpet, and a paired treble and bass grand staff for Piano.
3. Display the selected instrument’s written range and clef information alongside the visual staff so the learner can verify what changed.
4. Keep the SVG isolated from answer-state logic. The following task can add ordered, accessible placement slots and map valid positions to this configuration without rewriting the visual shell.
5. Check the route after each change, run focused linting, and record any project-wide failures that predate this work.

### Initial notation defaults

| Instrument | Staff | Written range used for preview | Note |
| --- | --- | --- | --- |
| Piano | Grand staff, treble and bass | A0 to C8 | Common 88-key piano range. |
| Violin | Treble clef | G3 to A7 | Standard orchestral written range. |
| Guitar | Treble clef | E3 to E6 | Written notation; sounding pitch is one octave lower. |
| B flat Trumpet | Treble clef | F sharp 3 to C6 | Written range for the transposing instrument. |

### Open questions

- Should guitar be graded as written notation (recommended for this interface) or concert or sounding pitch?
- Is B flat trumpet the intended trumpet type, and should future prompts show transposition explicitly?
- Should the initial question set include the full stated range or begin with a smaller beginner-safe range?

## Step 2 complete

The staff-placement page now contains a typed configuration for Piano, Violin, Guitar, and Trumpet. Changing the selected instrument redraws the preview immediately:

- Piano renders a grand staff with treble and bass clefs.
- Violin, Guitar, and Trumpet render a treble-clef staff.
- Each view exposes the written range and notation note associated with its configuration.

The staff SVG is presentation-only at this stage. The next implementation step should turn its line and space model into ordered, accessible answer slots before adding drag or click placement.

## Decision pending

The MVP instrument list remains Piano, Violin, Guitar, and Trumpet. The interaction model is click-to-place rather than drag-and-drop: the target note is shown separately, staff positions highlight on hover or keyboard focus, and the learner clicks a position to place the note.

## Step 3 complete Click based placement scaffolding

The staff-placement page now includes the first interactive placement shell:

- The target note is presented as “Place the A on the staff” with a visible note token.
- Every ordered staff position is rendered as an accessible SVG button for the selected instrument. Piano exposes positions on both treble and bass staves; the other instruments expose positions on the treble staff.
- Each line and space position now has a horizontal hit area spanning the staff’s note region, while its vertical coordinate remains the musical pitch position. Hover and keyboard focus highlight the full row. Click, Enter, or Space selects it.
- The selected note marker is intentionally smaller than the hit area so the learner can still distinguish whether it sits on a staff line or in a space.
- A selected position remains visible and can be replaced or cleared before submission.
- Submit locks the placement and makes the no-scoring status explicit; correctness rules and result recording are intentionally deferred to validation.

The next implementation step is to connect these position identifiers to the musical note model and accepted-position sets, beginning with the MVP question data. This will allow the same click interaction to grade valid repeated-note positions without changing the visual shell.

## MVP note identity decision

The first version will not use octaves. A target note will be represented by its letter and optional accidental, such as `A` or `B flat`. Prompts and grading will remain octave-independent for now. The position model will still preserve the distinction between line and space locations so the quiz can support multiple valid placements for the same note letter. Octave-aware written and sounding pitches can be added later without changing the click interaction.

## Step 4 complete Note position mapping and first grading rule

The first note model is now wired into the staff interaction. Each visible position carries its diatonic note letter, using the appropriate sequence for treble and bass clefs. The current target is `A`, and Submit compares the selected position’s letter with that target. Because the MVP is octave-independent, every visible A position is accepted and other line or space positions receive an incorrect-placement message.

The page keeps the selected position, its mapped note letter, and the submission result separate from the SVG presentation. This leaves room to add accidentals, question generation, and richer accepted-position sets without changing the click targets.

## Mapping correction

The initial clef mapping used the wrong staff anchor and has been corrected. The five staff lines are now the reference point: treble positions start from bottom-line `E`, and bass positions start from bottom-line `G`. This preserves the correct line and space letters while keeping octaves out of the MVP grading model.

For treble clef specifically, the five staff lines are `E4 – G4 – B4 – D5 – F5` from bottom to top, and the four spaces are `F4 – A4 – C5 – E5`. The MVP omits octave values from the learner-facing note identity, but retains this pitch-aware mapping internally so line and space placement remains correct.

The regular position labels are numbered top-to-bottom to match the visual staff: treble space 1 is `E`, space 2 is `C`, space 3 is `A`, and space 4 is `F` at the bottom. Equivalently, the musical spaces read bottom-to-top as `F – A – C – E`. The MVP currently stops at the five staff lines and four spaces; ledger positions below or above the staff are deferred until instrument-specific ranges are provided. The bass staff is anchored to its actual top and bottom lines rather than sharing the treble offset.

## Ledger-position decision

Below-staff ledger positions have been removed from the current interaction. They will be added back selectively when the instrument-specific note ranges and question sets define which positions are required above or below each staff.

## Quiz feedback rule

Staff-position hover, focus, and accessibility labels identify only the location, such as `Treble staff space 4`; they do not reveal the note letter. This preserves the recall task. Note-letter feedback is shown only after submission.

## Step 5 complete Instrument question data and accepted positions

The staff-placement route now has a typed MVP question bank for each instrument. The banks currently use natural note letters only, consistent with the octave-independent MVP decision; accidentals and octave-aware targets remain deferred.

Each selected instrument starts with its own first question. After a correct submission, the learner can advance to the next question in that instrument's bank. Changing instruments resets the question sequence and clears the current placement.

Grading now derives an explicit set of accepted position identifiers from the current target note and the selected staff configuration. Every visible position with the target's note letter is accepted, including repeated positions across the treble and bass staves for Piano. The click targets and presentation-only SVG remain unchanged.

Focused linting passes for the staff-placement route. The project-wide lint and type checks still report failures in unrelated pre-existing files, including `identification/page.tsx`, `FriendsPage/index.tsx`, `NavigationHeader.tsx`, and `auth.ts`; these were not modified by this step.

## Next clarification needed

Before expanding the question banks or reintroducing ledger positions, confirm whether the first graded set should stay natural-note-only or include accidental targets such as B flat and F sharp. The current implementation assumes natural notes until that choice is made.

## Step 6 complete Two-phase start flow and instrument lock

The staff-placement route now opens with an instrument-selection screen only. The learner chooses Piano, Violin, Guitar, or Trumpet and clicks **Next** to start the quiz.

After Next, the selection module disappears and the quiz module is shown. The selected instrument is displayed as locked for the session, and the instrument selector is no longer rendered or changeable while answering questions. The selected instrument therefore remains the staff and grading configuration for the active quiz.

Focused lint passes for the route. The existing project-wide TypeScript failures remain in `FriendsPage/index.tsx`; they are unrelated to this flow change.

## Step 7 complete Simplified locked-in quiz view

After the instrument is locked, the large introductory Staff Placement Quiz module no longer appears. The quiz view is now a single staff module containing the locked instrument label, target note, staff interaction, feedback, and the Submit placement button directly below the staff.

Focused lint continues to pass for the staff-placement route.

## Step 8 complete Advance after incorrect answers

Submitting an incorrect placement no longer requires the learner to select the correct position. The answer is locked, feedback explains that the response was incorrect, and the button beneath the staff changes to **Next question**. Correct and incorrect submissions now follow the same progression path.

Focused lint passes for the staff-placement route.

## Step 12 complete Rebased instrument-selection foundation

The staff-placement work was rebased onto Ethan Nguyen's instrument-selection PR (PR 75, `origin/preferred-instrument`, commit `f2846eb`). The shared instrument-selection foundation is now part of the working history alongside the quiz changes.

## Step 13 complete Backend-owned question generation and validation

Question generation and placement validation have moved out of the frontend. The backend now exposes:

- `POST /staff-placement/start`, which accepts the selected instrument and returns a short-lived quiz session, a randomized ten-question bank, octave-aware note identities, the instrument metadata, and the displayable staff positions.
- `POST /staff-placement/validate`, which accepts the quiz ID, question ID, and selected position ID and returns the authoritative correct/incorrect result and feedback.

The frontend no longer creates or shuffles question banks and no longer decides whether a placement is correct. It renders the backend-provided questions and staff positions, then submits the learner's selected position.

## Step 14 complete Octave-aware note identities

Staff positions and target prompts now preserve full written note names, including octave values such as `A2`, `A3`, `A4`, and `A5`. Treble and bass positions use their correct pitch anchors, and piano questions can be generated from either staff.

## Step 15 complete Color-coded feedback and hint

Correct placement feedback is displayed in green and incorrect placement feedback is displayed in red. The quiz also includes a **Show hint** control. The backend supplies a hint for the active question indicating whether the target belongs on a line or in a space; the frontend reveals or hides that hint without deriving answer validity locally.

The selected staff position continues to use the musical-note marker introduced in Step 11.

Validation status: backend Python compilation, frontend focused ESLint, and `git diff --check` pass. The project-wide TypeScript check still reports unrelated existing errors in `FriendsPage/index.tsx`.

## Step 9 complete In-session score and completion screen

The quiz now tracks correct answers in memory for the active session. Correct submissions increment the score; incorrect submissions do not. No score, answer history, or quiz result is persisted to long-term storage.

The score is intentionally hidden while the learner is answering questions. After the final question in the selected instrument's question bank, the quiz displays a completion screen with the final result in the form `You scored X out of Y`. A **Start over** action returns to instrument selection and resets the in-session score.

Focused lint passes for the staff-placement route.

The hollow position indicators follow one consistent diagonal across the staff rather than appearing in one vertical column. Because the horizontal offset increases uniformly with each staff position, all space indicators share the same diagonal and all line indicators follow the same slope. This horizontal offset is presentation-only; the answer remains determined by the selected line or space.

## Step 10 complete Randomized ten-question session bank

The quiz now generates a fresh ten-question bank when the learner starts a session. The selected instrument's existing note pool is repeated as needed, shuffled, and trimmed to ten questions. This keeps the question set balanced across the available note identities while changing the order for each new session.

The generated bank remains fixed for the active session, so question progression, grading, and the completion score all use the same ten-question sequence. Starting over or changing instruments clears the previous session bank and creates a new one when the next quiz begins.

Focused lint passes for the staff-placement route.

## Step 11 complete Music-note placement marker

When a learner selects a staff position, the selected-position marker now displays a musical note glyph instead of a dot. The existing position hit area, hover behavior, keyboard interaction, and accessibility label remain unchanged. Unselected and hovered positions continue to use hollow circular indicators so the selected note is visually distinct.

Focused lint passes for the staff-placement route.
