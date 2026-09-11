const API_BASE =
  window.location.port === "5000" ? "/api" : "http://127.0.0.1:5000/api";

export const storageKeys = {
  token: "ccmsToken",
  complaints: "rdecComplaints",
  categories: "rdecCategories",
  users: "rdecUsers",
  student: "rdecStudent",
  admin: "rdecAdmin"
};

export const defaultCategories = [
  { name: "Internet", description: "Network and connectivity issues." },
  { name: "Infrastructure", description: "Campus buildings and facilities." },
  { name: "Cleanliness", description: "Hygiene and sanitation concerns." },
  { name: "Academic", description: "Classes, exams, and academic services." },
  { name: "Fee Related", description: "Tuition, payment, and scholarship fee issues." },
  { name: "Hostel", description: "Accommodation and hostel facilities." },
  { name: "Transport", description: "Bus and campus transport services." },
  { name: "Technical", description: "Technical support and system issues." },
  { name: "Medical", description: "Health and medical assistance." },
  { name: "Scholarship", description: "Scholarship and financial aid concerns." },
  { name: "Security", description: "Safety and security concerns." },
  { name: "Other", description: "Other college-related concerns." }
];

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem(storageKeys.token)
        ? { Authorization: `Bearer ${localStorage.getItem(storageKeys.token)}` }
        : {}),
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status}).`);
  return data;
}

export const getComplaints = () =>
  JSON.parse(localStorage.getItem(storageKeys.complaints) || "[]");
export const saveComplaints = (complaints) =>
  localStorage.setItem(storageKeys.complaints, JSON.stringify(complaints));

export const getCategories = () => {
  const saved = JSON.parse(localStorage.getItem(storageKeys.categories) || "null");
  if (!saved) return defaultCategories;
  return [
    ...saved,
    ...defaultCategories.filter(
      (item) => !saved.some((savedItem) => savedItem.name === item.name)
    )
  ];
};

export const saveCategories = (categories) =>
  localStorage.setItem(storageKeys.categories, JSON.stringify(categories));

export function getUsers() {
  const users = JSON.parse(localStorage.getItem(storageKeys.users) || "[]");
  const student = JSON.parse(localStorage.getItem(storageKeys.student) || "null");
  const admin = JSON.parse(localStorage.getItem(storageKeys.admin) || "null");
  if (student?.email && !users.some((user) => user.email === student.email))
    users.push({ ...student, role: "Student", status: "Active" });
  if (admin?.email && !users.some((user) => user.email === admin.email))
    users.push({ ...admin, name: "Administrator", role: "Admin", status: "Active" });
  return users;
}

export function saveUser(user) {
  const users = getUsers();
  const index = users.findIndex((item) => item.email === user.email);
  if (index >= 0) users[index] = { ...users[index], ...user };
  else users.push(user);
  localStorage.setItem(storageKeys.users, JSON.stringify(users));
}
