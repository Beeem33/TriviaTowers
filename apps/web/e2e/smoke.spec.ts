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
