import { test, expect } from '@playwright/test';

test.describe.serial('Family flow', () => {
  test('family member can react to a story and ask a question that surfaces on Today', async ({
    page,
  }) => {
    // Switch to family persona
    await page.goto('/family?persona=family');
    await expect(page.getByText(/'s stories/i)).toBeVisible();

    // The story's heart starts at 🤍 (count 0); click it to react
    const heartButton = page.getByLabel('Add heart').first();
    await heartButton.click();
    await expect(page.getByLabel('Remove heart').first()).toBeVisible();

    // Ask a question
    const composer = page.getByPlaceholder(/something you've always wanted to know/i);
    await composer.fill('What was your favorite holiday meal as a child?');
    await page.getByRole('button', { name: /^Send$/ }).click();
    await expect(page.getByText(/Sent/i)).toBeVisible({ timeout: 10_000 });

    // Switch to senior persona and visit Today
    await page.goto('/?persona=senior');
    await expect(page.getByText(/From your family/i)).toBeVisible();
    await expect(
      page.getByText(/What was your favorite holiday meal as a child\?/i),
    ).toBeVisible();
  });
});
