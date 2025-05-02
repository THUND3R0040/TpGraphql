import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema";
import { pubSub } from "./pubsub";
import { PrismaClient } from '@prisma/client'; // Import PrismaClient

// Create Prisma Client instance
const prisma = new PrismaClient();

// Create a Yoga instance with a GraphQL schema and context including Prisma and PubSub.
const yoga = createYoga({
  schema,
  context: { pubSub, prisma }, // Add prisma to the context
});

// Pass it into a server to hook into request handlers.
const server = createServer(yoga);

// Start the server and you're done!
server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql");
});

// Optional: Graceful shutdown - disconnect Prisma when the server stops
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed. Prisma disconnected.');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed. Prisma disconnected.');
    process.exit(0);
  });
});