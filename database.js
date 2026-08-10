const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'traveloop.db');
const schemaPath = path.join(__dirname, 'schema-sqlite.sql');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schema, (err) => {
    if (err) {
      console.error('Error executing schema', err.message);
      return;
    }
    console.log('Database schema verified.');
    seedData();
  });
}

function seedData() {
  // Check if cities exist, if not, seed data
  db.get('SELECT COUNT(*) as count FROM cities', (err, row) => {
    if (err) {
      console.error('Error checking cities table', err.message);
      return;
    }
    
    if (row.count === 0) {
      console.log('Seeding initial data...');
      
      const insertCity = db.prepare('INSERT INTO cities (name, country, region, cost_index, popularity_score, image_url) VALUES (?, ?, ?, ?, ?, ?)');
      insertCity.run('Tokyo', 'Japan', 'Asia', 3.00, 98, 'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80');
      insertCity.run('Seoul', 'South Korea', 'Asia', 2.00, 91, 'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=80');
      insertCity.run('Lisbon', 'Portugal', 'Europe', 2.00, 86, 'https://images.unsplash.com/photo-1501927023255-9063be98970c?auto=format&fit=crop&w=800&q=80');
      insertCity.run('Vancouver', 'Canada', 'North America', 3.00, 82, 'https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&w=800&q=80');
      insertCity.run('Sydney', 'Australia', 'Oceania', 3.50, 88, 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80');
      insertCity.run('Cape Town', 'South Africa', 'Africa', 1.50, 80, 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=800&q=80');
      insertCity.run('Rio de Janeiro', 'Brazil', 'South America', 1.80, 85, 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=800&q=80');
      insertCity.finalize();

      const insertActivity = db.prepare('INSERT INTO activities (city_id, name, category, duration_minutes, estimated_cost) VALUES (?, ?, ?, ?, ?)');
      insertActivity.run(1, 'Tsukiji breakfast walk', 'Food', 180, 84);
      insertActivity.run(2, 'Han River night ride', 'Outdoor', 120, 28);
      insertActivity.run(3, 'Tile painting workshop', 'Culture', 150, 52);
      insertActivity.run(4, 'Stanley Park cycle loop', 'Outdoor', 180, 36);
      insertActivity.run(4, 'Design district gallery pass', 'Art', 240, 44);
      insertActivity.finalize();

      // Create a test user (Admin)
      db.run("INSERT INTO users (full_name, email, password_hash, is_admin) VALUES ('Alex Traveler', 'alex@demo.com', 'password', 1)", function(err) {
        if (!err) {
          const userId = this.lastID;
          // Create trips
          const insertTrip = db.prepare("INSERT INTO trips (user_id, name, description, cover_photo_url, start_date, end_date, budget_limit) VALUES (?, ?, ?, ?, ?, ?, ?)");
          insertTrip.run(userId, "Autumn Asia Loop", "Food, design, and city walks across Tokyo, Kyoto, Seoul, and Singapore.", "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80", "2026-10-04", "2026-10-18", 2840);
          insertTrip.run(userId, "Iberian Rail Week", "A train-first itinerary through Lisbon, Porto, and Madrid.", "https://images.unsplash.com/photo-1543783207-ec64e4d95325?auto=format&fit=crop&w=800&q=80", "2026-06-03", "2026-06-10", 1660);
          insertTrip.finalize();
        }
      });
      
      console.log('Seeding completed.');
    }
  });
}

module.exports = db;
