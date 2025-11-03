# Node.js + Express + MongoDB Backend Learning Guide

## Architecture Overview

- **Typical Request Lifecycle**

	```text
	Client → HTTP Request → Express Route → Controller Logic → Service/DB Layer → MongoDB → Response Builder → HTTP Response
	```

- **Layered/MVC Breakdown**
	- **Routes** map URLs to controller functions (`Router` instances keep endpoints modular).
	- **Controllers** handle request validation, orchestrate business logic, and craft consistent responses.
	- **Models** define MongoDB collections via Mongoose schemas, encapsulating validation, hooks, and instance methods.
	- **Middlewares** enrich the request/response cycle (auth, parsing, error handling, file uploads, CORS, cookies).
	- **Utilities/Helpers** centralise reusable logic (async wrappers, custom errors/responses, third-party integrations).
	- **Config** (dotenv, database connection) keeps environment-aware settings isolated from business logic.

## Standard Folder Structure

```
project/
├─ src/
│  ├─ index.js              # Entry point: loads env, connects DB, bootstraps server
│  ├─ app.js                # Express app configuration & global middleware
│  ├─ routes/               # Route modules (grouped by resource, versioned under /api)
│  ├─ controllers/          # Request handlers containing domain logic
│  ├─ models/               # Mongoose schemas & model methods
│  ├─ middlewares/          # Auth, validation, upload, error wrappers
│  ├─ db/                   # Database connection helpers
│  ├─ utils/                # Shared helpers (asyncHandler, ApiError, ApiResponse, cloud services)
│  └─ constants.js          # Shared constants (DB names, enums, limits)
├─ public/                  # Static assets or temporary upload destinations
├─ .env                     # Environment variables (never commit real secrets)
├─ package.json             # Scripts, dependencies, metadata
└─ README.md                # Learning reference (this file)
```

## Setup & Installation

```bash
# 1. Initialise project & install dependencies
npm init -y
npm install express mongoose dotenv cors cookie-parser bcrypt jsonwebtoken multer cloudinary

# 2. Add dev tooling
npm install -D nodemon prettier

# 3. Configure scripts in package.json
"scripts": {
	"dev": "nodemon -r dotenv/config src/index.js"
}

# 4. Create environment file (.env)
PORT=8000
MONGO_URI=mongodb://127.0.0.1:27017
ACCESS_TOKEN_SECRET=supersecret
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_SECRET=longersecret
REFRESH_TOKEN_EXPIRY=7d
CLOUDINARY_CLOUD_NAME=demo
CLOUDINARY_API_KEY=key
CLOUDINARY_API_SECRET=secret
CORS_ORIGIN=http://localhost:3000

# 5. Run the development server
npm run dev
```

## Core Building Blocks

### Server Bootstrap and Configuration

```js
// src/index.js
import dotenv from "dotenv"; // Load config variables from .env
import { app } from "./app.js"; // Import the prepared Express app
import connectDB from "./db/index.js"; // Helper that wires up MongoDB

dotenv.config(); // Hydrate process.env before using secrets

connectDB()
	.then(() => {
		app.listen(process.env.PORT || 8000, () => {
			console.log(`Server ready on ${process.env.PORT}`); // Confirm server boot
		});
	})
	.catch((err) => {
		console.error("DB connection failed", err); // Surface connection issues immediately
	});
```

```js
// src/app.js
import express from "express"; // Core HTTP server framework
import cors from "cors"; // Middleware to manage cross-origin access
import cookieParser from "cookie-parser"; // Simplifies cookie extraction
import userRouter from "./routes/user.routes.js"; // User-related endpoints

const app = express(); // Instantiate express application

app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true })); // Allow trusted client origins
app.use(express.json({ limit: "16kb" })); // Parse JSON payloads with controlled size
app.use(express.urlencoded({ extended: true, limit: "16kb" })); // Accept form submissions safely
app.use(express.static("public")); // Serve static assets or upload staging area
app.use(cookieParser()); // Populate req.cookies for downstream logic

app.use("/api/v1/users", userRouter); // Mount versioned user routes

export { app }; // Share configured app with index.js
```

