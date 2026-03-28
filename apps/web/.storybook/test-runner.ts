import type { TestRunnerConfig } from '@storybook/test-runner';

const config: TestRunnerConfig = {
  /** Run accessibility checks on every story automatically */
  async postVisit(page, context) {
    // Wait for story to fully render
    await page.waitForLoadState('domcontentloaded');

    // Take a screenshot for visual regression
    const image = await page.screenshot({ fullPage: true });
    expect(image).toMatchSnapshot(`${context.id}.png`, {
      maxDiffPixelRatio: 0.02,
    });
  },
};

export default config;
