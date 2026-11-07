import { test, expect, type Page } from "@playwright/test";

async function answerAll(page: Page) {
  for (let i = 0; i < 10; i++) {
    const prompt = page.locator("#question-prompt");
    await expect(prompt).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("group", { name: "Answers" }).getByRole("button").first()).toBeEnabled();
    await page.keyboard.press(String((i % 4) + 1)); // keyboard answering
    await page.getByRole("button", { name: /Next question|See my tower/ }).click();
  }
}

test("homepage shows the daily challenge and primary actions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "TriviaTowers.io home" })).toBeVisible();
  await expect(page.getByText(/Daily Tower #\d+/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Play Today’s Tower/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Quick Build" })).toBeVisible();
  await expect(page.getByText(/New tower in \d\d:\d\d:\d\d/)).toBeVisible();
});

test("a full Quick Build can be played to the results screen", async ({ page }) => {
  await page.goto("/play?mode=quick");
  await answerAll(page);
  await expect(page.getByRole("heading", { name: /Perfect Builder|Sky high|Solid tower|Nice start|Tiny but mighty/ })).toBeVisible();
  await expect(page.getByText("Final score")).toBeVisible();
  await expect(page.getByRole("list", { name: "Answers by question" }).getByRole("listitem")).toHaveCount(10);
  await expect(page.getByRole("button", { name: /Share my tower/ })).toBeVisible();
});

test("the daily tower is one attempt per day on this device, with a practice replay", async ({ page }) => {
  await page.goto("/play?mode=daily");
  await answerAll(page);
  await expect(page.getByText("Final score")).toBeVisible();

  await page.goto("/play?mode=daily");
  await expect(page.getByText(/You’ve built today’s tower/)).toBeVisible();
  await page.getByRole("button", { name: /Practice replay/ }).click();
  await expect(page.getByText(/Practice replay — your saved result won’t change/)).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Built today ✓")).toBeVisible();
});

test("a wrong or timed-out answer reveals the correct one", async ({ page }) => {
  await page.goto("/play?mode=quick");
  await expect(page.locator("#question-prompt")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Correct!|Not quite!|Time's up!/)).toBeVisible({ timeout: 20_000 }); // wait out the 15 s timer
  await expect(page.getByText(/Time's up!/)).toBeVisible();
  await expect(page.getByRole("button", { name: /correct answer/ })).toBeVisible();
});

test("challenge links show who challenged you", async ({ page }) => {
  // ["Alex", 1234, 8, 8, 10, 6]
  const ch = Buffer.from(JSON.stringify(["Alex", 1234, 8, 8, 10, 6])).toString("base64url");
  await page.goto(`/play?mode=quick&ch=${ch}`);
  await expect(page.getByText(/Alex/)).toBeVisible();
  await expect(page.getByText(/challenged you/)).toBeVisible();
});

test("Endless Tower runs until three lives are lost", async ({ page }) => {
  await page.goto("/play?mode=endless");
  await expect(page.getByLabel("3 of 3 lives left")).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 300; i++) {
    if (await page.getByText("Final score").isVisible()) break;
    const first = page.getByRole("group", { name: "Answers" }).getByRole("button").first();
    if (await first.isEnabled().catch(() => false)) await page.keyboard.press("1");
    await page.getByRole("button", { name: /Next question|See my tower/ }).click({ timeout: 5_000 }).catch(() => {});
  }
  await expect(page.getByText("Final score")).toBeVisible();
  await expect(page.getByText("Endless Tower", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Climb again" })).toBeVisible();
});

test("finishing a round earns XP, and the profile lets you equip unlocked items", async ({ page }) => {
  await page.goto("/play?mode=quick");
  await answerAll(page);
  await expect(page.getByText(/^\+\d+ XP$/)).toBeVisible();
  await expect(page.getByText(/Level \d+ · /).first()).toBeVisible();

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Tower skins" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Achievements" })).toBeVisible();
  await expect(page.getByText("Reach level 10")).toBeVisible(); // Space Island is locked for a new player
  const grassland = page.getByRole("listitem").filter({ hasText: "Grassland" });
  await expect(grassland.getByText("Equipped")).toBeVisible();
});

test("info pages load", async ({ page }) => {
  const pages: [string, string][] = [
    ["/how-to-play", "How to Play"],
    ["/about", "About TriviaTowers"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Use"],
  ];
  for (const [path, heading] of pages) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});
