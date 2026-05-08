import { test, expect } from '@playwright/test';

test.describe.serial('Phase 1 demo target', () => {
  test('senior records a story end-to-end and finds it in Stories', async ({ page }) => {
    // Reset to senior persona to make the test deterministic
    await page.goto('/?persona=senior');

    // Today screen renders the prompt
    await expect(page.getByRole('heading', { level: 2 })).toBeVisible();

    // Find a chapter with at least one unanswered prompt (the senior may have
    // already answered everything in the default chapter from prior test runs).
    const chapterLabels = [
      'Early Childhood',
      'School Years',
      'Young Adulthood',
      'Building a Family',
      'Career & Work',
      'Reflections & Wisdom',
      'Memorable Stories on Your Mind',
      'Information, Knowledge & Practical Skills',
    ];
    const recordButton = page.getByRole('button', { name: /tap to record/i });
    let foundChapter = false;
    for (const label of chapterLabels) {
      await page.getByRole('button', { name: label, exact: true }).click();
      if (await recordButton.isVisible().catch(() => false)) {
        foundChapter = true;
        break;
      }
    }
    expect(foundChapter, 'no chapter has any unanswered prompts').toBe(true);

    // Record
    await recordButton.click();
    await expect(page.getByText(/Recording…/i)).toBeVisible();

    // Speak (fake audio plays from fixture)
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: /tap to stop/i }).click();

    // Spinner → review screen (mock returns instantly)
    await expect(page.getByRole('button', { name: /save story/i })).toBeVisible({
      timeout: 30_000,
    });

    // Save
    await page.getByRole('button', { name: /save story/i }).click();

    // Navigate to Stories — story should appear
    await page.getByRole('link', { name: /stories/i }).first().click();
    await page.waitForURL('**/stories');
    const sections = await page.locator('section').count();
    expect(sections).toBeGreaterThan(0);
  });
});