### Routing and Controller Pattern

```js
// routes/user.routes.js
import { Router } from "express"; // Factory for modular route handlers
import { registerUser, loginUser } from "../controllers/user.controller.js"; // Auth controller actions
import { verifyJWT } from "../middlewares/auth.middleware.js"; // Protects private endpoints

const router = Router(); // Build an isolated router instance

router.post("/register", registerUser); // Handle user signup
router.post("/login", loginUser); // Authenticate and issue tokens
router.get("/profile", verifyJWT, (req, res) => res.json(req.user)); // Return profile when token valid

export default router; // Export for mounting in app.js
```

```js
// controllers/user.controller.js
import { asyncHandler } from "../utils/asyncHandler.js"; // Wrap controllers to forward async errors
import { ApiResponse } from "../utils/ApiResponse.js"; // Unified success payload helper
import { User } from "../models/user.models.js"; // Mongoose model representing users

export const registerUser = asyncHandler(async (req, res) => {
	const { fullName, email, password } = req.body; // Destructure validated input
	const user = await User.create({ fullName, email, password }); // Persist new user document
	res.status(201).json(new ApiResponse(201, user, "Registered")); // Reply with consistent shape
});
```

### Database Connection with Mongoose

```js
// db/index.js
import mongoose from "mongoose"; // ODM to talk to MongoDB

const connectDB = async () => {
	const { connection } = await mongoose.connect(
		`${process.env.MONGO_URI}/appdb`
	); // Establish DB connection using environment URI
	console.log(`MongoDB connected: ${connection.host}`); // Log the connected host
};

export default connectDB; // Allow import in server bootstrap
```

### Model Creation and CRUD Operations

```js
// models/user.models.js
import { Schema, model } from "mongoose"; // Tools for defining schemas/models
import bcrypt from "bcrypt"; // Library to hash passwords

const userSchema = new Schema(
	{
		fullName: { type: String, required: true, trim: true }, // Display name for account
		email: { type: String, required: true, unique: true, lowercase: true }, // Unique identifier
		password: { type: String, required: true }, // Stores hashed password
	},
	{ timestamps: true }
); // Automatically maintain createdAt/updatedAt

userSchema.pre("save", async function () {
	if (!this.isModified("password")) return; // Skip rehashing unchanged passwords
	this.password = await bcrypt.hash(this.password, 10); // Hash plaintext prior to saving
});

userSchema.methods.isPasswordValid = function (candidate) {
	return bcrypt.compare(candidate, this.password); // Compare login input to stored hash
};

export const User = model("User", userSchema); // Create and export model constructor
```

```js
// CRUD inside controller/service
export const getUsers = asyncHandler(async (_req, res) => {
	const users = await User.find().select("fullName email"); // Read: pull key fields for every user
	res.json(new ApiResponse(200, users)); // Send data back using shared response class
});

export const updateUser = asyncHandler(async (req, res) => {
	const updated = await User.findByIdAndUpdate(req.params.id, req.body, {
		new: true,
		runValidators: true,
	}); // Update: apply patch and return updated document
	res.json(new ApiResponse(200, updated, "Updated")); // Confirm the successful update
});
```

### Middleware Examples

```js
// middlewares/auth.middleware.js
import jwt from "jsonwebtoken"; // For verifying bearer tokens
import { ApiError } from "../utils/ApiError.js"; // Uniform error structure
import { asyncHandler } from "../utils/asyncHandler.js"; // Async wrapper to bubble errors
import { User } from "../models/user.models.js"; // Access to user collection

export const verifyJWT = asyncHandler(async (req, _res, next) => {
	const token =
		req.cookies?.accessToken ||
		req.header("Authorization")?.replace("Bearer ", ""); // Pull token from cookie or header

	if (!token) throw new ApiError(401, "Unauthorized"); // Short-circuit when token missing

	const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); // Confirm token signature & expiry
	req.user = await User.findById(decoded._id).select("-password"); // Attach hydrated user
	next(); // Continue once verified
});
```

