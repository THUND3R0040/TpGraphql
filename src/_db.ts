interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
}

export interface Cv {
  id: string;
  name: string;
  age: number;
  job: string;
  user_id: string;
}

interface Skill {
  id: string;
  designation: string;
}

interface CvSkill {
  cv_id: string;
  skill_id: string;
}

export const users: User[] = [
  { id: "u1", name: "Alice", email: "alice@example.com", role: "ADMIN" },
  { id: "u2", name: "Bob", email: "bob@example.com", role: "USER" },
  { id: "u3", name: "Charlie", email: "charlie@example.com", role: "USER" },
  { id: "u4", name: "David", email: "david@example.com", role: "USER" },
];

export const cvs: Cv[] = [
  { id: "c1", name: "Alice's CV", age: 30, job: "Developer", user_id: "u1" },
  { id: "c2", name: "Bob's CV", age: 25, job: "Designer", user_id: "u2" },
  { id: "c3", name: "Charlie's CV", age: 28, job: "Manager", user_id: "u3" },
  { id: "c4", name: "DX CV", age: 35, job: "Analyst", user_id: "u2" },
];

export const skills: Skill[] = [
  { id: "s1", designation: "JavaScript" },
  { id: "s2", designation: "TypeScript" },
  { id: "s3", designation: "React" },
  { id: "s4", designation: "CSS" },
  { id: "s5", designation: "HTML" },
];

export const cvSkills: CvSkill[] = [
  { cv_id: "c1", skill_id: "s1" },
  { cv_id: "c1", skill_id: "s2" },
  { cv_id: "c2", skill_id: "s3" },
  { cv_id: "c3", skill_id: "s4" },
  { cv_id: "c4", skill_id: "s5" },
];
