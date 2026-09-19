import { openDatabase } from "../src/server/db/database.ts";
const db = openDatabase();
db.close();
console.log("SQLite database initialized. The catalog is seeded on first application use.");
