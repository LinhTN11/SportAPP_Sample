# Backend API & Services

The SportApp backend acts as the central hub, processing business logic, handling real-time events, and managing data persistence.

## API Structure
The REST API is structured using Express routers and controllers. Base URL usually is `/api`.

### Key Domains
- **Authentication (`/api/auth`)**: Login, Registration, Password Management. Uses JWT tokens and `bcryptjs` for security.
- **Users (`/api/users`)**: Profile management, user settings.
- **Venues & Fields (`/api/fields`, `/api/venues`)**: Fetching available venues, field details, location-based queries.
- **Bookings (`/api/bookings`)**: Logic to create, verify, and track sports field bookings.
- **Matchmaking (`/api/matchmaking`)**: Endpoints to create posts looking for players, accepting/rejecting requests.
- **Chat (`/api/chat`)**: Retrieve chat history and room metadata.

## Core Services

To keep controllers thin, complex business logic is encapsulated in the `src/services/` directory:

- `bookingService.js`: Handles checking field availability, creating booking records, and resolving scheduling conflicts.
- `reportService.js`: Generates statistics, Excel/Word reports for venue owners and admins (utilizes `docx`, `exceljs`).
- `chatbot/`: Logic for processing AI intents and fallback tools.

## Background Jobs
SportApp uses `bullmq` connected to Redis for processing background tasks asynchronously.
- Location: `src/jobs/queue.js`
- Uses: Scheduled reminders, clearing expired bookings, or heavy reporting tasks.

## Database (Prisma)
The database schema is defined in `prisma/schema.prisma`. 
Common entities:
- `User`: Accounts and profiles.
- `Venue` / `Field`: Sports locations and specific playing fields.
- `Booking`: Reservation records.
- `MatchPost` / `MatchRequest`: Matchmaking system records.
- `Room` / `Message`: Real-time chat history.
