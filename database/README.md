# CCMS MongoDB database

The backend uses the `ccms` database and creates `users`, `complaints`, and `categories` collections through Mongoose.

The database setup script is in `database/ccms.mongodb.js`. Run it with `mongosh` when MongoDB is available:

```bash
mongosh < database/ccms.mongodb.js
```

The JSON data snapshot is in `database/ccms-data.json`. It contains the CCMS collections and the default category data.
The individual collection data files are also saved here:

- `database/users.json`
- `database/complaints.json`
- `database/categories.json`

The remaining database-related source/config backups are saved here as well:

- `database/backend.env.example` - MongoDB and admin environment settings
- `database/backend-dependencies.json` - backend database dependency metadata
- `database/mongoose-schema.js` - Mongoose schemas and default category seed
- `database/frontend-data-source.js` - frontend API and localStorage data logic
- `database/frontend-storage-keys.md` - frontend localStorage database keys

The current local database had no running MongoDB records available during export, so `users.json` and `complaints.json` are currently empty and `categories.json` contains the 12 default categories.
To export all live MongoDB data into a JSON file, run:

```bash
mongoexport --db=ccms --collection=users --out=database/users.json --jsonArray
mongoexport --db=ccms --collection=complaints --out=database/complaints.json --jsonArray
mongoexport --db=ccms --collection=categories --out=database/categories.json --jsonArray
```

1. Install and start MongoDB locally, or provide an Atlas URI in `backend/.env`.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and `JWT_SECRET`.
3. Run `npm install` inside `backend`, then run `npm start`.

On first startup, the server seeds the default complaint categories and creates the admin account from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

The application is available at `http://localhost:5000` and the health check is `/api/health`.