// JobSphere Admin — new file, safe to delete without affecting core app
import mongoose from "mongoose";

// Admin service connects to BOTH existing databases as secondary/read connections.
// We use separate mongoose connections (not the default) so they stay isolated.

export let authConn = null;
export let jobsConn = null;
export let adminConn = null;

export const connectDatabases = async () => {
  // Admin DB — stores Admin users and ModerationLog (could share authdb or be separate)
  adminConn = await mongoose.createConnection(process.env.MONGO_URI_AUTH).asPromise();

  // Read connections to existing databases
  authConn = await mongoose.createConnection(process.env.MONGO_URI_AUTH).asPromise();
  jobsConn = await mongoose.createConnection(process.env.MONGO_URI_JOBS).asPromise();

  console.log("Admin service connected to authdb + jobsdb");
};
