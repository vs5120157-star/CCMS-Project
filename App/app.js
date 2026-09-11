const API_BASE =
  window.location.port === "5000" ? "/api" : "http://127.0.0.1:5000/api";
const getToken = () => localStorage.getItem("ccmsToken");
async function apiRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Backend server is not running. Start it with: cd backend && npm start",
    );
  }
  const responseText = await response.text();
  let data = null;
  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { message: responseText.slice(0, 200) };
    }
  }
  if (!response.ok)
    throw new Error(data?.message || `Request failed (${response.status}).`);
  return data;
}

// Local cache UI ko server response aane tak data dikhata hai.
const getComplaints = () =>
  JSON.parse(localStorage.getItem("rdecComplaints") || "[]");
const saveComplaints = (complaints) =>
  localStorage.setItem("rdecComplaints", JSON.stringify(complaints));

async function syncComplaints() {
  if (!getToken()) return;
  try {
    saveComplaints(await apiRequest("/complaints"));
    renderComplaints();
    renderAdminDashboard();
    renderManageComplaints();
    renderReports();
  } catch (error) {
    console.warn("Could not load complaints from backend:", error.message);
  }
}

// Har page par milne wale forms aur dynamic containers ke references.
const loginForm = document.querySelector("#login-form");
const registrationForm = document.querySelector("#registration-form");
const adminRegistrationForm = document.querySelector(
  "#admin-registration-form",
);
const complaintForm = document.querySelector("#complaint-submit-form");
const studentName = document.querySelector("#student-name");
const complaintsBody = document.querySelector("#complaints-body");
const myComplaintsBody = document.querySelector("#my-complaints-body");
const adminComplaintsBody = document.querySelector("#admin-complaints-body");
const categoryForm = document.querySelector("#category-form");
const categoryList = document.querySelector("#category-list");
const usersBody = document.querySelector("#users-body");
const reportTableBody = document.querySelector("#report-table-body");
const manageComplaintsBody = document.querySelector("#manage-complaints-body");
const adminProfileForm = document.querySelector("#admin-profile-form");
const adminProfileToggle = document.querySelector("#admin-profile-toggle");
const adminDropdown = document.querySelector("#admin-dropdown");

// Naye installation ke liye available complaint categories.
const defaultCategories = [
  { name: "Internet", description: "Network and connectivity issues." },
  { name: "Infrastructure", description: "Campus buildings and facilities." },
  { name: "Cleanliness", description: "Hygiene and sanitation concerns." },
  { name: "Academic", description: "Classes, exams, and academic services." },
  {
    name: "Fee Related",
    description: "Tuition, payment, and scholarship fee issues.",
  },
  { name: "Hostel", description: "Accommodation and hostel facilities." },
  { name: "Transport", description: "Bus and campus transport services." },
  { name: "Technical", description: "Technical support and system issues." },
  { name: "Medical", description: "Health and medical assistance." },
  {
    name: "Scholarship",
    description: "Scholarship and financial aid concerns.",
  },
  { name: "Security", description: "Safety and security concerns." },
  { name: "Other", description: "Other college-related concerns." },
];

function getCategories() {
  // Saved custom categories ko defaults ke saath merge karta hai.
  const savedCategories = JSON.parse(
    localStorage.getItem("rdecCategories") || "null",
  );
  if (!savedCategories) return defaultCategories;
  return [
    ...savedCategories,
    ...defaultCategories.filter(
      (defaultCategory) =>
        !savedCategories.some(
          (category) => category.name === defaultCategory.name,
        ),
    ),
  ];
}
const saveCategories = (categories) =>
  localStorage.setItem("rdecCategories", JSON.stringify(categories));

async function syncCategories() {
  if (!getToken()) return;
  try {
    const categories = await apiRequest("/categories");
    saveCategories(categories);
    renderCategories();
    populateCategorySelects();
  } catch (error) {
    console.warn("Could not load categories from backend:", error.message);
  }
}

// Student/admin sessions se users ki list banata hai.
function getUsers() {
  const users = JSON.parse(localStorage.getItem("rdecUsers") || "[]");
  const student = JSON.parse(localStorage.getItem("rdecStudent") || "null");
  const admin = JSON.parse(localStorage.getItem("rdecAdmin") || "null");
  if (student?.email && !users.some((user) => user.email === student.email))
    users.push({ ...student, role: "Student", status: "Active" });
  if (admin?.email && !users.some((user) => user.email === admin.email))
    users.push({
      ...admin,
      name: "Administrator",
      role: "Admin",
      status: "Active",
    });
  return users;
}

