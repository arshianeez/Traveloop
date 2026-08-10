// Global State
let trips = [];
let cities = [];
let activities = [];
let packingItems = [];
let notes = [];
let currentUser = null;
let adminStats = null;
let activeTripId = 1;

// Mockup Data
let stops = [
  { city: "Tokyo", dates: "Oct 4 - Oct 8", nights: 4, activities: ["Tsukiji breakfast walk", "Yanaka neighborhood stroll"] },
  { city: "Kyoto", dates: "Oct 8 - Oct 11", nights: 3, activities: ["Tea ceremony", "Arashiyama morning walk"] },
  { city: "Seoul", dates: "Oct 11 - Oct 15", nights: 4, activities: ["Han River night ride", "Market dinner tour"] }
];

let timeline = [
  { day: "Day 1", date: "Oct 4", title: "Arrive in Tokyo", detail: "Check in, light ramen dinner, and early night.", price: "$92" },
  { day: "Day 3", date: "Oct 6", title: "Tsukiji and Ginza", detail: "Breakfast walk, stationery stores, and museum block.", price: "$148" },
  { day: "Day 7", date: "Oct 10", title: "Kyoto temples", detail: "Tea ceremony, river walk, and quiet dinner reservation.", price: "$121" },
  { day: "Day 10", date: "Oct 13", title: "Seoul food night", detail: "Palace morning, cafe afternoon, market dinner tour.", price: "$216" }
];

const budget = [
  { label: "Transport", value: 880, color: "#315f8c" },
  { label: "Stay", value: 1040, color: "#0f766e" },
  { label: "Activities", value: 520, color: "#c7503d" },
  { label: "Meals", value: 400, color: "#d89b2b" }
];

// Setup Real-time connection
const socket = io();
socket.on('connect', () => {
  socket.emit('join-trip', activeTripId);
});

socket.on('trip-changed', () => {
  fetchData();
});

// DOM Elements
const screens = [...document.querySelectorAll(".screen")];
const navLinks = [...document.querySelectorAll(".nav-link")];
const pageTitle = document.querySelector("#pageTitle");
const sidebar = document.querySelector(".sidebar");

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function setScreen(id) {
  const target = document.getElementById(id) ? id : "dashboard";
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === target));
  navLinks.forEach((link) => link.classList.toggle("active", link.dataset.screen === target));
  pageTitle.textContent = document.getElementById(target).dataset.title;
  sidebar.classList.remove("open");
  history.replaceState(null, "", `#${target}`);
  if (target === 'admin' && adminStats) renderAdmin();
}

async function fetchData() {
  try {
    const [resTrips, resCities, resActivities, resPacking, resNotes] = await Promise.all([
      fetch('/api/trips').then(res => res.json()),
      fetch('/api/cities').then(res => res.json()),
      fetch('/api/activities').then(res => res.json()),
      fetch('/api/packing').then(res => res.json()),
      fetch('/api/notes').then(res => res.json())
    ]);

    trips = resTrips;
    cities = resCities;
    activities = resActivities;
    packingItems = resPacking;
    notes = resNotes;

    if (currentUser && currentUser.is_admin) {
      document.getElementById('navAdmin').classList.remove('hidden');
      try {
        adminStats = await fetch('/api/admin/stats').then(res => res.json());
      } catch (e) { console.error("Admin fetch failed", e); }
    }

    if (trips.length > 0) {
      activeTripId = trips[0].id;
      document.getElementById('dashUpcomingTrips').textContent = trips.length;
    }

    renderAll();
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

// Trip health static now
function updateTripHealth(tripId) {}

function notifyUpdate() {
  socket.emit('trip-updated', activeTripId);
}

function renderTrips() {
  const recent = document.querySelector("#recentTrips");
  const cards = document.querySelector("#tripCards");

  recent.innerHTML = trips.slice(0, 3).map((trip) => `
    <article>
      <img src="${trip.cover_photo_url}" alt="" />
      <div>
        <strong>${trip.name}</strong>
        <div class="muted">${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}</div>
      </div>
      <button class="secondary-action" type="button" data-go="builder">View</button>
    </article>
  `).join("");

  cards.innerHTML = trips.map((trip) => `
    <article class="trip-card">
      <img src="${trip.cover_photo_url}" alt="" />
      <div class="trip-card-body">
        <span class="eyebrow">${new Date(trip.start_date).toLocaleDateString()} - ${new Date(trip.end_date).toLocaleDateString()}</span>
        <h2>${trip.name}</h2>
        <p class="muted">${trip.description || ''}</p>
        <div class="meta-line">
          <span>${trip.budget_limit ? money(trip.budget_limit) + ' budget' : 'No budget set'}</span>
          <span class="text-action view-places" style="cursor:pointer; text-decoration:underline;" data-trip="${trip.id}">3 Destinations</span>
        </div>
        <div class="card-actions">
          <button class="primary-action" type="button" data-go="builder">View / Edit</button>
          <button class="secondary-action" type="button" data-go="share">Share</button>
          <button class="secondary-action delete-trip" type="button" data-id="${trip.id}">Delete</button>
        </div>
      </div>
    </article>
  `).join("");

  // Bind View Destinations inline logic
  document.querySelectorAll('.view-places').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.textContent = "Tokyo, Kyoto, Seoul"; // Mocking actual places
    });
  });
}

