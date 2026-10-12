import "server-only";

import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * One page view of a published project. No IP address is stored: visitors are
 * identified only by a salted hash of IP + user agent (enough to count unique
 * visitors, not to identify a person). Records expire after ~13 months.
 */
const visitSchema = new Schema(
  {
    projectId: { type: String, required: true },
    at: { type: Date, required: true, default: () => new Date() },
    visitorId: { type: String, required: true },
    deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "bot"], required: true },
    os: { type: String, required: true },
    browser: { type: String, required: true },
    bot: { type: String },
    /** ISO country code, region and city from the host's geo headers. */
    country: { type: String },
    region: { type: String },
    city: { type: String },
    /** Host of the referring site ("" for direct visits). */
    referrer: { type: String, default: "" },
    /** Path inside the project, e.g. "" (home) or "about.html". */
    path: { type: String, default: "" },
  },
  { versionKey: false },
);

visitSchema.index({ projectId: 1, at: -1 });
visitSchema.index({ at: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });

export type VisitRecord = InferSchemaType<typeof visitSchema>;

export const Visit: Model<VisitRecord> =
  (models.Visit as Model<VisitRecord> | undefined) ?? model<VisitRecord>("Visit", visitSchema);
