import "server-only";

import mongoose from "mongoose";

import { getMongoUri } from "@/lib/env";
import { AppError } from "@/lib/errors";

interface MongooseCache {
  promise: Promise<typeof mongoose> | null;
}

// Reuse the connection across hot reloads in development and across
// invocations of a warm serverless function in production.
const globalForMongoose = globalThis as typeof globalThis & { __mongoose?: MongooseCache };
const cache: MongooseCache = (globalForMongoose.__mongoose ??= { promise: null });

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!cache.promise) {
    cache.promise = mongoose.connect(getMongoUri(), {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
    });
  }
  try {
    return await cache.promise;
  } catch (error) {
    cache.promise = null;
    console.error("[mongodb] Connection failed:", error);
    throw new AppError(
      503,
      "database_unavailable",
      "Could not connect to the database. Check MONGODB_URI and that this machine's IP is allowed in MongoDB Atlas → Network Access.",
    );
  }
}
