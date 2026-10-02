import { randomInt } from "node:crypto";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomId(length: number): string {
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[randomInt(ALPHABET.length)];
  return id;
}

/** Internal identifier, used for API calls and the Cloudinary folder. */
export const generateProjectId = () => randomId(12);

/** Public identifier: the project lives at site-url/<slug>. */
export const generateSlug = () => randomId(8);

const PROJECT_ID_RE = /^[a-z0-9]{12}$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/;

export const isValidProjectId = (value: unknown): value is string =>
  typeof value === "string" && PROJECT_ID_RE.test(value);

export const isValidSlug = (value: unknown): value is string =>
  typeof value === "string" && SLUG_RE.test(value);

export const isValidObjectId = (value: unknown): value is string =>
  typeof value === "string" && OBJECT_ID_RE.test(value);
