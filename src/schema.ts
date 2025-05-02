import { createSchema } from "graphql-yoga";
import * as fs from "fs";
import resolvers from "./resolvers";

export const schema = createSchema({
  typeDefs: fs.readFileSync("./src/schema.graphql", "utf-8"),
  resolvers: resolvers,
});
