import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 5000);
const jwtSecret = process.env.JWT_SECRET || 'local-development-secret';
const appDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'App');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: String,
  rollNumber: String,
  role: { type: String, enum: ['Student', 'Admin'], default: 'Student' },
  adminRegistrationComplete: { type: Boolean, default: true },
  status: { type: String, default: 'Active' }
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved'], default: 'Pending' }
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '' }
});

const User = mongoose.model('User', userSchema);
const Complaint = mongoose.model('Complaint', complaintSchema);
const Category = mongoose.model('Category', categorySchema);

const defaultCategories = [
  ['Internet', 'Network and connectivity issues.'], ['Infrastructure', 'Campus buildings and facilities.'],
  ['Cleanliness', 'Hygiene and sanitation concerns.'], ['Academic', 'Classes, exams, and academic services.'],
  ['Fee Related', 'Tuition, payment, and scholarship fee issues.'], ['Hostel', 'Accommodation and hostel facilities.'],
  ['Transport', 'Bus and campus transport services.'], ['Technical', 'Technical support and system issues.'],
  ['Medical', 'Health and medical assistance.'], ['Scholarship', 'Scholarship and financial aid concerns.'],
  ['Security', 'Safety and security concerns.'], ['Other', 'Other college-related concerns.']
];

app.use(cors());
app.use(express.json());
app.use(express.static(appDirectory));

function createToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '7d' });
}

function auth(requiredRole) {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const payload = jwt.verify(token, jwtSecret);
      const user = await User.findById(payload.id).select('-password');
      if (!user || (requiredRole && user.role !== requiredRole)) return res.status(403).json({ message: 'Access denied.' });
      req.user = user;
      next();
    } catch {
      res.status(401).json({ message: 'Authentication required.' });
    }
  };
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, rollNumber: user.rollNumber, role: user.role, adminRegistrationComplete: user.adminRegistrationComplete, status: user.status };
}

app.get('/api/health', (req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, phone, rollNumber, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();
    if (!fullName?.trim() || !normalizedEmail || !phone?.trim() || !rollNumber?.trim() || !password || password.length < 6) {
      return res.status(400).json({ message: 'Name, email, phone, roll number and a 6-character password are required.' });
    }
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.create({ name: fullName.trim(), email: normalizedEmail, phone: phone.trim(), rollNumber: rollNumber.trim(), password: await bcrypt.hash(password, 10), role: 'Student' });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/register-admin', auth('Admin'), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password || password.length < 6) return res.status(400).json({ message: 'Name, email, phone and a 6-character password are required.' });
    const existing = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
    if (existing) return res.status(409).json({ message: 'An account with this email already exists.' });
    const user = await User.findByIdAndUpdate(req.user.id, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: await bcrypt.hash(password, 10),
      role: 'Admin',
      adminRegistrationComplete: true
    }, { new: true, runValidators: true });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, role = 'Student' } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase(), role })
      .sort({ ...(role === 'Admin' ? { adminRegistrationComplete: -1 } : {}), updatedAt: -1, createdAt: -1 });
    const passwordValue = password || '';
    const bcryptMatch = user && await bcrypt.compare(passwordValue, user.password);
    const legacyMatch = user && !bcryptMatch && user.password === passwordValue;
    if (!user || (!bcryptMatch && !legacyMatch)) return res.status(401).json({ message: 'Invalid email or password.' });
    if (legacyMatch) {
      user.password = await bcrypt.hash(passwordValue, 10);
      await user.save();
    }
    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/me', auth(), (req, res) => res.json({ user: publicUser(req.user) }));
app.patch('/api/me', auth(), async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: 'Name and email are required.' });
  const duplicate = await User.findOne({ email: email.toLowerCase(), _id: { $ne: req.user.id } });
  if (duplicate) return res.status(409).json({ message: 'This email is already in use.' });
  const user = await User.findByIdAndUpdate(req.user.id, { name: name.trim(), email: email.toLowerCase().trim() }, { new: true, runValidators: true }).select('-password');
  res.json({ user: publicUser(user) });
});

app.patch('/api/me/password', auth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) return res.status(400).json({ message: 'A valid new password is required.' });
  const user = await User.findById(req.user.id);
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) return res.status(401).json({ message: 'Current password is incorrect.' });
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: 'Password changed successfully.' });
});

app.get('/api/complaints', auth(), async (req, res) => {
  const query = req.user.role === 'Admin' ? {} : { student: req.user.id };
  const complaints = await Complaint.find(query).populate('student', 'name email').sort({ createdAt: -1 });
  res.json(complaints.map((item) => ({ ...item.toObject(), student: item.student?.name, email: item.student?.email, date: item.createdAt.toLocaleDateString() })));
});

app.post('/api/complaints', auth('Student'), async (req, res) => {
  const { subject, category, description } = req.body;
  if (!subject || !category || !description) return res.status(400).json({ message: 'Subject, category and description are required.' });
  const complaint = await Complaint.create({ student: req.user.id, subject, category, description });
  res.status(201).json(complaint);
});

app.patch('/api/complaints/:id/status', auth('Admin'), async (req, res) => {
  const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!complaint) return res.status(404).json({ message: 'Complaint not found.' });
  res.json(complaint);
});

app.get('/api/categories', auth(), async (req, res) => res.json(await Category.find().sort({ name: 1 })));
app.post('/api/categories', auth('Admin'), async (req, res) => res.status(201).json(await Category.create(req.body)));
app.delete('/api/categories/:id', auth('Admin'), async (req, res) => { await Category.findByIdAndDelete(req.params.id); res.status(204).end(); });
app.get('/api/users', auth('Admin'), async (req, res) => res.json((await User.find().select('-password').sort({ createdAt: -1 })).map(publicUser)));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(500).json({ message: 'Server error. Please try again.' });
});

app.get('*', (req, res) => res.sendFile(path.join(appDirectory, 'Home.html')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/ccms')
  .then(async () => {
    await Category.bulkWrite(defaultCategories.map(([name, description]) => ({ updateOne: { filter: { name }, update: { $setOnInsert: { name, description } }, upsert: true } })));
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    await User.findOneAndUpdate(
      { email: adminEmail.toLowerCase(), role: 'Admin' },
      { $set: { name: 'Administrator', password: await bcrypt.hash(adminPassword, 10), adminRegistrationComplete: false } },
      { upsert: true, setDefaultsOnInsert: true }
    );
    const server = app.listen(port, () => console.log(`CCMS server running at http://localhost:${port}`));
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`CCMS backend is already running at http://localhost:${port}`);
        return;
      }
      console.error('Could not start CCMS backend:', error.message);
    });
  })
  .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });