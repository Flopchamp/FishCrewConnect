# FishCrewConnect

A job marketplace for Kenya's fishing industry. Boat owners post crew positions,
fishermen apply, and completed work is paid out through M-Pesa with the platform
commission split automatically.

The repository holds three surfaces:

| Directory | What it is |
|---|---|
| `FishCrewConnect/` | Mobile app — React Native via Expo |
| `FishCrewConnect-WebAdmin/` | Web admin interface |
| `FishCrewConnect-backend/` | REST API — Node.js and Express, MySQL |

## How it works

**Jobs and applications.** Boat owners post jobs; fishermen apply; the owner
accepts, marks the work complete, and pays. Application state drives everything
else in the system.

**Messaging is scoped to that relationship.** Fishermen can only message boat
owners whose jobs they have applied to, and owners can only message their own
applicants. There is no open directory and no way to message an unrelated user —
the contact list is derived from applications rather than stored separately.

**Payments run on the Daraja API.** The backend initiates an STK Push, verifies
the callback server-side before crediting anything, and calculates the platform
commission on the split. `DARAJA_DEMO_MODE=true` runs the whole flow against
sandbox credentials so the payment path can be exercised without real money.

**Auth** is JWT with bcrypt-hashed passwords, a token blacklist for logout, and
role-based access across three roles: fisherman, boat owner, admin. Password
reset goes through an emailed single-use token.

## Running it

Requires Node.js and a MySQL server.

**Backend**

```bash
cd FishCrewConnect-backend
npm install
# create .env with the MySQL connection details, JWT_SECRET,
# SMTP credentials, and DARAJA_DEMO_MODE=true
npm run setup            # creates the schema
npm run dev
```

**Mobile app**

```bash
cd FishCrewConnect
npm install
npm start
```

**Web admin**

```bash
cd FishCrewConnect-WebAdmin
npm install
npm run dev
```

## Tests

```bash
cd FishCrewConnect-backend
npm test                 # full suite
npm run test:unit        # unit tests only
npm run test:coverage    # with coverage
npm run test-demo-payment  # exercises the M-Pesa flow in demo mode
```

## Stack

**Backend** — Express, MySQL (`mysql2`), Socket.io for real-time messaging,
`jsonwebtoken` and `bcryptjs` for auth, `helmet` and `express-rate-limit` for
request hardening, `winston` for logging, `nodemailer` for transactional mail,
`multer` for uploads.

**Mobile** — React Native on Expo, NativeWind for styling, React Navigation,
AsyncStorage for session persistence.

## Documentation

Per-surface setup lives in each directory's own README. Feature notes and user
guides are under `docs/`.
