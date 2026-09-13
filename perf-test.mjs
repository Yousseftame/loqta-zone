import { chromium } from 'playwright';

const URL = 'http://localhost:4174/';
const CONCURRENT_USERS = 5; // Adjust this to increase stress/load
const MAX_TIME_MS = 2000; // 2 seconds

async function runPerformanceTest() {
  console.log(`Starting performance and stress test for: ${URL}`);
  console.log(`Simulating ${CONCURRENT_USERS} concurrent users...\n`);

  const browser = await chromium.launch({ headless: true });

  const testUser = async (userId) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const startTime = Date.now();

    try {
      // Go to the URL and wait until 'load' instead of 'networkidle' to avoid timeouts from background connections (e.g., Firebase)
      await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
      
      // Wait a brief moment to ensure JS metrics are fully recorded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract Performance API metrics
      const metrics = await page.evaluate(() => {
        // First Contentful Paint (FCP)
        const paintEntries = performance.getEntriesByType('paint');
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        const fcp = fcpEntry ? fcpEntry.startTime : 0;

        // Navigation Timing (DOM Interactive)
        const timing = performance.timing;
        const domInteractive = timing.domInteractive - timing.navigationStart;

        return { fcp, domInteractive };
      });

      // Estimated Time to Interactive (TTI)
      // Playwright's 'networkidle' means there are no active network connections for at least 500ms.
      // Subtracting 500ms gives us a rough estimate of when the page actually became interactive.
      const estimatedTti = Date.now() - startTime - 500; 

      await context.close();

      return {
        userId,
        fcp: metrics.fcp,
        domInteractive: metrics.domInteractive,
        tti: estimatedTti,
        success: true
      };
    } catch (error) {
      await context.close();
      return { userId, success: false, error: error.message };
    }
  };

  // Run all users concurrently to simulate stress/load
  const promises = [];
  for (let i = 1; i <= CONCURRENT_USERS; i++) {
    promises.push(testUser(i));
  }

  const results = await Promise.all(promises);
  await browser.close();

  console.log('--- Test Results ---');
  let totalFcp = 0, totalDom = 0, totalTti = 0, successCount = 0;

  results.forEach(res => {
    if (res.success) {
      console.log(`User ${res.userId}:`);
      console.log(`  - FCP: ${Math.round(res.fcp)} ms`);
      console.log(`  - DOM Interactive: ${Math.round(res.domInteractive)} ms`);
      console.log(`  - Estimated TTI: ${Math.round(res.tti)} ms`);
      
      totalFcp += res.fcp;
      totalDom += res.domInteractive;
      totalTti += res.tti;
      successCount++;
    } else {
      console.log(`User ${res.userId}: FAILED (${res.error})`);
    }
  });

  if (successCount === 0) {
    console.error('\n❌ All requests failed. Cannot assert metrics.');
    process.exit(1);
  }

  const avgFcp = totalFcp / successCount;
  const avgDom = totalDom / successCount;
  const avgTti = totalTti / successCount;

  console.log('\n--- Average Metrics ---');
  console.log(`Avg FCP: ${Math.round(avgFcp)} ms`);
  console.log(`Avg DOM Interactive: ${Math.round(avgDom)} ms`);
  console.log(`Avg Estimated TTI: ${Math.round(avgTti)} ms\n`);

  // Assertions
  let hasErrors = false;

  const assertMetric = (name, value, threshold) => {
    if (value > threshold) {
      console.error(`❌ FAILED: ${name} (${Math.round(value)}ms) exceeded the ${threshold}ms limit!`);
      hasErrors = true;
    } else {
      console.log(`✅ PASSED: ${name} (${Math.round(value)}ms) is under ${threshold}ms.`);
    }
  };

  assertMetric('Average FCP', avgFcp, MAX_TIME_MS);
  assertMetric('Average DOM Interactive', avgDom, MAX_TIME_MS);
  assertMetric('Average Estimated TTI', avgTti, MAX_TIME_MS);

  if (hasErrors || successCount < CONCURRENT_USERS) {
    console.error('\n❌ Performance Test Failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 Performance Test Passed Successfully!');
    process.exit(0);
  }
}

runPerformanceTest();
