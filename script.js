// ===== State (with persistence) =====
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let points = JSON.parse(localStorage.getItem("points")) || { JYOTHI: 0, CHAITRA: 0, SREE: 0 };
let users = JSON.parse(localStorage.getItem("users")) || {}; // { email: {name, password} }
let currentUser = JSON.parse(localStorage.getItem("currentUser")) || null; // {email, name}

function saveData() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("points", JSON.stringify(points));
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
}

// ===== Shortcuts =====
const byId = (id) => document.getElementById(id);

// ===== Navigation & Page Show =====
function navTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
  const el = byId(page);
  if (el) el.classList.add('show');
  window.location.hash = page;
}
function handleHashRoute() {
  const page = (window.location.hash || '#home').replace('#', '');
  navTo(page);
}
window.addEventListener('hashchange', handleHashRoute);

// ===== Auth UI sync =====
function syncAuthUI() {
  const navUser = byId('navUser');
  const navSignIn = byId('navSignIn');
  const navSignUp = byId('navSignUp');
  const hello = byId('helloUser');
  const who = byId('whoSignedIn');
  const authHint = byId('authHint');

  if (currentUser) {
    navUser.style.display = 'flex';
    navSignIn.style.display = 'none';
    navSignUp.style.display = 'none';
    hello.textContent = `Hello, ${currentUser.name}`;
    if (who) who.textContent = `Signed in as: ${currentUser.name}`;
    if (authHint) authHint.style.display = 'none';
  } else {
    navUser.style.display = 'none';
    navSignIn.style.display = '';
    navSignUp.style.display = '';
    if (who) who.textContent = '';
    if (authHint) authHint.style.display = 'block';
  }
}

// ===== Auth: Sign Up / Sign In / Out =====
function handleSignUp() {
  const name = byId('signupName').value.trim();
  const email = byId('signupEmail').value.trim().toLowerCase();
  const password = byId('signupPassword').value;

  if (!name || !email || !password) {
    alert('Please fill all fields.');
    return;
  }
  if (users[email]) {
    alert('Account already exists. Please sign in.');
    navTo('signin');
    return;
  }
  users[email] = { name, password };
  currentUser = { email, name };
  saveData();
  alert('Account created! You are now signed in.');
  navTo('home');
  syncAuthUI();
}

function handleSignIn() {
  const email = byId('signinEmail').value.trim().toLowerCase();
  const password = byId('signinPassword').value;

  if (!email || !password) {
    alert('Please enter email & password.');
    return;
  }
  if (!users[email] || users[email].password !== password) {
    alert('Invalid credentials.');
    return;
  }
  currentUser = { email, name: users[email].name };
  saveData();
  alert('Signed in!');
  navTo('home');
  syncAuthUI();
}

function signOut() {
  currentUser = null;
  saveData();
  navTo('home');
  syncAuthUI();
}

// ===== Tasks =====
function addTask() {
  if (!currentUser) {
    alert('Please sign in to add tasks.');
    return;
  }
  const name = byId('taskName').value.trim();
  const assigned = byId('assignedTo').value;
  const dueDate = byId('dueDate').value;
  const priority = byId('priority').value;

  if (!name || !assigned) {
    alert('Please enter task and assign it to someone!');
    return;
  }

  tasks.push({
    name,
    assigned,
    dueDate: dueDate || "",
    priority,        // "Low" | "Medium" | "High"
    createdAt: Date.now(),
    done: false
  });

  byId('taskName').value = '';
  byId('assignedTo').value = '';
  byId('dueDate').value = '';

  saveData();
  renderTasks();
}

function markAsDone(index) {
  const task = tasks[index];
  if (!task) return;

  if (!task.done) {
    task.done = true;
    points[task.assigned] = (points[task.assigned] || 0) + 1;
    saveData();
    renderLeaderboard(task.assigned); // glow winner
  }

  // fade out then remove
  const li = document.querySelectorAll("#tasks li.task")[index];
  if (li) li.classList.add("fade-out");

  setTimeout(() => {
    tasks.splice(index, 1);
    saveData();
    renderTasks();
  }, 450);
}

function renderTasks() {
  const search = (byId('searchTask')?.value || '').toLowerCase();
  const list = byId('tasks');
  list.innerHTML = '';

  // sort: High > Medium > Low, then nearest due date first, then newest
  const prRank = { High: 0, Medium: 1, Low: 2 };
  const sorted = [...tasks]
    .filter(t => t.name.toLowerCase().includes(search))
    .sort((a, b) => {
      const pr = prRank[a.priority] - prRank[b.priority];
      if (pr !== 0) return pr;
      const ad = a.dueDate || '9999-12-31';
      const bd = b.dueDate || '9999-12-31';
      if (ad !== bd) return ad.localeCompare(bd);
      return b.createdAt - a.createdAt;
    });

  sorted.forEach((task) => {
    const realIndex = tasks.indexOf(task);

    const li = document.createElement('li');
    li.className = `task ${task.priority.toLowerCase()}`;

    const top = document.createElement('div');
    top.innerHTML = `<strong>${task.name}</strong> — ${task.assigned}`;

    const meta = document.createElement('div');
    meta.className = 'meta';
    const dueTxt = task.dueDate ? `Due: ${task.dueDate}` : 'No due date';
    meta.innerHTML = `
      <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
      <span>${dueTxt}</span>
    `;

    const doneBtn = document.createElement('button');
    doneBtn.className = 'done-btn';
    doneBtn.textContent = '✔ Done';
    doneBtn.onclick = () => markAsDone(realIndex);

    li.appendChild(top);
    li.appendChild(meta);
    li.appendChild(doneBtn);
    list.appendChild(li);
  });

  byId('taskCount').textContent = `${sorted.length} task(s)`;
}

function renderLeaderboard(pingName = null) {
  const list = byId('leaderboard');
  list.innerHTML = '';
  const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([name, point]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${name}</span><strong>${point} pts</strong>`;
    if (pingName && pingName === name) {
      li.classList.add('ping');
      setTimeout(() => li.classList.remove('ping'), 900);
    }
    list.appendChild(li);
  });
}

function clearAll() {
  if (!currentUser) { alert('Please sign in to clear data.'); return; }
  if (confirm("Are you sure you want to clear all data?")) {
    tasks = [];
    points = { JYOTHI: 0, CHAITRA: 0, SREE: 0 };
    saveData();
    renderTasks();
    renderLeaderboard();
  }
}

// ===== Initial boot =====
handleHashRoute();
syncAuthUI();
renderTasks();
renderLeaderboard();