```js
// middlewares/multer.middleware.js
import multer from "multer"; // Parse multipart/form-data uploads

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, "./public/temp"), // Save to temp directory
	filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`), // Prefix filenames for uniqueness
});

export const upload = multer({ storage }); // Export configured uploader
```

### Environment Variables and Configuration

```js
// config/environment.js
import dotenv from "dotenv"; // Library to hydrate environment variables
dotenv.config({ path: ".env" }); // Read values from chosen file

export const appConfig = {
	port: process.env.PORT ?? 8000, // Default to 8000 when unset
	mongoUri: process.env.MONGO_URI, // Central source for DB URI
	corsOrigin: process.env.CORS_ORIGIN, // Allowed front-end origin
};
```

### Centralised Error Handling & Response Formats

```js
// utils/ApiError.js
export class ApiError extends Error {
	constructor(statusCode, message = "Something went wrong") {
		super(message); // Preserve base error behaviour & stack
		this.statusCode = statusCode; // HTTP code returned to client
		this.success = false; // Normalise failure indicator
	}
}
```

```js
// utils/ApiResponse.js
export class ApiResponse {
	constructor(statusCode, data, message = "Success") {
		this.statusCode = statusCode; // Paired HTTP status code
		this.data = data; // Payload delivered to clients
		this.message = message; // Human-friendly summary
		this.success = statusCode < 400; // Derive success flag automatically
	}
}
```

```js
// app.js (error handler at the end)
import { ApiError } from "./utils/ApiError.js"; // Reuse structured errors thrown across code

