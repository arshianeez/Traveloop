const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Socket.io for Real-Time updates
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('join-trip', (tripId) => {
    socket.join(`trip-${tripId}`);
  });

  socket.on('trip-updated', (tripId) => {
    socket.to(`trip-${tripId}`).emit('trip-changed');
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// API Routes

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  db.get("SELECT id, full_name FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(401).json({ error: 'Invalid credentials' });
    // In a real app, verify password hash and issue JWT
    res.json({ user: row, token: 'mock-jwt-token' });
  });
});

app.post('/api/auth/signup', (req, res) => {
  const { full_name, email, password } = req.body;
  db.run("INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)", [full_name, email, password], function(err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "Email already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: "Account created successfully", id: this.lastID });
  });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  // Mock forgot password: just check if user exists and pretend to send email
  db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      console.log(`[Mock Email] Password reset link sent to ${email}`);
    }
    // Always return success to prevent email enumeration
    res.json({ message: "If the email exists, a reset link was sent." });
  });
});

// Get all trips for user
app.get('/api/trips', (req, res) => {
  // Hardcoding user_id 1 for prototype
  db.all("SELECT * FROM trips WHERE user_id = 1 ORDER BY start_date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create trip
app.post('/api/trips', (req, res) => {
  const { name, description, start_date, end_date, cover_photo_url } = req.body;
  const sql = "INSERT INTO trips (user_id, name, description, start_date, end_date, cover_photo_url) VALUES (1, ?, ?, ?, ?, ?)";
  db.run(sql, [name, description, start_date, end_date, cover_photo_url], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, description, start_date, end_date, cover_photo_url });
  });
});

// Delete trip
app.delete('/api/trips/:id', (req, res) => {
  db.run("DELETE FROM trips WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Get Cities
app.get('/api/cities', (req, res) => {
  db.all("SELECT * FROM cities ORDER BY popularity_score DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Get Activities
app.get('/api/activities', (req, res) => {
  db.all(`
    SELECT a.*, c.name as city_name 
    FROM activities a 
    JOIN cities c ON a.city_id = c.id
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Packing list
app.get('/api/packing', (req, res) => {
  db.all("SELECT * FROM packing_items WHERE trip_id = 1", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/packing', (req, res) => {
  const { label, category } = req.body;
  db.run("INSERT INTO packing_items (trip_id, label, category) VALUES (1, ?, ?)", [label, category], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, label, category, is_packed: false });
  });
});

app.put('/api/packing/:id', (req, res) => {
  const { is_packed } = req.body;
  db.run("UPDATE packing_items SET is_packed = ? WHERE id = ?", [is_packed ? 1 : 0, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Notes
app.get('/api/notes', (req, res) => {
  db.all("SELECT * FROM trip_notes WHERE trip_id = 1 ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/notes', (req, res) => {
  const { body, scope } = req.body;
  db.run("INSERT INTO trip_notes (trip_id, scope, body) VALUES (1, ?, ?)", [scope, body], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, body, scope, created_at: new Date().toISOString() });
  });
});

app.delete('/api/notes/:id', (req, res) => {
  db.run("DELETE FROM trip_notes WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Trip Stops
app.get('/api/trips/:id/stops', (req, res) => {
  db.all("SELECT ts.*, c.name as city_name FROM trip_stops ts JOIN cities c ON ts.city_id = c.id WHERE trip_id = ? ORDER BY position ASC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/trips/:id/stops', (req, res) => {
  const { city_id, position, arrival_date, departure_date, notes } = req.body;
  db.run("INSERT INTO trip_stops (trip_id, city_id, position, arrival_date, departure_date, notes) VALUES (?, ?, ?, ?, ?, ?)", 
    [req.params.id, city_id, position, arrival_date, departure_date, notes], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
  });
});

app.put('/api/stops/:id', (req, res) => {
  const { position, arrival_date, departure_date } = req.body;
  db.run("UPDATE trip_stops SET position=?, arrival_date=?, departure_date=? WHERE id=?", 
    [position, arrival_date, departure_date, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

// Trip Activities
app.get('/api/stops/:id/activities', (req, res) => {
  db.all("SELECT * FROM trip_activities WHERE trip_stop_id = ? ORDER BY scheduled_date ASC", [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/stops/:id/activities', (req, res) => {
  const { activity_id, title, scheduled_date, start_time, estimated_cost } = req.body;
  db.run("INSERT INTO trip_activities (trip_stop_id, activity_id, title, scheduled_date, start_time, estimated_cost) VALUES (?, ?, ?, ?, ?, ?)",
    [req.params.id, activity_id, title, scheduled_date, start_time, estimated_cost], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
  });
});

app.delete('/api/trip_activities/:id', (req, res) => {
  db.run("DELETE FROM trip_activities WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Copy Trip
app.post('/api/trips/:id/copy', (req, res) => {
  // Mock copy logic
  res.json({ message: "Trip copied successfully", newTripId: Date.now() });
});

// Trip Health
app.get('/api/trips/:id/health', (req, res) => {
  db.get("SELECT budget_limit FROM trips WHERE id = ?", [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Not found" });
    const limit = row.budget_limit || 4000;
    // Mock aggregated cost
    const spent = 2840;
    res.json({ limit, spent, percent: (spent / limit) * 100 });
  });
});

// Admin Stats
app.get('/api/admin/stats', (req, res) => {
  const stats = {
    totalTrips: 42,
    totalUsers: 18,
    topCities: [
      { name: 'Tokyo', count: 12 },
      { name: 'Seoul', count: 8 },
      { name: 'Lisbon', count: 5 }
    ],
    engagement: [
      { month: 'Jan', active: 20 },
      { month: 'Feb', active: 35 },
      { month: 'Mar', active: 50 },
      { month: 'Apr', active: 45 }
    ]
  };
  res.json(stats);
});

// Delete User
app.delete('/api/users/me', (req, res) => {
  db.run("DELETE FROM users WHERE id = 1", (err) => {
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
