"""PROMPT 11 browser QA for EDUNI Baduk save/resume feature."""
from playwright.sync_api import sync_playwright
import time
import json

BASE = "http://127.0.0.1:8080"
BADUK_URL = f"{BASE}/baduk"
STORAGE_KEY = "eduni.baduk.v1"


def run_qa():
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # --- Test 1: Save after moves, reload, verify restore ---
        print("TEST 1: Save/resume round trip")
        ctx = browser.new_context(viewport={"width": 1024, "height": 768})
        page = ctx.new_page()
        page.goto(BADUK_URL, wait_until="networkidle")
        time.sleep(2)

        initial_moves = page.evaluate("document.getElementById('moveCount').textContent")
        assert initial_moves == "0", f"Expected 0, got {initial_moves}"
        print("  Fresh board: 0 moves")

        # Disable coach for direct moves
        page.evaluate("document.getElementById('coachEnabled').click()")
        time.sleep(0.3)

        # Click on board
        canvas = page.locator("#board")
        dims = page.evaluate("""() => {
            const c = document.getElementById('board');
            const rect = c.getBoundingClientRect();
            return {w: rect.width, h: rect.height};
        }""")
        canvas.click(position={"x": dims["w"] // 2, "y": dims["h"] // 2})
        time.sleep(3)

        move_count = int(page.evaluate("document.getElementById('moveCount').textContent"))
        has_storage = page.evaluate(f"!!window.localStorage.getItem('{STORAGE_KEY}')")
        print(f"  After move: {move_count} moves, localStorage: {has_storage}")

        if move_count >= 1 and has_storage:
            results.append(("Save after moves", "PASS"))
        else:
            results.append(("Save after moves", "FAIL", f"moves={move_count}, storage={has_storage}"))

        # Reload and verify restore
        page.reload(wait_until="networkidle")
        time.sleep(2)

        restored_moves = int(page.evaluate("document.getElementById('moveCount').textContent"))
        print(f"  After reload: {restored_moves} moves")

        if restored_moves >= 1:
            results.append(("Restore after reload", "PASS"))
        else:
            results.append(("Restore after reload", "FAIL", f"moves={restored_moves}"))

        ctx.close()

        # --- Test 2: Clear on new game ---
        print("\nTEST 2: Clear on new game")
        ctx2 = browser.new_context(viewport={"width": 1024, "height": 768})
        page2 = ctx2.new_page()
        page2.goto(BADUK_URL, wait_until="networkidle")
        time.sleep(2)

        page2.evaluate("document.getElementById('coachEnabled').click()")
        time.sleep(0.3)

        dims2 = page2.evaluate("""() => {
            const c = document.getElementById('board');
            const rect = c.getBoundingClientRect();
            return {w: rect.width, h: rect.height};
        }""")
        page2.locator("#board").click(position={"x": dims2["w"] // 2, "y": dims2["h"] // 2})
        time.sleep(3)

        page2.click("#newGame")
        time.sleep(0.5)

        moves_after = int(page2.evaluate("document.getElementById('moveCount').textContent"))
        cleared = page2.evaluate(f"!window.localStorage.getItem('{STORAGE_KEY}')")
        print(f"  After new game: moves={moves_after}, storage cleared={cleared}")

        if moves_after == 0 and cleared:
            results.append(("Clear on new game", "PASS"))
        else:
            results.append(("Clear on new game", "FAIL", f"moves={moves_after}, cleared={cleared}"))

        ctx2.close()

        # --- Test 3: Level change saves ---
        print("\nTEST 3: Level change saves new level")
        ctx3 = browser.new_context(viewport={"width": 1024, "height": 768})
        page3 = ctx3.new_page()
        page3.goto(BADUK_URL, wait_until="networkidle")
        time.sleep(2)

        page3.select_option("#level", "intermediate")
        time.sleep(1)
        page3.evaluate("document.getElementById('coachEnabled').click()")
        time.sleep(0.3)

        dims3 = page3.evaluate("""() => {
            const c = document.getElementById('board');
            const rect = c.getBoundingClientRect();
            return {w: rect.width, h: rect.height};
        }""")
        page3.locator("#board").click(position={"x": dims3["w"] // 2, "y": dims3["h"] // 2})
        time.sleep(3)

        saved = page3.evaluate(f"""(() => {{
            const raw = window.localStorage.getItem('{STORAGE_KEY}');
            if (!raw) return null;
            return JSON.parse(raw);
        }})()""")

        if saved and saved.get("levelId") == "intermediate" and saved.get("boardSize") == 13:
            results.append(("Level change saves", "PASS"))
            print("  13x13 saved correctly")
        else:
            results.append(("Level change saves", "FAIL", f"Got: {saved}"))
            print(f"  FAIL: {saved}")

        ctx3.close()

        # --- Test 4: Mobile viewport ---
        print("\nTEST 4: Mobile viewport save/resume")
        ctx4 = browser.new_context(viewport={"width": 375, "height": 667})
        page4 = ctx4.new_page()
        page4.goto(BADUK_URL, wait_until="networkidle")
        time.sleep(2)

        page4.evaluate("document.getElementById('coachEnabled').click()")
        time.sleep(0.3)

        dims4 = page4.evaluate("""() => {
            const c = document.getElementById('board');
            const rect = c.getBoundingClientRect();
            return {w: rect.width, h: rect.height};
        }""")
        page4.locator("#board").click(position={"x": dims4["w"] // 2, "y": dims4["h"] // 2})
        time.sleep(3)

        mobile_moves = int(page4.evaluate("document.getElementById('moveCount').textContent"))
        mobile_storage = page4.evaluate(f"!!window.localStorage.getItem('{STORAGE_KEY}')")
        print(f"  Mobile: moves={mobile_moves}, storage={mobile_storage}")

        if mobile_moves >= 1 and mobile_storage:
            results.append(("Mobile save", "PASS"))
        else:
            results.append(("Mobile save", "FAIL", f"moves={mobile_moves}"))

        ctx4.close()

        # --- Test 5: engine.saveGame function exists and works ---
        print("\nTEST 5: engine.saveGame function")
        ctx5 = browser.new_context(viewport={"width": 1024, "height": 768})
        page5 = ctx5.new_page()
        page5.goto(BADUK_URL, wait_until="networkidle")
        time.sleep(2)

        has_save = page5.evaluate("typeof window.EDUNIBadukEngine?.saveGame === 'function'")
        if has_save:
            results.append(("engine.saveGame exists", "PASS"))
            print("  saveGame is a function")
        else:
            results.append(("engine.saveGame exists", "FAIL"))
            print("  FAIL: saveGame not a function")

        page5.evaluate("window.EDUNIBadukEngine.saveGame()")
        saved = page5.evaluate(f"!!window.localStorage.getItem('{STORAGE_KEY}')")
        if saved:
            results.append(("engine.saveGame works", "PASS"))
            print("  saveGame wrote to localStorage")
        else:
            results.append(("engine.saveGame works", "FAIL"))
            print("  FAIL: saveGame did not write")

        ctx5.close()

        # --- Test 6: 13x13 board saves correctly ---
        print("\nTEST 6: 13x13 save/resume")
        ctx6 = browser.new_context(viewport={"width": 1024, "height": 768})
        page6 = ctx6.new_page()
        page6.goto(BADUK_URL, wait_until="networkidle")
        time.sleep(2)

        page6.select_option("#level", "intermediate")
        time.sleep(1)
        page6.evaluate("document.getElementById('coachEnabled').click()")
        time.sleep(0.3)

        dims6 = page6.evaluate("""() => {
            const c = document.getElementById('board');
            const rect = c.getBoundingClientRect();
            return {w: rect.width, h: rect.height};
        }""")
        page6.locator("#board").click(position={"x": dims6["w"] // 2, "y": dims6["h"] // 2})
        time.sleep(3)

        saved_13 = page6.evaluate(f"""(() => {{
            const raw = window.localStorage.getItem('{STORAGE_KEY}');
            if (!raw) return null;
            return JSON.parse(raw);
        }})()""")

        if saved_13 and saved_13.get("boardSize") == 13:
            results.append(("13x13 save", "PASS"))
            print(f"  13x13 saved with {saved_13.get('moveCount')} moves")
        else:
            results.append(("13x13 save", "FAIL", f"Got: {saved_13}"))
            print(f"  FAIL: {saved_13}")

        ctx6.close()
        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    passes = sum(1 for r in results if r[1] == "PASS")
    fails = sum(1 for r in results if r[1] == "FAIL")
    for name, status, *detail in results:
        d = f" ({detail[0]})" if detail else ""
        print(f"  [{status}] {name}{d}")
    print(f"\nTotal: {passes} PASS, {fails} FAIL out of {len(results)}")
    return fails == 0


if __name__ == "__main__":
    ok = run_qa()
    exit(0 if ok else 1)
