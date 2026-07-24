import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { startWorkers } from './workers/postPublisher';
import { closeBrowser } from './utils/playwright';

async function main() {
  startWorkers();

  const server = app.listen(env.port, () => {
    logger.info(`Server listening on http://localhost:${env.port} (API + SPA same origin)`);
    logger.info(`Playwright dry-run: ${env.playwrightDryRun}`);
  });

  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    await closeBrowser();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
