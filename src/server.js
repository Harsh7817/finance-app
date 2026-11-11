require('dotenv').config();
const app = require('./app');
const prisma = require('./config/prisma');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

server.on('error', (error) => {
  console.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

/**
 * Graceful shutdown handling
 */
const gracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('Database connection closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error disconnecting Prisma:', err);
      process.exit(1);
    }
  });

  // Force shutdown after timeout if pending connections hang
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