// User ko add karta hai ya existing email wale user ko update karta hai.
function saveUser(user) {
  const users = getUsers();
  const existingIndex = users.findIndex((item) => item.email === user.email);
  if (existingIndex >= 0)
    users[existingIndex] = { ...users[existingIndex], ...user };
  else users.push(user);
  localStorage.setItem("rdecUsers", JSON.stringify(users));
}

// Saved admin profile ko fallback values ke saath return karta hai.
function getAdminProfile() {
  const admin = JSON.parse(localStorage.getItem("rdecAdmin") || "null");
  return {
    name: admin?.name || "Administrator",
    email: admin?.email || "admin@example.com",
    role: admin?.role || "Admin",
  };
}

// Admin profile page par form fill aur profile update handle karta hai.
if (adminProfileForm) {
  const admin = getAdminProfile();
  adminProfileForm.name.value = admin.name;
  adminProfileForm.email.value = admin.email;
  adminProfileForm.role.value = admin.role;
  document.querySelector("#profile-name").textContent = admin.name;
  document.querySelector("#profile-email").textContent = admin.email;
  document.querySelector("#profile-role-badge").textContent =
    admin.role === "Admin" ? "Administrator" : admin.role;
  adminProfileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const updated = {
      name: adminProfileForm.name.value.trim(),
      email: adminProfileForm.email.value.trim(),
      role: adminProfileForm.role.value,
    };
    localStorage.setItem("rdecAdmin", JSON.stringify(updated));
    saveUser({ ...updated, status: "Active" });
    document.querySelector("#profile-name").textContent = updated.name;
    document.querySelector("#profile-email").textContent = updated.email;
    document.querySelector("#profile-role-badge").textContent =
      updated.role === "Admin" ? "Administrator" : updated.role;
    document.querySelector("#admin-profile-message").textContent =
      "Profile updated successfully.";
  });
}

// Submit aur Manage pages ke category dropdowns ko shared categories se fill karta hai.
function populateCategorySelects() {
  const categories = getCategories();
  document.querySelectorAll("[data-category-select]").forEach((select) => {
    const currentValue = select.value;
    const placeholder =
      select.name === "category"
        ? '<option value="" disabled selected>Select Category</option>'
        : `<option value="${select.id === "manage-category-filter" ? "All" : ""}">${select.id === "manage-category-filter" ? "Select Category" : "Select Category"}</option>`;
    select.innerHTML =
      placeholder +
      categories
        .map((category) => `<option>${escapeHtml(category.name)}</option>`)
        .join("");
    if (categories.some((category) => category.name === currentValue))
      select.value = currentValue;
  });
}

// Sabhi data-route links ko target HTML page par bhejta hai.
function navigateTo(page) {
  window.location.assign(page);
}

// Registered admin ko login page se seedha dashboard par bhejta hai.
if (loginForm && localStorage.getItem("rdecStudentRemembered") === "true")
  navigateTo("Dashboard.html");
if (
  document.querySelector("#admin-login-form") &&
  localStorage.getItem("rdecAdminRemembered") === "true"
) {
  navigateTo(
    localStorage.getItem("rdecAdminRegistrationComplete") === "true"
      ? "Admin_Dashboard.html"
      : "Admin_Register.html",
  );
}

// data-route wale buttons/links ke liye common navigation handler.
document.addEventListener("click", (event) => {
  const routeLink = event.target.closest("[data-route]");
  if (!routeLink) return;
  event.preventDefault();
  navigateTo(routeLink.dataset.route);
});

if (adminProfileToggle && adminDropdown) {
  const closeAdminDropdown = () => {
    adminDropdown.hidden = true;
    adminProfileToggle.setAttribute("aria-expanded", "false");
  };
  adminProfileToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = !adminDropdown.hidden;
    adminDropdown.hidden = isOpen;
    adminProfileToggle.setAttribute("aria-expanded", String(!isOpen));
  });
  document.addEventListener("click", closeAdminDropdown);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAdminDropdown();
  });
}

