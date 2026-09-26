import { expect, test, type CDPSession, type Locator, type Page, type TestInfo } from "@playwright/test";

const PARENT = "Parent. Press and hold to open.";
const TEACHER = "Teacher. Press and hold to open.";
const HOLD_MS = 2200;

function parent(page: Page): Locator {
  return page.getByRole("button", { name: PARENT });
}

function teacher(page: Page): Locator {
  return page.getByRole("button", { name: TEACHER });
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Hold control is not visible");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function mobile(testInfo: TestInfo): boolean {
  return testInfo.project.name === "iphone" || testInfo.project.name === "pixel";
}

const sessions = new WeakMap<Page, CDPSession>();

async function touchSession(page: Page) {
  const existing = sessions.get(page);
  if (existing) return existing;
  const session = await page.context().newCDPSession(page);
  sessions.set(page, session);
  return session;
}

type TouchPhase = "start" | "move" | "end" | "cancel";

/**
 * WebKit (desktop Safari and the iPhone profile) exposes `Touch` but throws
 * "Illegal constructor". Pointer events with pointerType "touch" still run,
 * and a real TouchEvent is sent when the constructor works.
 */
async function dispatchPointerTouch(page: Page, phase: TouchPhase, x: number, y: number): Promise<void> {
  await page.evaluate(
    ({ phase, x, y }) => {
      const target =
        phase === "start"
          ? document.elementFromPoint(x, y)?.closest("button")
          : document.querySelector(".hold-button.is-holding");
      if (!target) {
        if (phase === "start") throw new Error("No hold button at the touch point");
        return;
      }
      const pointerName =
        phase === "start" ? "pointerdown" : phase === "move" ? "pointermove" : phase === "end" ? "pointerup" : "pointercancel";
      target.dispatchEvent(
        new PointerEvent(pointerName, {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          pointerId: 1,
          clientX: x,
          clientY: y,
          button: 0,
          buttons: phase === "end" || phase === "cancel" ? 0 : 1,
          isPrimary: true,
        }),
      );
      try {
        if (typeof Touch !== "function" || typeof TouchEvent !== "function") return;
        const touch = new Touch({ identifier: 1, target, clientX: x, clientY: y });
        const ended = phase === "end" || phase === "cancel";
        const touchName =
          phase === "start" ? "touchstart" : phase === "move" ? "touchmove" : phase === "end" ? "touchend" : "touchcancel";
        target.dispatchEvent(
          new TouchEvent(touchName, {
            bubbles: true,
            cancelable: true,
            touches: ended ? [] : [touch],
            targetTouches: ended ? [] : [touch],
            changedTouches: [touch],
          }),
        );
      } catch {
        // Playwright WebKit throws on `new Touch`. The pointer event above is the gesture.
      }
    },
    { phase, x, y },
  );
}

async function touchStart(page: Page, x: number, y: number): Promise<void> {
  if (page.context().browser()?.browserType().name() === "chromium") {
    const session = await touchSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y, id: 0 }],
    });
    return;
  }
  await dispatchPointerTouch(page, "start", x, y);
}

async function touchMove(page: Page, x: number, y: number): Promise<void> {
  if (page.context().browser()?.browserType().name() === "chromium") {
    const session = await touchSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y, id: 0 }],
    });
    return;
  }
  await dispatchPointerTouch(page, "move", x, y);
}

async function touchEnd(page: Page, x: number, y: number): Promise<void> {
  if (page.context().browser()?.browserType().name() === "chromium") {
    const session = await touchSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    return;
  }
  await dispatchPointerTouch(page, "end", x, y);
}

async function cancelTouch(page: Page, x: number, y: number): Promise<void> {
  await dispatchPointerTouch(page, "cancel", x, y);
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await expect(parent(page)).toBeVisible();
});

test("a full hold opens Parent", async ({ page }, testInfo) => {
  if (mobile(testInfo)) {
    const point = await center(parent(page));
    await touchStart(page, point.x, point.y);
    await page.waitForTimeout(400);
    await cancelTouch(page, point.x, point.y);
  } else {
    const point = await center(parent(page));
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
  }
  await expect(page.locator("[data-screen='parent']")).toBeVisible({ timeout: HOLD_MS + 3000 });
});

test("letting go early stays on the start screen", async ({ page }, testInfo) => {
  const point = await center(parent(page));
  if (mobile(testInfo)) {
    await touchStart(page, point.x, point.y);
    await page.waitForTimeout(350);
    await touchEnd(page, point.x, point.y);
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.waitForTimeout(350);
    await page.mouse.up();
  }
  await page.waitForTimeout(HOLD_MS);
  await expect(page.locator("[data-screen='start']")).toBeVisible();
});

test("a small drift still counts and a large drift cancels", async ({ page }, testInfo) => {
  const point = await center(parent(page));
  if (mobile(testInfo)) {
    await touchStart(page, point.x, point.y);
    await touchMove(page, point.x + 6, point.y + 2);
  } else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await page.mouse.move(point.x + 6, point.y + 2);
  }
  await expect(parent(page)).toHaveClass(/is-holding/);

  if (mobile(testInfo)) await touchMove(page, point.x + 48, point.y);
  else await page.mouse.move(point.x + 48, point.y);
  await expect(parent(page)).not.toHaveClass(/is-holding/);
  if (mobile(testInfo)) await touchEnd(page, point.x + 48, point.y);
  else await page.mouse.up();
  await page.waitForTimeout(HOLD_MS);
  await expect(page.locator("[data-screen='start']")).toBeVisible();
});

test("holding Enter or Space opens Parent", async ({ page }) => {
  await parent(page).focus();
  await page.keyboard.down("Enter");
  await expect(page.locator("[data-screen='parent']")).toBeVisible({ timeout: HOLD_MS + 3000 });

  await page.goto("./");
  await teacher(page).focus();
  await page.keyboard.down("Space");
  await expect(page.locator("[data-screen='teacher']")).toBeVisible({ timeout: HOLD_MS + 3000 });
});

test("releasing Enter early does not open", async ({ page }) => {
  await parent(page).focus();
  await page.keyboard.down("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.up("Enter");
  await page.waitForTimeout(HOLD_MS);
  await expect(page.locator("[data-screen='start']")).toBeVisible();
});

test("the pill fill advances during the hold", async ({ page }, testInfo) => {
  const point = await center(parent(page));
  if (mobile(testInfo)) await touchStart(page, point.x, point.y);
  else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
  }
  await page.waitForTimeout(700);
  const amount = await parent(page).evaluate((node) => Number(getComputedStyle(node).getPropertyValue("--hold")));
  expect(amount).toBeGreaterThan(0.2);
  expect(amount).toBeLessThan(0.7);
  if (mobile(testInfo)) await touchEnd(page, point.x, point.y);
  else await page.mouse.up();
});
