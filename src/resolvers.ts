import { GraphQLError } from "graphql";
// Remove imports from './_db'
// import { cvs, users, skills, cvSkills } from "./_db";
// import { v4 as uuidv4 } from "uuid";
import { pubSub } from "./pubsub";
import { PrismaClient, User, Cv, Skill } from '@prisma/client'; // Import Prisma types if needed

// Define the context type including PrismaClient
interface Context {
  pubSub: typeof pubSub;
  prisma: PrismaClient;
}

const resolvers = {
  Query: {
    getAllCvs: async (_: any, __: any, { prisma }: Context) => {
      return await prisma.cv.findMany({
        include: { // Include related user and skills
          user: true,
          skills: true,
        },
      });
    },
    getCvById: async (_: any, { id }: { id: string }, { prisma }: Context) => {
      const cv = await prisma.cv.findUnique({
        where: { id },
        include: { // Include related user and skills
          user: true,
          skills: true,
        },
      });
      // Optional: Throw error if not found, Prisma returns null otherwise
      // if (!cv) {
      //   throw new GraphQLError(`CV avec id '${id}' introuvable.`, {
      //     extensions: { http: { status: 404 } },
      //   });
      // }
      return cv;
    },
  },
  Mutation: {
    addCv: async (_: any, { input }: any, { prisma, pubSub }: Context) => {
      const { name, age, job, user_id, skill_ids } = input;

      // Prisma automatically checks if the user_id exists due to the relation constraint
      // However, for a better error message, you might still check explicitly
      const userExists = await prisma.user.findUnique({ where: { id: user_id } });
      if (!userExists) {
         throw new GraphQLError(
          `Utilisateur avec id '${user_id}' introuvable.`,
          { extensions: { http: { status: 404 } } }
         );
      }

      // Check if all skills exist
       const existingSkills = await prisma.skill.findMany({
         where: { id: { in: skill_ids } },
       });
       if (existingSkills.length !== skill_ids.length) {
         const foundSkillIds = existingSkills.map(s => s.id);
         const invalidSkillIds = skill_ids.filter((id: string) => !foundSkillIds.includes(id));
         throw new GraphQLError(
           `Compétences inexistantes : ${invalidSkillIds.join(", ")}`,
           { extensions: { http: { status: 404 } } }
         );
       }

      try {
        const newCv = await prisma.cv.create({
          data: {
            name,
            age,
            job,
            userId: user_id, // Connect to the user
            skills: {
              connect: skill_ids.map((skillId: string) => ({ id: skillId })), // Connect to existing skills
            },
          },
          include: { // Include relations in the returned object
            user: true,
            skills: true,
          }
        });

        pubSub.publish("cvAdded", { cvAdded: newCv });
        return newCv;
      } catch (error: any) {
        // Handle potential Prisma errors (e.g., unique constraint violations)
        console.error("Error adding CV:", error);
        throw new GraphQLError("Impossible d'ajouter le CV.", { extensions: { http: { status: 500 } } });
      }
    },

    updateCv: async (_: any, { input }: any, { prisma, pubSub }: Context) => {
      const { id, skill_ids, ...updateData } = input;

      // Check if CV exists
      const cvExists = await prisma.cv.findUnique({ where: { id } });
      if (!cvExists) {
         throw new GraphQLError(`CV avec id '${id}' introuvable.`, {
           extensions: { http: { status: 404 } },
         });
      }

      // If user_id is being updated, check if the new user exists
      if (updateData.user_id) {
          const userExists = await prisma.user.findUnique({ where: { id: updateData.user_id } });
          if (!userExists) {
             throw new GraphQLError(
              `Utilisateur avec id '${updateData.user_id}' introuvable.`,
              { extensions: { http: { status: 404 } } }
             );
          }
          // Rename user_id to userId for Prisma relation
          updateData.userId = updateData.user_id;
          delete updateData.user_id;
      }


      // If skills are being updated, check if they exist
      let skillConnections = {};
      if (skill_ids) {
         const existingSkills = await prisma.skill.findMany({
             where: { id: { in: skill_ids } },
         });
         if (existingSkills.length !== skill_ids.length) {
             const foundSkillIds = existingSkills.map(s => s.id);
             const invalidSkillIds = skill_ids.filter((skillId: string) => !foundSkillIds.includes(skillId));
             throw new GraphQLError(
               `Compétences inexistantes : ${invalidSkillIds.join(", ")}`,
               { extensions: { http: { status: 404 } } }
             );
         }
         // Use 'set' to replace all existing skills with the new list
         skillConnections = {
             skills: {
                 set: skill_ids.map((skillId: string) => ({ id: skillId })),
             },
         };
      }


      try {
        const updatedCv = await prisma.cv.update({
          where: { id },
          data: {
            ...updateData, // Update basic fields
            ...skillConnections, // Update skills relationship
          },
           include: { // Include relations in the returned object
            user: true,
            skills: true,
          }
        });

        pubSub.publish("cvUpdated", { cvUpdated: updatedCv });
        return updatedCv;
      } catch (error: any) {
        console.error("Error updating CV:", error);
         // Handle potential Prisma errors
         if (error.code === 'P2025') { // Prisma error code for record not found (might happen in race conditions)
             throw new GraphQLError(`CV avec id '${id}' introuvable lors de la mise à jour.`, { extensions: { http: { status: 404 } } });
         }
        throw new GraphQLError("Impossible de mettre à jour le CV.", { extensions: { http: { status: 500 } } });
      }
    },
    deleteCv: async (_: any, { id }: { id: string }, { prisma, pubSub }: Context) => {
       try {
         // Attempt to delete. Prisma will throw an error if the ID doesn't exist (P2025)
         await prisma.cv.delete({
           where: { id },
         });
         pubSub.publish("cvDeleted", { cvDeleted: true });
         return true;
       } catch (error: any) {
          console.error("Error deleting CV:", error);
         // P2025 is the Prisma error code for "Record to delete does not exist."
         if (error.code === 'P2025') {
             throw new GraphQLError(`CV avec id '${id}' introuvable.`, {
               extensions: { http: { status: 404 } },
             });
         }
         throw new GraphQLError("Impossible de supprimer le CV.", { extensions: { http: { status: 500 } } });
       }
    },
  },

  // Type Resolvers: Prisma handles basic field resolution.
  // We only need these if the field name in GraphQL differs from Prisma
  // or if we need custom logic. Prisma's 'include' in Query/Mutation
  // handles fetching related User and Skills automatically now.
  // So, we can often remove these type resolvers:

  // Cv: {
  //   user: async (parent: Cv, _: any, { prisma }: Context) => {
  //     // This can be fetched via `include` in the parent query/mutation
  //     // If not included, you could fetch it here:
  //     // return await prisma.user.findUnique({ where: { id: parent.userId } });
  //     return parent.user; // Assumes 'user' was included
  //   },
  //   skills: async (parent: Cv, _: any, { prisma }: Context) => {
  //      // This can be fetched via `include` in the parent query/mutation
  //     // If not included, you could fetch it here:
  //     // return await prisma.cv.findUnique({ where: { id: parent.id } }).skills();
  //     return parent.skills; // Assumes 'skills' was included
  //   },
  // },

  Subscription: { // Subscriptions remain the same, relying on pubSub
    cvAdded: {
      subscribe: (_: unknown, __: {}, { pubSub }: Context) =>
        pubSub.subscribe("cvAdded"),
    },
    cvUpdated: {
      subscribe: (_: unknown, __: {}, { pubSub }: Context) =>
        pubSub.subscribe("cvUpdated"),
    },
    cvDeleted: {
      subscribe: (_: unknown, __: {}, { pubSub }: Context) =>
        pubSub.subscribe("cvDeleted"),
    },
  },
};

export default resolvers;
