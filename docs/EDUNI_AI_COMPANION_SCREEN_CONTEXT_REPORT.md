# EDUNI AI Companion: current-screen context coverage

The companion resolves context again when the child presses Send and, while its panel is open, checks only that fixed projection for changes. A changed projection clears the previous answer and aborts an in-flight reply. It reads only named visible question/choice nodes or the explicitly listed board projections below; it does not scan the page body, inspect source question records, read arbitrary input values, or inspect parent/reading pages. The on-screen label describes whether it is using the current problem, visible text, a board summary, or general guidance. The model is instructed to prioritize this context and to say when requested screen details are not available rather than guess.

| Screen | Projection sent | Limit |
| --- | --- | --- |
| Pattern training, Sudoku | Existing adapter's current prompt, visible choices/selection, and visible board projection | Uses the existing adapter contract; no solution is sent. |
| Space exploration | Visible title/copy and visible choice text | Pictures, diagrams, and 3-D shapes are omitted; model is told this. |
| Facto practice | Visible question title/visual text, visible choice labels, checked visible choice | Free-text answer fields and source question records are excluded. |
| Hanja quiz | Visible question and visible choice labels; whether a choice is selected | Access code, answer, accepted answers, and typed answer are excluded. |
| Bubble game | Visible prompt and visible answer-bubble labels | Hidden answer index and explanations are excluded. |
| Jungle quizzes | Visible quiz text and choices when their quiz panel is shown | Jungle map/canvas is not interpreted. |
| Baduk | Explicit engine projection: board cells (B/W/.) and side to move/game-over flag | No coach preview, previous position, captures, or AI rationale. Board is a compact textual summary, not strategy analysis. |
| Omok | Visible rendered stones in the board grid and visible turn label | No hint/undo/AI internals. |
| Link, Bubble Shooter, other visual-only pages | Fixed activity guidance only; no current board/question state | Child should describe the visible part. Canvas graphics are not interpreted. |

The server and bridge accept only the fixed activity names and four context fields (`activity`, `question`, `choices`, `selected`); question text is bounded to 600 characters and choices to 10 strings of at most 60 characters. These limits accommodate a compact 19×19 Baduk board. Context is educationally useful but incomplete by design.

## Safety and deployment boundary

## Independent verification (2026-10-03)

- Full Python suite: 218 tests, zero failures, one dedicated PostgreSQL integration test skipped; content validator PASS.
- Independent real-widget Node fixture PASS: visible text, hidden nodes, full 19×19 board, private-state omission, missing-board fallback, send-time snapshot and stale-response suppression.
- Adversarial review found FACTO transparent checkbox inputs were incorrectly treated as invisible selections. Implementation now uses the associated visible label; independent regression fixture proves both visible selection and hidden-label omission.
- Real top-level headed Chrome on an isolated loopback preview: asked “지금 몇 줄 판이고 누구 차례야?” without describing the screen; the actual connected provider replied “9줄 바둑판 … 흑 차례”. Changing to 13×13 cleared the old answer. Current-screen label and a desktop screenshot were successfully observed. This is not a full mobile/voice or every-route browser acceptance.
- No production services, host 8080/8081, Docker volumes, merge or deployment were changed. Preview uses synthetic empty-board context and temporary storage only.

## Safety and deployment boundary (continued)

This remains a parent-supervised prototype for synthetic educational text. It is not cleared for independent child deployment. Screen projection does not make the external provider safe for arbitrary personal data; do not enter names, school, address, contact details, or private records. A privacy/safety review and the required provider/data-processing controls are still a go/no-go gate before broader deployment.