if (loginForm) {
  // Student login, profile aur Remember Me preference save karta hai.
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;
    const rememberMe = loginForm.rememberMe?.checked || false;
    try {
      const result = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, role: "Student" }),
      });
      localStorage.setItem("ccmsToken", result.token);
      localStorage.setItem("rdecStudent", JSON.stringify(result.user));
      localStorage.setItem("rdecStudentRemembered", String(rememberMe));
      navigateTo("Dashboard.html");
    } catch (error) {
      document.querySelector("#form-message").textContent = error.message;
    }
  });
}

// Registration form se student profile create karke dashboard kholta hai.
if (registrationForm) {
  registrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = registrationForm.fullName.value.trim();
    const email = registrationForm.email.value.trim();
    const password = registrationForm.password.value;
    if (password !== registrationForm.confirmPassword.value) {
      document.querySelector("#form-message").textContent =
        "Passwords do not match.";
      return;
    }
    try {
      const result = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          fullName: name,
          email,
          phone: registrationForm.phone.value.trim(),
          rollNumber: registrationForm.rollNumber.value.trim(),
          password,
        }),
      });
      localStorage.setItem("ccmsToken", result.token);
      localStorage.setItem("rdecStudent", JSON.stringify(result.user));
      navigateTo("Dashboard.html");
    } catch (error) {
      document.querySelector("#form-message").textContent = error.message;
    }
  });
}

if (adminRegistrationForm) {
  adminRegistrationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const message = document.querySelector("#form-message");
    if (form.password.value !== form.confirmPassword.value) {
      message.textContent = "Passwords do not match.";
      return;
    }
    try {
      const result = await apiRequest("/auth/register-admin", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          password: form.password.value,
        }),
      });
      localStorage.setItem("ccmsToken", result.token);
      localStorage.setItem("rdecAdmin", JSON.stringify(result.user));
      localStorage.setItem("rdecAdminRemembered", "true");
      localStorage.setItem("rdecAdminRegistrationComplete", "true");
      navigateTo("Admin_Dashboard.html");
    } catch (error) {
      message.textContent = error.message;
    }
  });
}

// Dashboard aur My Complaints dono me latest complaint data render karta hai.
function renderComplaints() {
  if (!complaintsBody && !myComplaintsBody) return;
  const complaints = getComplaints();
  const statusClass = (status) =>
    status === "In Progress" ? "progress" : status.toLowerCase();
  if (complaintsBody) {
    complaintsBody.innerHTML = complaints.length
      ? complaints
          .map((complaint, index) => {
            const status = complaint.status || "Pending";
            return `<tr><td>${index + 1}</td><td>${escapeHtml(complaint.subject || "-")}</td><td>${escapeHtml(complaint.category || "-")}</td><td><span class="status ${statusClass(status)}">${escapeHtml(status)}</span></td><td>${escapeHtml(complaint.date || "-")}</td></tr>`;
          })
          .join("")
      : '<tr><td colspan="5">No complaints submitted yet.</td></tr>';
  }
  if (myComplaintsBody) {
    myComplaintsBody.innerHTML = complaints.length
      ? complaints
          .map((complaint, index) => {
            const status = complaint.status || "Pending";
            return `<tr><td>${index + 1}</td><td>${escapeHtml(complaint.subject || "-")}</td><td>${escapeHtml(complaint.category || "-")}</td><td><span class="status ${statusClass(status)}">${escapeHtml(status)}</span></td><td>${escapeHtml(complaint.date || "-")}</td><td><a href="#" class="view" data-index="${index}">View</a></td></tr>`;
          })
          .join("")
      : '<tr><td colspan="6">No complaints submitted yet.</td></tr>';
  }
  const total = document.querySelector("#total-count");
  const pending = document.querySelector("#pending-count");
  const progress = document.querySelector("#progress-count");
  const resolved = document.querySelector("#resolved-count");
  const counts = complaints.reduce((result, complaint) => {
    const status = complaint.status || "Pending";
    result[status] = (result[status] || 0) + 1;
    return result;
  }, {});
  if (total) total.textContent = complaints.length;
  if (pending) pending.textContent = counts.Pending || 0;
  if (progress) progress.textContent = counts["In Progress"] || 0;
  if (resolved) resolved.textContent = counts.Resolved || 0;
}

