import { expect, test, type Page } from "@playwright/test";
import { solvePrompt } from "./solveGate";

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

const mia = {
  activeId: "mia",
  profiles: [
    {
      id: "mia",
      name: "Mia",
      ageRange: "4",
      animal: "fox",
      createdAt: "2026-09-01T15:00:00.000Z",
      stars: 3,
      days: {},
      readingMs: { "2026-09-01": 300000 },
    },
  ],
};

function solve(prompt: string): number {
  return solvePrompt(prompt);
}

async function openMenu(page: Page) {
  await page.getByRole("button", { name: "Grown-ups", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const prompt = await dialog.getByRole("heading").innerText();
  const expected = solve(prompt);
  const buttons = dialog.locator(".gate-choice");
  const count = await buttons.count();
  for (let i = 0; i < count; i += 1) {
    if (Number(await buttons.nth(i).innerText()) === expected) {
      await buttons.nth(i).click();
      break;
    }
  }
  await expect(page.locator("[data-screen='grownups']")).toBeVisible();
  const hint = page.getByRole("status").getByRole("button", { name: "OK" });
  if (await hint.count()) await hint.click();
}

test("schools stay hidden until sign-in is set up", async ({ page }, testInfo) => {
  await page.goto("./");
  await expect(page.getByRole("button", { name: /sign in/i })).toHaveCount(0);
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  await expect(page.locator("[data-auth='off']")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create school" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in with Apple" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign in with Google" })).toHaveCount(0);
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_off_iphone.png", fullPage: true });
  }
});

test("a school admin creates a school and an invite link", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("littlenest-auth-preview", "school-admin");
  });
  await page.goto("./");
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  const account = page.locator("[data-section='account']");
  await expect(account).toHaveAttribute("data-role", "admin");
  await expect(account).toHaveAttribute("data-auth", "on");
  await page.getByLabel("School name").fill("Kids Villa");
  await page.getByRole("button", { name: "Create school" }).click();
  await expect(page.locator("[data-school='Kids Villa']")).toBeVisible();
  await expect(page.getByText("0 teachers")).toBeVisible();
  await page.getByLabel("Teacher email").fill("teacher@example.com");
  await page.getByRole("button", { name: "Invite teacher" }).click();
  await expect(page.locator("[data-invite-link]")).toContainText("schoolInvite");
  await expect(page.locator("[data-invite-state='pending']")).toBeVisible();
  await expect(page.getByRole("img", { name: /QR code/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend invite" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Clever", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "ClassLink", exact: true })).toHaveCount(0);
  if (testInfo.project.name === "iphone") {
    await page.locator("[data-section='account']").screenshot({ path: "/opt/cursor/artifacts/school_admin_iphone.png" });
    await page.locator("[data-invite-state='pending']").screenshot({ path: "/opt/cursor/artifacts/school_invite_iphone.png" });
  }
  if (testInfo.project.name === "pixel") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_admin_pixel.png", fullPage: true });
  }
  if (testInfo.project.name === "chromium") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_admin_desktop.png", fullPage: true });
  }
});

test("a teacher sees only their class and can link the classroom device", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("littlenest-auth-preview", "school-teacher");
  });
  await page.goto("./");
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  const account = page.locator("[data-section='account']");
  await expect(account).toHaveAttribute("data-role", "teacher");
  await expect(page.getByText("Kids Villa")).toBeVisible();
  await expect(page.locator("[data-roster='teacher']")).toBeVisible();
  await expect(page.locator("[data-class-code='BUNNY-42']")).toBeVisible();
  await expect(page.getByRole("img", { name: "QR code BUNNY-42" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Move to/ })).toHaveCount(0);
  const child = page.locator("[data-child='mia']");
  await expect(child).toContainText("Mia");
  await expect(child).toContainText("3 stars");
  await expect(child).toContainText("5 min");
  await expect(child).toContainText("Letters");
  await expect(child).toHaveAttribute("data-parent-state", "pending");
  const sheet = page.locator("[data-sheet='take-home']");
  await expect(sheet).toContainText("LittleNest");
  await expect(sheet).toContainText("NEST-18");
  await expect(sheet).toContainText("A grown-up opens LittleNest.");
  await expect(page.getByRole("button", { name: "Print take-home sheet" })).toBeVisible();
  await expect(page.getByText("Clever")).toBeVisible();
  await page.getByLabel("Class code on this device").fill("BUNNY-42");
  await page.getByRole("button", { name: "Link this device" }).click();
  await expect(page.getByText("This device is linked to BUNNY-42.")).toBeVisible();
  if (testInfo.project.name === "iphone") {
    const classQr = page.getByRole("img", { name: "QR code BUNNY-42" });
    await classQr.scrollIntoViewIfNeeded();
    await classQr.screenshot({ path: "/opt/cursor/artifacts/school_class_qr_iphone.png" });
    await page.getByRole("heading", { name: "Bunnies" }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: "/opt/cursor/artifacts/school_roster_iphone.png" });
    await sheet.scrollIntoViewIfNeeded();
    await sheet.screenshot({ path: "/opt/cursor/artifacts/school_take_home_iphone.png" });
  }
  if (testInfo.project.name === "pixel") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_teacher_pixel.png", fullPage: true });
  }
});

test("a parent sees their child only after they agree", async ({ page }, testInfo) => {
  await page.addInitScript((saved) => {
    localStorage.setItem("littlenest-auth-preview", "school-parent");
    localStorage.setItem("kids-app-profiles-v1", JSON.stringify(saved));
    localStorage.setItem("kids-app-silent-hint-v1", "1");
  }, mia);
  await page.goto("./");
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  const account = page.locator("[data-section='account']");
  await expect(account).toHaveAttribute("data-role", "parent");
  await expect(page.getByText("No child is linked yet.")).toBeVisible();
  await expect(page.locator("[data-child='mia']")).toHaveCount(0);
  await page.getByLabel("Join code from the teacher").fill("BUNNY-42");
  await page.getByRole("checkbox", { name: "practice days, active minutes, and session length, as class totals, with no names" }).check();
  await page.getByRole("button", { name: "Join class" }).click();
  await expect(page.getByText("That join code was not found.")).toBeVisible();
  await expect(page.locator("[data-child='mia']")).toHaveCount(0);
  await page.getByLabel("Join code from the teacher").fill("NEST-18");
  await page.getByRole("button", { name: "Join class" }).click();
  await expect(page.locator("[data-child='mia']")).toContainText("Mia");
  await expect(page.locator("[data-child='mia']")).toContainText("fox");
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_parent_iphone.png", fullPage: true });
  }
  if (testInfo.project.name === "pixel") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_parent_pixel.png", fullPage: true });
  }
});

test("a link fills the code before the grown-up agrees", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("littlenest-auth-preview", "school-parent");
  });
  await page.goto("./?parentCode=nest-18");
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  await expect(page.getByLabel("Join code from the teacher")).toHaveValue("NEST-18");
  await expect(page.locator("[data-child='mia']")).toHaveCount(0);
});

test("a teacher invite link fills the code", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("littlenest-auth-preview", "signed-in");
  });
  await page.goto("./?schoolInvite=owl-17");
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  await page.getByRole("button", { name: "Teacher", exact: true }).click();
  await expect(page.getByLabel("Teacher invite code")).toHaveValue("OWL-17");
});

test("a class link fills the classroom code", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("littlenest-auth-preview", "school-teacher");
  });
  await page.goto("./?classCode=bunny-42");
  await openMenu(page);
  await page.getByRole("button", { name: /Account/ }).click();
  await expect(page.getByLabel("Class code on this device")).toHaveValue("BUNNY-42");
});
