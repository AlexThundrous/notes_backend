import { MongoClient } from "mongodb";

const connectionString = process.env.ATLAS_URI || "mongodb+srv://saguet:hDvvx0bjiSdjUm5D@cluster0.rziqxob.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(connectionString);

let conn;
try {
  conn = await client.connect();
  console.log("Connected to MongoDB Atlas");
} catch(e) {
  console.error("Error connecting to MongoDB Atlas:", e);
}

const db = conn.db("profiles");

export default db;
