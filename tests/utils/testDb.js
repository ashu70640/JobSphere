import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

/**
 * Connect to a fresh in-memory MongoDB instance.
 * Sets process.env.MONGO_URI so services can read it.
 */
export const connect = async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
  return uri;
};

/**
 * Drop the DB, close the connection, stop the server.
 */
export const disconnect = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
};

/**
 * Delete all documents from every collection — called between tests.
 */
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

/**
 * Return the current mongoose connection (useful for assertions).
 */
export const getConnection = () => mongoose.connection;