function renderCities() {
  const recommended = document.querySelector("#recommendedCities");
  recommended.innerHTML = cities.slice(0, 4).map((city) => `
    <article class="city-card">
      <img src="${city.image_url}" alt="" />
      <div>
        <strong>${city.name}</strong>
        <div>${city.country} · Popularity ${city.popularity_score}</div>
      </div>
    </article>
  `).join("");
  renderDiscover();
}

function renderDiscover() {
  const term = document.querySelector("#searchInput").value.trim().toLowerCase();
  const region = document.querySelector("#regionFilter").value;
  const cityResults = document.querySelector("#cityResults");
  const activityResults = document.querySelector("#activityResults");

  const cityMatches = cities.filter((city) => {
    const text = `${city.name} ${city.country} ${city.region}`.toLowerCase();
    return text.includes(term) && (region === "all" || city.region === region);
  });

  const activityMatches = activities.filter((activity) => {
    const text = `${activity.name} ${activity.city_name} ${activity.category}`.toLowerCase();
    return text.includes(term);
  });

  cityResults.innerHTML = cityMatches.map((city) => `
    <article class="result-card">
      <strong>${city.name}, ${city.country}</strong>
      <p class="muted">${city.region} destination with ${city.cost_index} cost index.</p>
      <div class="meta-line">
        <span>${city.region}</span>
        <span>Cost index ${city.cost_index}</span>
      </div>
      <button class="secondary-action add-city" type="button">Add to Trip</button>
    </article>
  `).join("") || `<p class="muted">No cities match.</p>`;

  activityResults.innerHTML = activityMatches.map((activity) => `
    <article class="result-card">
      <strong>${activity.name}</strong>
      <p class="muted">${activity.city_name} · ${activity.duration_minutes}m · ${money(activity.estimated_cost)}</p>
      <div class="activity-tags">
        <span>${activity.category}</span>
        <span>${money(activity.estimated_cost)}</span>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="primary-action add-activity" type="button">Add</button>
        <button class="secondary-action quick-view-btn" type="button" data-id="${activity.id}">Quick View</button>
      </div>
    </article>
  `).join("") || `<p class="muted">No activities match.</p>`;

  document.querySelectorAll('.add-city, .add-activity').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.textContent = "Added!";
      e.target.classList.remove('secondary-action', 'primary-action');
      e.target.classList.add('text-action');
    });
  });

  document.querySelectorAll('.quick-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const act = activities.find(a => a.id == e.target.dataset.id);
      if (act) {
        document.getElementById('qvTitle').textContent = act.name;
        document.getElementById('qvImage').src = act.image_url || 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80';
        document.getElementById('qvDesc').textContent = act.description || `Enjoy a ${act.duration_minutes} minute experience in ${act.city_name} for ${money(act.estimated_cost)}. Perfect for your next trip!`;
        document.getElementById('quickViewModal').classList.remove('hidden');
      }
    });
  });
  
  document.getElementById('qvAddBtn').addEventListener('click', (e) => {
    e.target.textContent = "Added!";
    setTimeout(() => {
      document.getElementById('quickViewModal').classList.add('hidden');
      e.target.textContent = "Add to Trip";
    }, 800);
  });
}

