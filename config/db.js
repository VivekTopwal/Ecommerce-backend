import mongoose from "mongoose";

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: "next1_app_db",
        });

        console.log(`MongoDB Connected ...`);
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1); 
    }
};

export default connectDB;
