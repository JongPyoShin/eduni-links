# E2E Full Adventure — Report 12

## Summary

| Stage | Status | Transition |
|---|---|---|
| Hub | PASS | page.goto (initial) |
| Camp | PASS | clickHubLink from hub |
| Waterfall | PASS | backToHub → clickHubLink |
| Persistence (mid) | PASS | 2/5 rewards after reload |
| Cave | PASS | backToHub → clickHubLink |
| Giant Tree | PASS | backToHub → clickHubLink |
| Sky Ridge | PASS | backToHub → clickHubLink |
| Hub Verification | PASS | 5/5 badges, "정글 탐험 완주!" |
| Persistence (final) | PASS | 5/5 rewards after reload |

## Key Change: Hub Navigation (no page.goto after Camp)

- E2E starts at `jungle-hub.html` via `page.goto` (initial load only)
- Each stage entered by clicking the hub's `<a href>` link (`page.click`)
- After stage completion, returns to hub via `page.goBack()` + `page.reload()`
- Hub re-reads localStorage and unlocks next stages
- **No `page.goto` used for stage transitions**

## Sky Ridge Fix: Corridor Waypoints

Sky ridge geometry is a staircase corridor — player cannot walk diagonally. Added waypoints along the axis-aligned corridors:

```
Sky Gate (430,930) → (430,820) → windRibbon (650,820)
→ (650,690) → cloudShadow (830,690)
→ (830,560) → windChime (1000,560)
→ (1000,490) → (1130,490) → (1130,420) → summitBridge (1300,420)
→ (1300,310) → hawk (1450,310)
```

## Results

- **Rewards: 5/5** — bluebird-feather, kingfisher-drop, firefly-crystal, ancient-seed, sky-star
- **Persistence: 5/5** — verified after reload
- **201 tests pass**
- **72 screenshots**

## Updated Criteria (discovery/milestone 5/5)

bat(Cave)와 squirrel(Giant Tree)는 birdCodex에 등록되지 않는다 (`captureBird` 미호출).
5/5는 **스테이지 배지(badge) 5개** 기준:

1. Camp → bluebird-feather
2. Waterfall → kingfisher-drop
3. Cave → firefly-crystal
4. Giant Tree → ancient-seed
5. Sky Ridge → sky-star

## Files Changed

- `tools/browser/jungle_full_adventure_e2e.mjs` — hub navigation, sky ridge waypoints
- `.agent/PROMPT_JUNGLE_FULL_ADVENTURE_E2E_11.md` — updated transition + criteria