function moveStop(index, direction) {
  if (direction === 'up' && index > 0) {
    const temp = stops[index];
    stops[index] = stops[index - 1];
    stops[index - 1] = temp;
  } else if (direction === 'down' && index < stops.length - 1) {
    const temp = stops[index];
    stops[index] = stops[index + 1];
    stops[index + 1] = temp;
  }
  renderBuilder();
}

function renderBuilder() {
  document.querySelector("#stopList").innerHTML = stops.map((stop, index) => `
    <article class="stop-card">
      <header>
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="display:flex; flex-direction:column; gap:2px;">
            <button class="text-action" onclick="moveStop(${index}, 'up')" style="line-height:0.5; font-size:16px;">▲</button>
            <button class="text-action" onclick="moveStop(${index}, 'down')" style="line-height:0.5; font-size:16px;">▼</button>
          </div>
          <strong>${index + 1}. ${stop.city}</strong>
        </div>
        <span class="muted">${stop.nights} nights</span>
      </header>
      <div class="muted">${stop.dates}</div>
      <div class="activity-tags">
        ${stop.activities.map((activity) => `<span>${activity}</span>`).join("")}
        <span class="text-action" style="cursor:pointer;" onclick="alert('Select activity from Discover')">+ Assign Activity</span>
      </div>
    </article>
  `).join("");

  renderTimeline();
}

function renderTimeline() {
  const container = document.querySelector("#timeline");
  const publicContainer = document.querySelector("#publicTimeline");

  const markup = timeline.map((item) => `
    <article class="timeline-item">
      <div>
        <div class="timeline-date">${item.day}</div>
        <span class="muted">${item.date}</span>
      </div>
      <div>
        <strong>${item.title}</strong>
        <p class="muted">${item.detail}</p>
      </div>
      <strong class="price">${item.price}</strong>
    </article>
  `).join("");
  container.innerHTML = markup;
  if (publicContainer) publicContainer.innerHTML = markup;
}

function renderBudget() {
  const max = Math.max(...budget.map((item) => item.value));
  const total = budget.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;
  
  const conicStops = budget.map(item => {
    const percent = (item.value / total) * 100;
    const stop = `${item.color} ${cumulativePercent}% ${cumulativePercent + percent}%`;
    cumulativePercent += percent;
    return stop;
  }).join(", ");

  const pieChart = document.querySelector("#budgetPieChart");
  if(pieChart) {
    pieChart.style.background = `conic-gradient(${conicStops})`;
    pieChart.className = 'pie-chart';
  }

  document.querySelector("#budgetBars").innerHTML = budget.map((item) => `
    <div class="bar-row">
      <strong>${item.label}</strong>
      <div class="bar-track"><span style="width:${(item.value / max) * 100}%; background:${item.color}"></span></div>
      <span>${money(item.value)}</span>
    </div>
  `).join("");
}

function renderPacking() {
  document.querySelector("#packingList").innerHTML = packingItems.map((entry) => `
    <label class="check-item ${entry.is_packed ? "packed" : ""}">
      <span>
        <input type="checkbox" data-pack="${entry.id}" ${entry.is_packed ? "checked" : ""} />
        ${entry.label}
      </span>
      <span class="muted">${entry.category}</span>
    </label>
  `).join("");
}

