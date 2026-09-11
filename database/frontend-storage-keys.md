# Frontend database storage

The frontend keeps fallback data in browser localStorage when the backend is unavailable:

- `rdecCategories`: complaint categories
- `rdecUsers`: registered users shown in the admin UI
- `rdecStudent`: current student session/profile
- `rdecAdmin`: current admin session/profile
- `rdecComplaints`: locally cached complaints

The source implementation is in `App/app.js`; the backend MongoDB remains the source of truth when the server is connected.
