import { expect, test, type Page } from "@playwright/test";

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
  const sum = prompt.match(/(\d+)\s*\+\s*(\d+)/);
  if (sum) return Number(sum[1]) + Number(sum[2]);
  const word = prompt.match(/number ([a-z]+)/i)?.[1]?.toLowerCase() ?? "";
  const value = WORDS[word];
  if (!value) throw new Error(`Could not read the grown-up check: ${prompt}`);
  return value;
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
  await expect(page.getByRole("button", { name: "Clever", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "ClassLink", exact: true })).toHaveCount(0);
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_admin_iphone.png", fullPage: true });
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
  await expect(page.locator("[data-class-code='BUNNY-42']")).toBeVisible();
  const child = page.locator("[data-child='mia']");
  await expect(child).toContainText("Mia");
  await expect(child).toContainText("3 stars");
  await expect(child).toContainText("5 min");
  await expect(child).toContainText("Letters");
  await expect(page.getByText("Clever")).toBeVisible();
  await page.getByLabel("Class code on this device").fill("BUNNY-42");
  await page.getByRole("button", { name: "Link this device" }).click();
  await expect(page.getByText("This device is linked to BUNNY-42.")).toBeVisible();
  if (testInfo.project.name === "iphone") {
    await page.screenshot({ path: "/opt/cursor/artifacts/school_teacher_iphone.png", fullPage: true });
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
  await page.getByRole("checkbox", { name: /I agree to share/ }).check();
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