function renderNotes() {
  const tripName = trips.length > 0 ? trips[0].name : "Trip";
  document.querySelector("#notesList").innerHTML = notes.map((note) => {
    const scopeLabel = (note.scope && note.scope !== "Whole trip") ? `${note.scope}` : tripName;
    return `
    <article class="note-card">
      <header>
        <div>
          <strong>Note for ${scopeLabel}</strong>
          <span class="muted" style="margin-left:8px; font-size:12px;">${new Date(note.created_at).toLocaleString()}</span>
        </div>
        <div>
          <button class="text-action edit-note" type="button" style="margin-right:8px;">Edit</button>
          <button class="text-action delete-note" type="button" data-note="${note.id}">Delete</button>
        </div>
      </header>
      <p>${note.body}</p>
    </article>
    `;
  }).join("");
}

function renderAdmin() {
  if (!adminStats) return;
  document.querySelector("#adminTopStats").innerHTML = `
    <article class="stat-tile"><span>Total Trips</span><strong>${adminStats.totalTrips}</strong></article>
    <article class="stat-tile"><span>Total Users</span><strong>${adminStats.totalUsers}</strong></article>
  `;

  document.querySelector("#adminEngagementChart").innerHTML = adminStats.engagement.map(e => `
    <div class="bar-row">
      <strong>${e.month}</strong>
      <div class="bar-track"><span style="width:${(e.active / 50) * 100}%; background:var(--teal)"></span></div>
      <span>${e.active} Active</span>
    </div>
  `).join("");

  document.querySelector("#adminCitiesChart").innerHTML = adminStats.topCities.map(c => `
    <div class="bar-row">
      <strong>${c.name}</strong>
      <div class="bar-track"><span style="width:${(c.count / 12) * 100}%; background:var(--coral)"></span></div>
      <span>${c.count} Trips</span>
    </div>
  `).join("");

  document.querySelector("#adminUserTable").innerHTML = `
    <table class="admin-table">
      <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Alex Traveler</td><td>alex@demo.com</td><td>Admin</td><td>Active</td></tr>
        <tr><td>Farhana T</td><td>farhana@example.com</td><td>User</td><td>Active</td></tr>
      </tbody>
    </table>
  `;
}

