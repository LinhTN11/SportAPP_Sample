# Frontend UI

The frontend of SportApp is built with Next.js using the modern App Router architecture, focusing on performance, modularity, and a dynamic user experience.

## Core Framework
- **Next.js 16**: Utilizing the `app/` directory for routing.
- **Styling**: A mix of Tailwind CSS utilities and traditional CSS modules (`.module.css`) for component-specific scoping.

## Directory Layout
### `src/app/`
Contains the file-system based routes. Important routes include:
- `/(main)`: The main layout wrapper for public/user-facing pages.
- `/admin/`: Dashboard and administration pages.
- `/matchmaking/`: Pages dedicated to finding teammates.
- `/notifications/`: User notifications center.
- `/chat/`: Dedicated full-page chat interface.

### `src/components/`
A rich library of reusable UI components.
- **Layout:** `Navbar.js`, `Sidebar.js`.
- **Chat:** `GlobalChatBubble.js` (floating widget), `BotToolResults.js`.
- **Venues:** `VenueCard.js`, `MapPicker.js` (React-Leaflet integration).
- **UI Elements:** `StatusBadge.js`, `Icons.js`, custom buttons/inputs.

### `src/lib/`
Utility modules and helpers:
- `auth.js`: Manages authentication state, token storage (via `js-cookie`), and context providers.
- API utility wrappers (`axios` configuration with interceptors).

## State Management
- Primarily relies on React Context and Hooks for global state (e.g., Auth Context, Socket Context).
- Local component state is used for UI toggles and form handling.

## Responsive Design
The application is designed to be fully responsive. Specific features like the `GlobalChatBubble` are optimized to stay accessible on both mobile and desktop viewports, synchronizing seamlessly with the dedicated `/chat` page.