myComplaintsBody?.addEventListener("click", (event) => {
  const viewLink = event.target.closest(".view");
  if (!viewLink) return;
  event.preventDefault();
  const complaint = getComplaints()[Number(viewLink.dataset.index)];
  if (!complaint) return;
  window.alert(
    `Subject: ${complaint.subject || "-"}\nCategory: ${complaint.category || "-"}\nStatus: ${complaint.status || "Pending"}\n\n${complaint.description || "-"}`,
  );
});

// Admin dashboard par complaint list, search, filter aur summary cards render karta hai.
function renderAdminDashboard() {
  if (!adminComplaintsBody) return;
  const complaints = getComplaints();
  const search = (
    document.querySelector("#admin-search")?.value || ""
  ).toLowerCase();
  const filter = document.querySelector("#status-filter")?.value || "All";
  const filtered = complaints.filter((complaint) => {
    const text =
      `${complaint.subject} ${complaint.category} ${complaint.description}`.toLowerCase();
    return (
      (!search || text.includes(search)) &&
      (filter === "All" || (complaint.status || "Pending") === filter)
    );
  });
  const counts = {
    total: complaints.length,
    pending: 0,
    progress: 0,
    resolved: 0,
  };
  complaints.forEach((complaint) => {
    const status = complaint.status || "Pending";
    if (status === "Pending") counts.pending += 1;
    if (status === "In Progress") counts.progress += 1;
    if (status === "Resolved") counts.resolved += 1;
  });
  document.querySelector("#admin-total-count").textContent = counts.total;
  document.querySelector("#admin-pending-count").textContent = counts.pending;
  document.querySelector("#admin-progress-count").textContent = counts.progress;
  document.querySelector("#admin-resolved-count").textContent = counts.resolved;
  adminComplaintsBody.innerHTML = filtered.length
    ? filtered
        .map((complaint) => {
          const index = complaints.indexOf(complaint);
          const status = complaint.status || "Pending";
          return `<tr><td>${index + 1}</td><td><strong>${escapeHtml(complaint.subject || "-")}</strong><small>${escapeHtml(complaint.description || "-")}</small></td><td>${escapeHtml(complaint.student || complaint.email || "Student")}</td><td>${escapeHtml(complaint.category || "-")}</td><td><select class="status-select ${status.toLowerCase().replace(" ", "-")}" data-index="${index}"><option ${status === "Pending" ? "selected" : ""}>Pending</option><option ${status === "In Progress" ? "selected" : ""}>In Progress</option><option ${status === "Resolved" ? "selected" : ""}>Resolved</option></select></td><td>${escapeHtml(complaint.date || "-")}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="6" class="empty-state">No complaints found.</td></tr>';
}

if (studentName) {
  // Logged-in student ka naam dashboard header me dikhata hai.
  const student = JSON.parse(localStorage.getItem("rdecStudent") || "null");
  if (student) studentName.textContent = student.name;
}

renderComplaints();
renderAdminDashboard();
// Student dashboard ka Refresh button latest localStorage data dobara render karta hai.
document
  .querySelector("#refresh-complaints")
  ?.addEventListener("click", renderComplaints);
// Doosre tab se complaints update hone par current student view refresh karta hai.
window.addEventListener("storage", (event) => {
  if (event.key === "rdecComplaints") renderComplaints();
});

function renderCategories() {
  // Categories page par category cards aur count render karta hai.
  if (!categoryList) return;
  const categories = getCategories();
  const complaints = getComplaints();
  const count = document.querySelector("#category-count");
  const summary = document.querySelector("#category-summary");
  if (count) count.textContent = categories.length;
  if (summary)
    summary.textContent = `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`;
  categoryList.innerHTML = categories.length
    ? categories
        .map((category, index) => {
          const complaintCount = complaints.filter(
            (complaint) => complaint.category === category.name,
          ).length;
          return `<article class="category-item"><div class="category-icon"><i class="fa-solid fa-layer-group"></i></div><div class="category-info"><h3>${escapeHtml(category.name)}</h3><p>${escapeHtml(category.description || "No description added.")}</p><span class="complaint-count">${complaintCount} complaint${complaintCount === 1 ? "" : "s"}</span></div><button class="delete-button" type="button" data-category-index="${index}" data-category-id="${escapeHtml(category._id || "")}" aria-label="Delete ${escapeHtml(category.name)}"><i class="fa-solid fa-trash"></i></button></article>`;
        })
        .join("")
    : '<div class="empty-state">No categories available.</div>';
}

renderCategories();
populateCategorySelects();

// Users page par search aur role filter ke hisaab se users render karta hai.
function renderUsers() {
  if (!usersBody) return;
  const search = (
    document.querySelector("#user-search")?.value || ""
  ).toLowerCase();
  const role = document.querySelector("#role-filter")?.value || "All";
  const users = getUsers().filter((user) => {
    const text =
      `${user.name || ""} ${user.email || ""} ${user.phone || ""} ${user.rollNumber || ""}`.toLowerCase();
    return (
      (!search || text.includes(search)) &&
      (role === "All" || user.role === role)
    );
  });
  const count = document.querySelector("#user-count");
  if (count) count.textContent = users.length;
  usersBody.innerHTML = users.length
    ? users
        .map((user, index) => {
          const name = user.name || "User";
          const initial = escapeHtml(name.charAt(0).toUpperCase());
          const meta = user.rollNumber
            ? `Roll No: ${escapeHtml(user.rollNumber)}`
            : "Registered account";
          return `<tr><td>${index + 1}</td><td><div class="user-cell"><span class="avatar">${initial}</span><div><div class="user-name">${escapeHtml(name)}</div><div class="user-meta">${meta}</div></div></div></td><td>${escapeHtml(user.email || "-")}</td><td>${escapeHtml(user.phone || "-")}</td><td><span class="role ${user.role.toLowerCase()}">${escapeHtml(user.role)}</span></td><td><span class="status active">${escapeHtml(user.status || "Active")}</span></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="6" class="empty-state">No users found.</td></tr>';
}

renderUsers();
async function syncUsers() {
  if (!usersBody || !getToken()) return;
  try {
    const users = await apiRequest("/users");
    localStorage.setItem("rdecUsers", JSON.stringify(users));
    renderUsers();
  } catch (error) {
    console.warn("Could not load users from backend:", error.message);
  }
}
syncUsers();
// Users search/filter change hone par table update karta hai.
document.querySelector("#user-search")?.addEventListener("input", renderUsers);
document.querySelector("#role-filter")?.addEventListener("change", renderUsers);

function renderManageComplaints() {
  // Manage Complaints page ke search aur filters ke hisaab se rows render karta hai.
  if (!manageComplaintsBody) return;
  const complaints = getComplaints();
  const search = (document.querySelector("#manage-search")?.value || "")
    .trim()
    .toLowerCase();
  const statusFilter =
    document.querySelector("#manage-status-filter")?.value || "All";
  const categoryFilter =
    document.querySelector("#manage-category-filter")?.value || "All";
  const filtered = complaints
    .map((complaint, index) => ({ complaint, index }))
    .filter(({ complaint }) => {
      const text =
        `${complaint.subject || ""} ${complaint.category || ""} ${complaint.description || ""}`.toLowerCase();
      const status = complaint.status || "Pending";
      return (
        (!search || text.includes(search)) &&
        (statusFilter === "All" || status === statusFilter) &&
        (categoryFilter === "All" || complaint.category === categoryFilter)
      );
    });
  manageComplaintsBody.innerHTML = filtered.length
    ? filtered
        .map(({ complaint, index }, rowIndex) => {
          const status = complaint.status || "Pending";
          const statusClass =
            status === "In Progress" ? "progress" : status.toLowerCase();
          return `<tr><td>${rowIndex + 1}</td><td>${escapeHtml(complaint.subject || "-")}</td><td>${escapeHtml(complaint.student || complaint.email || "Student")}</td><td>${escapeHtml(complaint.category || "-")}</td><td><span class="status ${statusClass}">${escapeHtml(status)}</span></td><td>${escapeHtml(complaint.date || "-")}</td><td><select class="update-select" data-manage-index="${index}" aria-label="Update complaint status"><option ${status === "Pending" ? "selected" : ""}>Pending</option><option ${status === "In Progress" ? "selected" : ""}>In Progress</option><option ${status === "Resolved" ? "selected" : ""}>Resolved</option></select></td></tr>`;
        })
        .join("")
    : '<tr><td colspan="7" class="empty-state">No complaints found.</td></tr>';
}

renderManageComplaints();
// Manage Complaints ke search/filter controls ko table rendering se connect karta hai.
document
  .querySelector("#manage-search-button")
  ?.addEventListener("click", renderManageComplaints);
document
  .querySelector("#manage-search")
  ?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") renderManageComplaints();
  });
