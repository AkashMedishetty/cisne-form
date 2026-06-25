import { MongoClient, type Db, type Collection } from "mongodb";

/**
 * Cached MongoDB connection.
 *
 * In development the module is reloaded on every change, so we stash the client
 * promise on the global object to avoid opening a new connection on each reload.
 */

export interface SubmissionDoc {
  name: string;
  email: string; // stored lowercase, unique
  /** File name derived from the user's name (used for exports), e.g. "jane-doe.jpg". */
  fileName: string;
  /** Original uploaded file name. */
  originalName: string;
  /** Public Vercel Blob URL. */
  blobUrl: string;
  /** Vercel Blob pathname (used for deletion). */
  blobPathname: string;
  contentType: string;
  size: number;
  createdAt: Date;
}

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your environment (.env.local).");
  }

  if (!globalForMongo._mongoClientPromise) {
    const client = new MongoClient(uri);
    globalForMongo._mongoClientPromise = client.connect();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(process.env.MONGODB_DB || "cibc");
}

let indexEnsured = false;

export async function getSubmissions(): Promise<Collection<SubmissionDoc>> {
  const db = await getDb();
  const collection = db.collection<SubmissionDoc>("submissions");

  if (!indexEnsured) {
    // Case-insensitive uniqueness is handled by always lowercasing email before
    // storing, plus this unique index as the hard guarantee against duplicates.
    await collection.createIndex({ email: 1 }, { unique: true });
    indexEnsured = true;
  }

  return collection;
}
