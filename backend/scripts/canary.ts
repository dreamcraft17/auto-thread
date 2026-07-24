#!/usr/bin/env tsx
import { runCanary } from '../src/workers/maintenance';
import { closeBrowser } from '../src/utils/playwright';

async function main() {
  const result = await runCanary();
  console.log(result.detail);
  await closeBrowser();
  process.exit(result.ok ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await closeBrowser();
  process.exit(1);
});