document
  .querySelector("#manage-status-filter")
  ?.addEventListener("change", renderManageComplaints);
document
  .querySelector("#manage-category-filter")
  ?.addEventListener("change", renderManageComplaints);

manageComplaintsBody?.addEventListener("change", async (event) => {
  // Admin ke status dropdown se selected complaint ka status save karta hai.
  if (!event.target.matches(".update-select")) return;
  const complaints = getComplaints();
  const index = Number(event.target.dataset.manageIndex);
  if (!complaints[index]) return;
  complaints[index].status = event.target.value;
  try {
    await apiRequest(`/complaints/${complaints[index]._id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: event.target.value }),
    });
  } catch (error) {
    console.error(error.message);
  }
  saveComplaints(complaints);
  renderManageComplaints();
  renderAdminDashboard();
  renderReports();
});

// Reports page par status/category summaries, bars aur filtered table render karta hai.
function renderReports() {
  if (!reportTableBody) return;
  const allComplaints = getComplaints();
  const selectedStatus =
    document.querySelector("#report-status")?.value || "All";
  const selectedCategory =
    document.querySelector("#report-category")?.value || "All";
  const categories = [
    ...new Set(
      allComplaints.map((complaint) => complaint.category).filter(Boolean),
    ),
  ].sort();
  const categorySelect = document.querySelector("#report-category");
  if (
    categorySelect &&
    categorySelect.options.length !== categories.length + 1
  ) {
    categorySelect.innerHTML =
      '<option value="All">All categories</option>' +
      categories
        .map(
          (category) =>
            `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`,
        )
        .join("");
    categorySelect.value = categories.includes(selectedCategory)
      ? selectedCategory
      : "All";
  }
  const complaints = allComplaints.filter(
    (complaint) =>
      (selectedStatus === "All" ||
        (complaint.status || "Pending") === selectedStatus) &&
      (selectedCategory === "All" || complaint.category === selectedCategory),
  );
  const counts = { Pending: 0, "In Progress": 0, Resolved: 0 };
  allComplaints.forEach((complaint) => {
    counts[complaint.status || "Pending"] =
      (counts[complaint.status || "Pending"] || 0) + 1;
  });
  document.querySelector("#report-total").textContent = allComplaints.length;
  document.querySelector("#report-pending").textContent = counts.Pending;
  document.querySelector("#report-progress").textContent =
    counts["In Progress"];
  document.querySelector("#report-resolved").textContent = counts.Resolved;
  const renderBars = (items, selector) => {
    const max = Math.max(...items.map((item) => item.count), 1);
    document.querySelector(selector).innerHTML =
      items
        .map(
          (item) =>
            `<div class="bar-row"><div class="bar-label"><span>${escapeHtml(item.label)}</span><strong>${item.count}</strong></div><div class="bar-track"><div class="bar-fill" style="width:${(item.count / max) * 100}%"></div></div></div>`,
        )
        .join("") || '<div class="empty-state">No data available.</div>';
  };
  renderBars(
    [
      { label: "Pending", count: counts.Pending },
      { label: "In Progress", count: counts["In Progress"] },
      { label: "Resolved", count: counts.Resolved },
    ],
    "#status-bars",
  );
  const categoryCounts = categories
    .map((category) => ({
      label: category,
      count: allComplaints.filter(
        (complaint) => complaint.category === category,
      ).length,
    }))
    .sort((a, b) => b.count - a.count);
  renderBars(categoryCounts, "#category-bars");
  document.querySelector("#report-result-count").textContent =
    `${complaints.length} result${complaints.length === 1 ? "" : "s"}`;
  reportTableBody.innerHTML = complaints.length
    ? complaints
        .map((complaint, index) => {
          const status = complaint.status || "Pending";
          return `<tr><td>${index + 1}</td><td>${escapeHtml(complaint.subject || "-")}</td><td>${escapeHtml(complaint.category || "-")}</td><td><span class="report-status ${status.toLowerCase().replace(" ", "-")}">${escapeHtml(status)}</span></td><td>${escapeHtml(complaint.date || "-")}</td></tr>`;
        })
        .join("")
    : '<tr><td colspan="5" class="empty-state">No complaints match the selected filters.</td></tr>';
}

renderReports();
// Reports filters aur refresh button report ko dobara calculate karte hain.
document
  .querySelector("#report-status")
  ?.addEventListener("change", renderReports);
document
  .querySelector("#report-category")
  ?.addEventListener("change", renderReports);
document
  .querySelector("#refresh-report")
  ?.addEventListener("click", renderReports);

categoryForm?.addEventListener("submit", (event) => {
  // Nayi category ko validate karke localStorage me save karta hai.
  event.preventDefault();
  const formData = new FormData(categoryForm);
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const categories = getCategories();
  if (
    categories.some(
      (category) => category.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    document.querySelector("#category-message").textContent =
      "This category already exists.";
    return;
  }
  apiRequest("/categories", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  })
    .then((category) => {
      categories.push(category);
      saveCategories(categories);
      categoryForm.reset();
      document.querySelector("#category-message").textContent =
        "Category added successfully.";
      renderCategories();
      populateCategorySelects();
    })
    .catch((error) => {
      document.querySelector("#category-message").textContent = error.message;
    });
});

categoryList?.addEventListener("click", async (event) => {
  // Delete button se selected category remove karta hai.
  const deleteButton = event.target.closest("[data-category-index]");
  if (!deleteButton) return;
  const categories = getCategories();
  const categoryId = deleteButton.dataset.categoryId;
  if (categoryId)
    await apiRequest(`/categories/${categoryId}`, { method: "DELETE" });
  categories.splice(Number(deleteButton.dataset.categoryIndex), 1);
  saveCategories(categories);
  renderCategories();
  populateCategorySelects();
});

// Admin dashboard ke search box aur status filter ko connect karta hai.
document
  .querySelector("#admin-search")
  ?.addEventListener("input", renderAdminDashboard);
document
  .querySelector("#status-filter")
  ?.addEventListener("change", renderAdminDashboard);

// Admin dashboard ka status dropdown complaint ka status update karta hai.
adminComplaintsBody?.addEventListener("change", async (event) => {
  if (!event.target.matches(".status-select")) return;
  const complaints = getComplaints();
  const complaint = complaints[event.target.dataset.index];
  if (!complaint) return;
  complaint.status = event.target.value;
  try {
    await apiRequest(`/complaints/${complaint._id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: event.target.value }),
    });
  } catch (error) {
    console.error(error.message);
  }
  saveComplaints(complaints);
  renderAdminDashboard();
});

