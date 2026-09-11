// Run with mongosh: mongosh < database/ccms.mongodb.js
use('ccms');

db.createCollection('users');
db.createCollection('complaints');
db.createCollection('categories');

db.users.createIndex({ email: 1 }, { unique: true });
db.categories.createIndex({ name: 1 }, { unique: true });
db.complaints.createIndex({ student: 1, createdAt: -1 });

db.categories.insertMany([
  { name: 'Internet', description: 'Network and connectivity issues.' },
  { name: 'Infrastructure', description: 'Campus buildings and facilities.' },
  { name: 'Cleanliness', description: 'Hygiene and sanitation concerns.' },
  { name: 'Academic', description: 'Classes, exams, and academic services.' },
  { name: 'Fee Related', description: 'Tuition, payment, and scholarship fee issues.' },
  { name: 'Hostel', description: 'Accommodation and hostel facilities.' },
  { name: 'Transport', description: 'Bus and campus transport services.' },
  { name: 'Technical', description: 'Technical support and system issues.' },
  { name: 'Medical', description: 'Health and medical assistance.' },
  { name: 'Scholarship', description: 'Scholarship and financial aid concerns.' },
  { name: 'Security', description: 'Safety and security concerns.' },
  { name: 'Other', description: 'Other college-related concerns.' }
], { ordered: false });