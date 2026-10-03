/**
 * Runs once when the server starts: open the MongoDB connection early so the
 * first visitor doesn't pay for the connection handshake (often 1–3 s to a
 * remote Atlas cluster).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.MONGODB_URI) return;
  const { connectToDatabase } = await import("@/lib/db/mongodb");
  connectToDatabase().catch(() => {
    // Logged by connectToDatabase; requests will retry.
  });
}
