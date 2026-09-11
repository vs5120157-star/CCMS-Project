# CCMS MongoDB database

The backend uses the `ccms` database and creates `users`, `complaints`, and `categories` collections through Mongoose.

The database setup script is in `database/ccms.mongodb.js`. Run it with `mongosh` when MongoDB is available:

```bash
mongosh < database/ccms.mongodb.js
```

1. Install and start MongoDB locally, or provide an Atlas URI in `backend/.env`.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and `JWT_SECRET`.
3. Run `npm install` inside `backend`, then run `npm start`.

On first startup, the server seeds the default complaint categories and creates the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

The application is available at `http://localhost:5000` and the health check is `/api/health`.