# GQL - CV Management GraphQL API

## Description

This project implements a GraphQL API for managing Curricula Vitae (CVs). It allows users to perform CRUD (Create, Read, Update, Delete) operations on CVs, associating them with users and skills. The API also supports real-time updates via GraphQL subscriptions.

## Features

*   **GraphQL API:** Provides a standard GraphQL interface for interacting with CV data.
*   **CV Management:**
    *   Create new CVs with name, age, job, associated user, and skills.
    *   Retrieve a list of all CVs or a specific CV by its ID.
    *   Update existing CVs.
    *   Delete CVs.
*   **Relational Data:** Manages relationships between CVs, Users, and Skills.
*   **Real-time Updates:** Uses GraphQL subscriptions to notify clients about CV additions, updates, and deletions.
*   **In-Memory Data Store:** Currently uses a simple in-memory data store (`src/_db.ts`) for demonstration purposes.

## Technology Stack

*   **Runtime:** Node.js
*   **Language:** TypeScript
*   **GraphQL Server:** `graphql-yoga`
*   **GraphQL Implementation:** `graphql`
*   **Build/Dev Tool:** `@swc-node/register` for fast TypeScript execution
*   **IDs:** `uuid` for generating unique identifiers

## Project Structure

```
TpGraphql/
├── .git/
├── .gitignore
├── package-lock.json
├── package.json         # Project dependencies and scripts
├── src/
│   ├── _db.ts           # In-memory data store (CVs, Users, Skills)
│   ├── index.ts         # Server entry point (sets up graphql-yoga)
│   ├── pubsub.ts        # PubSub instance for GraphQL subscriptions
│   ├── resolvers.ts     # Implementation logic for GraphQL operations
│   ├── schema.graphql   # GraphQL schema definition (types, queries, mutations, subscriptions)
│   └── schema.ts        # Combines schema definition and resolvers
└── tsconfig.json        # TypeScript configuration (Assumed, common for TS projects)
```

## API Schema Overview

The core schema is defined in `src/schema.graphql`.

**Types:**

*   `Cv`: Represents a CV (id, name, age, job, user, skills).
*   `User`: Represents a user (id, name, email, role, cvs).
*   `Skill`: Represents a skill (id, designation, cvs).
*   `Role`: Enum (`ADMIN`, `USER`).

**Queries:**

*   `getAllCvs: [Cv!]!`
*   `getCvById(id: ID!): Cv`

**Mutations:**

*   `addCv(input: CreateCvInput!): Cv!`
*   `updateCv(input: UpdateCvInput!): Cv!`
*   `deleteCv(id: ID!): Boolean!`

**Subscriptions:**

*   `cvAdded: Cv!`
*   `cvUpdated: Cv!`
*   `cvDeleted: Boolean!`

*(Input types `CreateCvInput` and `UpdateCvInput` are also defined.)*

## Implementation Highlights

### Resolvers (`src/resolvers.ts`)

Resolvers connect the GraphQL schema operations to the actual data manipulation logic.

*   **Data Fetching:** Queries like `getAllCvs` and `getCvById` directly access the in-memory arrays from `_db.ts`.
*   **Data Modification:** Mutations (`addCv`, `updateCv`, `deleteCv`) perform input validation (e.g., checking if users/skills exist), modify the in-memory arrays, generate UUIDs for new CVs, and manage the `cvSkills` join array.
*   **Relationships:** Type resolvers for `Cv` (`user`, `skills`) fetch associated data by looking up IDs in the corresponding arrays.
*   **Subscriptions:** Mutations publish events (e.g., `cvAdded`) using the `pubSub` instance. Subscription resolvers simply subscribe to these events.

```typescript
// Example: addCv Mutation Resolver (simplified)
addCv: (_: any, { input }: any, context: { pubSub: typeof pubSub }) => {
  // ... validation ...
  const newCv = {
    id: uuidv4(),
    name: input.name,
    // ... other fields
  };
  cvs.push(newCv);
  // ... handle skill associations ...
  context.pubSub.publish("cvAdded", { cvAdded: newCv }); // Publish event
  return newCv;
},
```

### Server Setup (`src/index.ts`)

The server uses `graphql-yoga` to serve the schema and resolvers.

```typescript
import { createServer } from "node:http";
import { createYoga } from "graphql-yoga";
import { schema } from "./schema"; // Combined schema and resolvers
import { pubSub } from "./pubsub"; // PubSub for subscriptions

const yoga = createYoga({ schema, context: { pubSub } }); // Inject pubSub into context
const server = createServer(yoga);

server.listen(4000, () => {
  console.info("Server is running on http://localhost:4000/graphql");
});
```

## Running the Project

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The server will start on `http://localhost:4000/graphql`. You can access the GraphQL Playground in your browser at this address to interact with the API.