function renderAll() {
  renderTrips();
  renderCities();
  renderBuilder();
  renderBudget();
  renderPacking();
  renderNotes();
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const go = event.target.closest("[data-go]");
    if (go) setScreen(go.dataset.go);

    const deleteTrip = event.target.closest(".delete-trip");
    if (deleteTrip) {
      const id = deleteTrip.dataset.id;
      await fetch(`/api/trips/${id}`, { method: 'DELETE' });
      fetchData();
      notifyUpdate();
    }

    const noteDelete = event.target.closest(".delete-note");
    if (noteDelete) {
      const id = noteDelete.dataset.note;
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      fetchData();
      notifyUpdate();
    }
  });

  document.querySelector("#menuButton").addEventListener("click", () => sidebar.classList.toggle("open"));
  navLinks.forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setScreen(link.dataset.screen);
  }));

  const loginForm = document.querySelector("#loginForm");
  const signupForm = document.querySelector("#signupForm");
  const forgotForm = document.querySelector("#forgotForm");

  document.querySelector("#showSignup").addEventListener("click", () => {
    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");
  });

  document.querySelector("#showForgot").addEventListener("click", () => {
    loginForm.classList.add("hidden");
    forgotForm.classList.remove("hidden");
  });

  const showLogin = () => {
    signupForm.classList.add("hidden");
    forgotForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  };

  document.querySelector("#showLoginFromSignup").addEventListener("click", showLogin);
  document.querySelector("#showLoginFromForgot").addEventListener("click", showLogin);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = event.currentTarget.querySelector('input[name="email"]').value;
    const password = event.currentTarget.querySelector('input[name="password"]').value;
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        document.querySelector("#authModal").classList.add("hidden");
        fetchData();
      } else {
        alert("Login failed. Check your credentials.");
      }
    } catch (err) {
      console.error(err);
    }
  });

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = event.currentTarget.querySelector('input[name="name"]').value;
    const email = event.currentTarget.querySelector('input[name="email"]').value;
    const password = event.currentTarget.querySelector('input[name="password"]').value;
    
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name, email, password })
      });
      if (res.ok) {
        alert("Account created successfully! Please login.");
        showLogin();
      } else {
        const data = await res.json();
        alert(data.error || "Signup failed");
      }
    } catch (err) {
      console.error(err);
    }
  });

  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = event.currentTarget.querySelector('input[name="email"]').value;
    
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        alert("If that email exists, a password reset link has been sent.");
        showLogin();
      } else {
        alert("Failed to send reset link.");
      }
    } catch (err) {
      console.error(err);
    }
  });

  document.querySelector("#tripForm").addEventListener("input", (event) => {
    const form = event.currentTarget;
    document.querySelector("#tripPreviewTitle").textContent = form.name.value || "Untitled trip";
    document.querySelector("#tripPreviewText").textContent = form.description.value || "No description yet.";
    document.querySelector("#tripPreviewImage").src = form.cover.value || (trips[0] ? trips[0].cover_photo_url : '');
  });

  document.querySelector("#tripForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const newTrip = {
      name: form.name.value,
      description: form.description.value,
      start_date: form.start.value,
      end_date: form.end.value,
      cover_photo_url: form.cover.value
    };

    await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTrip)
    });
    
    fetchData();
    notifyUpdate();
    setScreen("trips");
  });

  document.querySelector("#addStopButton").addEventListener("click", () => {
    stops.push({ city: "Select City", dates: "Select dates", nights: 1, activities: [] });
    renderBuilder();
  });

  document.querySelector("#searchInput").addEventListener("input", renderDiscover);
  document.querySelector("#regionFilter").addEventListener("change", renderDiscover);

  document.querySelector("#profileForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const fileInput = e.target.querySelector('input[type="file"]');
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const headerPic = document.getElementById("headerProfilePic");
        if (headerPic) {
          headerPic.src = event.target.result;
        }
      };
      reader.readAsDataURL(fileInput.files[0]);
    }
    alert("Profile updated successfully!");
  });

  document.querySelector("#packingForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    await fetch('/api/packing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: form.item.value,
        category: form.category.value
      })
    });
    
    form.reset();
    fetchData();
    notifyUpdate();
  });

  document.querySelector("#packingList").addEventListener("change", async (event) => {
    const id = event.target.dataset.pack;
    if (id !== undefined) {
      await fetch(`/api/packing/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_packed: event.target.checked })
      });
      fetchData();
      notifyUpdate();
    }
  });

  document.querySelector("#noteForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    
    await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: form.note.value,
        scope: form.scope.value
      })
    });
    
    form.reset();
    fetchData();
    notifyUpdate();
  });

  document.querySelector("#copyLink").addEventListener("click", async () => {
    const url = document.querySelector(".share-url").value;
    try {
      await navigator.clipboard.writeText(url);
      document.querySelector("#copyLink").textContent = "Copied";
      setTimeout(() => {
        document.querySelector("#copyLink").textContent = "Copy URL";
      }, 1200);
    } catch {
      document.querySelector(".share-url").select();
    }
  });

  document.querySelector("#btnCopySharedTrip").addEventListener("click", async (e) => {
    try {
      const res = await fetch(`/api/trips/${activeTripId}/copy`, { method: 'POST' });
      if (res.ok) {
        e.target.textContent = "Copied to My Trips!";
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  });

  document.querySelector("#logoutButton").addEventListener("click", () => {
    document.querySelector("#authModal").classList.remove("hidden");
    currentUser = null;
    document.getElementById('navAdmin').classList.add('hidden');
    loginForm.reset();
    trips = []; cities = []; activities = []; packingItems = []; notes = [];
    renderAll();
    setScreen("dashboard");
  });

  document.querySelector("#deleteAccountButton").addEventListener("click", async () => {
    if(confirm("Are you sure you want to completely delete your account? This cannot be undone.")) {
      await fetch('/api/users/me', { method: 'DELETE' });
      document.querySelector("#logoutButton").click();
      alert("Account deleted.");
    }
  });
}

function init() {
  bindEvents();
  setScreen(location.hash.replace("#", "") || "dashboard");
  fetchData(); 
}

init();