app.use((err, _req, res, _next) => {
	if (err instanceof ApiError) {
		return res
			.status(err.statusCode)
			.json({ success: false, message: err.message, errors: err.errors }); // Respond with curated error payload
	}

	console.error(err); // Log unexpected faults for debugging
	res.status(500).json({ success: false, message: "Internal Server Error" }); // Fallback catch-all response
});
```

## Concepts & Patterns in Action

- **RESTful API Design** – Use semantic HTTP verbs (`GET`, `POST`, `PATCH`, `DELETE`) and resource-based paths (`/api/v1/users`).
- **Async/Await with Error Wrappers** – `asyncHandler` ensures rejected promises propagate to the central error handler without repetitive `try/catch` blocks.
- **Environment-Driven Configuration** – `dotenv` loads secrets (DB URI, JWT secrets) from `.env`, keeping code portable.
- **CORS and Cookies** – `cors` with `credentials` enables frontend integrations; `cookie-parser` reads and signs session tokens.
- **JWT Authentication Flow** – Controllers issue access/refresh tokens, middleware validates them, and cookies/headers transport them securely.
- **Password Hashing** – Mongoose `pre('save')` hook runs bcrypt hashing so plaintext passwords never touch the database.
- **File Upload Pipeline** – `multer` stores incoming files temporarily; helper utilities push them to external storage (Cloudinary) and clean up.
- **Aggregation Pipelines** – `User.aggregate([...])` demonstrates MongoDB lookups, computed fields, and analytics (subscriber counts, watch history).
- **Reusable Response Types** – `ApiResponse` and `ApiError` provide predictable payload shapes, simplifying client-side handling.
- **Pagination Helpers** – Plugins such as `mongoose-aggregate-paginate-v2` can be attached to schemas to paginate aggregation results.

## Reusable Logic & Best Practices

- Prefer **async/await** for clarity; wrap handlers with `asyncHandler` to avoid duplicated try/catch scaffolding.
- Store **secrets in `.env`**, load them early, and never commit real credentials.
- Keep **routes lean**—delegate complex logic to controllers/services for readability and testing.
- Use **Mongoose schema methods & hooks** to colocate model-specific behaviour (hashing passwords, generating JWTs).
- Isolate **middleware** for auth, validation, uploads, or rate limiting so routes stay declarative.
- Adopt **consistent response envelopes** (success flag, message, data) so clients can parse results generically.
- Segment code by **feature folders** (controllers/models/routes per domain) to aid scalability.
- Clean up temporary files and external resources to prevent resource leaks.

## Learning Summary (One-line Takeaways)

- **Express routers** keep endpoints modular and versioned.
- **Controller functions** orchestrate validation, business rules, and responses.
- **Mongoose models** enforce structure and provide query helpers in a schemaless database.
- **Async handler utilities** centralise error propagation for async controllers.
- **JWT tokens** encode user identity for stateless authentication.
- **Bcrypt hashing** secures passwords before persistence.
- **Multer middleware** handles multipart/form-data uploads safely.
- **Cloud storage helpers** abstract third-party APIs (Cloudinary) behind simple functions.
- **Aggregation pipelines** join collections and compute analytics without additional services.
- **Custom error/response classes** deliver predictable API payloads.
- **Cookie parsing** allows secure, HTTP-only token storage.
- **CORS configuration** controls which origins may access your API.
- **Environment variables** keep sensitive configuration outside source control.
- **Nodemon** boosts DX by hot-reloading on file changes.
- **Prettier/linting** maintain consistent style across the codebase.

## Quick Reference / Cheatsheet

- **Spin up Express server**

	```js
	import express from "express"; // Bring in Express framework
	const app = express(); // Create application instance
	app.listen(8000, () => console.log("API ready")); // Start server and log status
	```

- **Define a route + controller combo**

	```js
	router.route("/articles")
		.get(asyncHandler(listArticles)) // Public read endpoint
		.post(verifyJWT, asyncHandler(createArticle)); // Authenticated create endpoint
	```

- **Connect to MongoDB**

	```js
	import mongoose from "mongoose"; // Import ODM helper
	await mongoose.connect(`${process.env.MONGO_URI}/mydb`); // Establish database connection
	```

- **CRUD with Mongoose**

	```js
	const post = await Post.create(req.body); // Create new document
	const posts = await Post.find().limit(10); // Read top 10 entries
	const updated = await Post.findByIdAndUpdate(id, payload, { new: true }); // Update existing record
	await Post.findByIdAndDelete(id); // Delete by identifier
	```

- **Middleware signature**

	```js
	const exampleMiddleware = (req, res, next) => {
		console.log(`${req.method} ${req.path}`); // Observe request flow
		next(); // Pass control to the next middleware/route
	};
	app.use(exampleMiddleware); // Register middleware globally
	```

- **.env pattern**

	```env
	PORT=8000
	MONGO_URI=mongodb://127.0.0.1:27017
	JWT_SECRET=change_me
	```

- **Common npm commands**
	- `npm install package` – add runtime dependency
	- `npm install -D package` – add dev dependency
	- `npm run dev` – start nodemon watcher
	- `npm run lint` – run linter (if configured)
	- `npm audit` – scan for vulnerable packages

- **Express patterns**
	- `app.use(path, router)` – mount router at path
	- `res.status(code).json(payload)` – send JSON response
	- `next(err)` – forward error to global handler
	- `app.use(express.json())` – parse JSON bodies

## Next Steps / Extend Your Backend

1. **Authentication Enhancements** – Add refresh-token rotation, JWT blacklist, password reset flows, and third-party OAuth.
2. **Authorization** – Implement role-based access control (RBAC) or attribute-based rules.
3. **Validation Layers** – Integrate Joi/Zod/Yup or express-validator to enforce request schemas.
4. **Pagination & Filtering** – Generalise query utilities for sorting, filtering, and cursor-based pagination.
5. **File Handling** – Support streaming uploads, signed URLs, and background processing with queues.
6. **Logging & Monitoring** – Add Winston/Pino logging, request tracing, and health checks.
7. **Testing Workflow** – Use Jest/Supertest for API tests and Postman collections for manual verification.
8. **Performance Optimisations** – Introduce caching (Redis), rate limiting, and connection pooling.
9. **Deployment Readiness** – Containerise with Docker, add CI/CD pipelines, and configure production env variables.

Keep iterating: treat each concept as a building block, combine them to craft robust, secure, and maintainable backend services.
