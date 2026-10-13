import { MongoClient } from "mongodb";

const client = new MongoClient("mongodb://127.0.0.1:27017/storageApp");

export async function connectDB() {
  await client.connect();
  const db = client.db();
  console.log("database connected", db.databaseName);
  return db;
}

process.on("SIGINT", async () => {
  await client.close();
  console.log("database dis-connected");
  process.exit(0);
});
