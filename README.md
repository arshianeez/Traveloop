# Traveloop

Traveloop is a responsive travel planning prototype for creating multi-city itineraries, discovering cities and activities, estimating trip costs, managing packing items, writing trip notes, and sharing public itineraries.

## What is included

- `index.html` contains the app screens and accessible page structure.
- `styles.css` contains the responsive visual system.
- `app.js` contains the in-browser state and interactions.
- `schema.sql` contains a PostgreSQL relational schema for users, trips, stops, activities, expenses, notes, packing items, saved destinations, and sharing.

## Run locally

Open `index.html` in a browser. The prototype is static and does not require a build step.

Use the login form with the prefilled demo credentials, then navigate through the sidebar. Data is stored in memory for the current page session.

## Feature coverage

- Login and signup entry screen
- Dashboard with recent trips, inspiration, and budget highlights
- Create trip form with live preview
- My Trips list with view, share, and delete actions
- Itinerary builder with stops, activities, and day-wise timeline
- City and activity search with filters
- Budget breakdown and daily alerts
- Packing checklist with add, mark packed, and reset actions
- Public itinerary view with copy URL behavior
- Profile settings and saved destinations
- Trip notes and journal entries
- Relational database design for a full backend implementation