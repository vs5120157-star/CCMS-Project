import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: String,
  rollNumber: String,
  role: { type: String, enum: ['Student', 'Admin'], default: 'Student' },
  adminRegistrationComplete: { type: Boolean, default: true },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

export const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

export const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' }
});

export const defaultCategories = [
  ['Internet', 'Network and connectivity issues.'],
  ['Infrastructure', 'Campus buildings and facilities.'],
  ['Cleanliness', 'Hygiene and sanitation concerns.'],
  ['Academic', 'Classes, exams, and academic services.'],
  ['Fee Related', 'Tuition, payment, and scholarship fee issues.'],
  ['Hostel', 'Accommodation and hostel facilities.'],
  ['Transport', 'Bus and campus transport services.'],
  ['Technical', 'Technical support and system issues.'],
  ['Medical', 'Health and medical assistance.'],
  ['Scholarship', 'Scholarship and financial aid concerns.'],
  ['Security', 'Safety and security concerns.'],
  ['Other', 'Other college-related concerns.']
];
