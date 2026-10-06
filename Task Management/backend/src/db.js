import mongoose from "mongoose";
import { config } from "./config.js";
import { User } from "./models/User.js";
import { UserRole } from "./models/UserRole.js";

export async function connectDatabase() {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  // Sync / Migrate roles for all registered users in database
  try {
    const users = await User.find({});
    for (const user of users) {
      const userRoleDoc = await UserRole.findOne({ userId: user._id });
      const currentRole = user.role || userRoleDoc?.role || "user";
      
      if (!user.role) {
        await User.updateOne({ _id: user._id }, { $set: { role: currentRole } });
      }
      if (!userRoleDoc) {
        await UserRole.create({ userId: user._id, role: currentRole });
      }
    }
    if (users.length > 0) {
      console.log(`Verified & synchronized roles for ${users.length} registered user(s) in database.`);
    }
  } catch (err) {
    console.error("Error synchronizing user roles in database:", err.message);
  }
}