// Submit Complaint form ko localStorage me save karke student dashboard kholta hai.
if (complaintForm) {
  complaintForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(complaintForm);
    try {
      await apiRequest("/complaints", {
        method: "POST",
        body: JSON.stringify({
          subject: formData.get("subject"),
          category: formData.get("category"),
          description: formData.get("description"),
        }),
      });
      await syncComplaints();
    } catch (error) {
      document
        .querySelector("#form-message")
        ?.replaceChildren(document.createTextNode(error.message));
      return;
    }
    complaintForm.reset();
    if (window.location.pathname.endsWith("Submit_Complaint.html")) {
      navigateTo("Dashboard.html");
      return;
    }
    const message = document.querySelector("#form-message");
    if (message) message.textContent = "Complaint added successfully.";
    renderComplaints();
  });
}

// Logout par student/admin session aur Remember Me markers clear karta hai.
document.querySelectorAll('a[href="#logout"]').forEach((logout) =>
  logout.addEventListener("click", (event) => {
    event.preventDefault();
    localStorage.removeItem("rdecStudent");
    localStorage.removeItem("rdecAdmin");
    localStorage.removeItem("rdecStudentRemembered");
    localStorage.removeItem("rdecAdminRemembered");
    localStorage.removeItem("ccmsToken");
    navigateTo("Home.html");
  }),
);

syncComplaints();
syncCategories();

function escapeHtml(value) {
  // User input ko HTML me safely display karne ke liye special characters escape karta hai.
  return String(value).replace(
    /[&<>\'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}
