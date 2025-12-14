import express, { type Express } from "express";
import morgan from "morgan";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { documentsRouter } from "./routes/documents.js";
import { errorHandler, notFoundHandler } from "./middlewares/errors.js";

const app: Express = express();

app.use(cors());

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use(morgan("dev"));
app.use(express.json());

app.use("/api/documents", documentsRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
