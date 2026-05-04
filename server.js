// import dotenv from "dotenv";
// dotenv.config();

// import express from "express";
// import cors from "cors";

// import connectDB from "./config/db.js";
// import adminRoutes from "./routes/adminRoutes.js";
// import publicRoutes from "./routes/publicRoutes.js";
// import cartRoutes from "./routes/cartRoutes.js";
// import wishlistRoutes from "./routes/wishlistRoutes.js";
// import orderRoutes from "./routes/orderRoutes.js";
// import authRoutes from "./routes/authRoutes.js";


// const app = express();
// connectDB();

// app.use(cors({
//   origin: 'http://localhost:3000', 
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id']
// }));


// app.use(express.json());
// app.use("/uploads", express.static("uploads"));

// app.use("/api/auth", authRoutes);
// app.use("/api/cart", cartRoutes);
// app.use("/api/wishlist", wishlistRoutes);
// app.use("/api/orders", orderRoutes);
// app.use("/api", publicRoutes); 
// app.use("/api/admin", adminRoutes);


// app.get("/", (req, res) => {
//   res.send("API running...");
// });

// app.listen(5000, () => {
//   console.log("Server running on port 5000");
// });


import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import connectDB from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
connectDB();

const allowedOrigins = [
  "http://localhost:3000",
  "https://your-frontend.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", publicRoutes);
app.use("/api/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("API running...");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});