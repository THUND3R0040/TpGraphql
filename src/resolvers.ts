import { GraphQLError } from "graphql";
import { cvs, users, skills, cvSkills } from "./_db";
import { v4 as uuidv4 } from "uuid";
import { pubSub } from "./pubsub";

const resolvers = {
  Query: {
    getAllCvs: () => cvs,
    getCvById: (_: any, { id }: { id: string }) => {
      return cvs.find((cv) => cv.id === id);
    },
  },
  Mutation: {
    addCv: (_: any, { input }: any, context: { pubSub: typeof pubSub }) => {
      const userExists = users.some((user) => user.id === input.user_id);
      if (!userExists) {
        throw new GraphQLError(
          `Utilisateur avec id '${input.user_id}' introuvable.`,
          {
            extensions: { http: { status: 404 } },
          }
        );
      }

      const invalidSkillIds = input.skill_ids.filter(
        (skillId: string) => !skills.some((skill) => skill.id === skillId)
      );
      if (invalidSkillIds.length > 0) {
        throw new GraphQLError(
          `Compétences inexistantes : ${invalidSkillIds.join(", ")}`,
          { extensions: { http: { status: 404 } } }
        );
      }

      const newCv = {
        id: uuidv4(),
        name: input.name,
        age: input.age,
        job: input.job,
        user_id: input.user_id,
      };
      cvs.push(newCv);

      input.skill_ids.forEach((skillId: string) => {
        cvSkills.push({ cv_id: newCv.id, skill_id: skillId });
      });
      context.pubSub.publish("cvAdded", { cvAdded: newCv });
      return newCv;
    },

    updateCv: (_: any, { input }: any, context: { pubSub: typeof pubSub }) => {
      const index = cvs.findIndex((cv) => cv.id === input.id);
      if (index === -1) {
        throw new GraphQLError(`CV avec id '${input.id}' introuvable.`, {
          extensions: { http: { status: 404 } },
        });
      }

      if (input.user_id) {
        const userExists = users.some((user) => user.id === input.user_id);
        if (!userExists) {
          throw new GraphQLError(
            `Utilisateur avec id '${input.user_id}' introuvable.`,
            { extensions: { http: { status: 404 } } }
          );
        }
      }

      if (input.skill_ids) {
        const invalidSkillIds = input.skill_ids.filter(
          (skillId: string) => !skills.some((skill) => skill.id === skillId)
        );
        if (invalidSkillIds.length > 0) {
          throw new GraphQLError(
            `Compétences inexistantes : ${invalidSkillIds.join(", ")}`,
            { extensions: { http: { status: 404 } } }
          );
        }
      }

      const updatedCv = {
        ...cvs[index],
        ...input,
      };
      cvs[index] = updatedCv;

      if (input.skill_ids) {
        for (let i = cvSkills.length - 1; i >= 0; i--) {
          if (cvSkills[i].cv_id === input.id) {
            cvSkills.splice(i, 1);
          }
        }
        input.skill_ids.forEach((skillId: string) => {
          cvSkills.push({ cv_id: input.id, skill_id: skillId });
        });
      }
      context.pubSub.publish("cvUpdated", { cvUpdated: updatedCv });
      return updatedCv;
    },
    deleteCv: (
      _: any,
      { id }: { id: string },
      context: { pubSub: typeof pubSub }
    ) => {
      const cvIndex = cvs.findIndex((cv) => cv.id === id);

      if (cvIndex === -1) {
        throw new GraphQLError(`CV avec id '${id}' introuvable.`, {
          extensions: { http: { status: 404 } },
        });
      }

      cvs.splice(cvIndex, 1);

      for (let i = cvSkills.length - 1; i >= 0; i--) {
        if (cvSkills[i].cv_id === id) {
          cvSkills.splice(i, 1);
        }
      }
      context.pubSub.publish("cvDeleted", { cvDeleted: true });
      return true;
    },
  },
  Cv: {
    user: (parent: any) => {
      console.log("Resolving user for CV:", parent);
      return users.find((user) => user.id === parent.user_id);
    },
    skills: (parent: any) => {
      const cvSkillsForCv = cvSkills.filter(
        (cvSkill) => cvSkill.cv_id === parent.id
      );
      return cvSkillsForCv.map((cvSkill) => {
        return skills.find((skill) => skill.id === cvSkill.skill_id);
      });
    },
  },
  Subscription: {
    cvAdded: {
      subscribe: (
        parent: unknown,
        args: {},
        context: { pubSub: typeof pubSub }
      ) => context.pubSub.subscribe("cvAdded"),
    },
    cvUpdated: {
      subscribe: (
        parent: unknown,
        args: {},
        context: { pubSub: typeof pubSub }
      ) => context.pubSub.subscribe("cvUpdated"),
    },
    cvDeleted: {
      subscribe: (
        parent: unknown,
        args: {},
        context: { pubSub: typeof pubSub }
      ) => context.pubSub.subscribe("cvDeleted"),
    },
  },
};

export default resolvers;
