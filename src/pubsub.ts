import { createPubSub } from "@graphql-yoga/subscription";
import { Cv } from "@prisma/client";

export type PubSubChannels = {
  cvAdded: [{ cvAdded: Cv }];
  cvUpdated: [{ cvUpdated: Cv }];
  cvDeleted: [{ cvDeleted: boolean }];
};

export const pubSub = createPubSub<PubSubChannels>();
