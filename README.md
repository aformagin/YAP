# Yet Another Player (YAP)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

YAP is a free and open-source, self-hosted media player and server, with a focus on music. The goal of this application is to allow people to host music and media on local networks that do not have access to a WAN (Offline).

## Features

- **Self-hosted:** Host your own music server on your own hardware.
- **Offline First:** Designed to work on local networks without an internet connection.
- **Web-based UI:** Modern and responsive web interface to access your music.
- **Music Library:** Scan and import your music library.
- **Audio Streaming:** Stream music directly from your server to your browser.
- **User Authentication:** Protect your music library with a username and password.
- **Album Art:** Automatically scrapes album art for your music.
- **Queue Management:** Queue up tracks to play next.

## Tech Stack

### Backend

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [NeDB](https://github.com/louischatriot/nedb) (for database)
- [music-metadata](https://github.com/Borewit/music-metadata) (for reading music metadata)

### Frontend

- [Vue.js](https://vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Vue Router](https://router.vuejs.org/)
- [Pinia](https://pinia.vuejs.org/)
- [Axios](https://axios-http.com/)

### Containerization

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Docker](https://www.docker.com/get-started) (for containerized deployment)

### Installation (Docker)

The easiest way to get started is with Docker Compose.

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/YAP.git
    cd YAP
    ```
2.  Create a `music` directory and add your music files:
    ```bash
    mkdir music
    ```
3.  Run the application using Docker Compose:
    ```bash
    docker-compose up -d
    ```
4.  The application will be available at `http://localhost:8080`.

### Installation (Local Development)

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/YAP.git
    cd YAP
    ```
2.  Install dependencies for both the backend and frontend:
    ```bash
    npm install
    ```
3.  Start the development servers:
    ```bash
    npm run dev
    ```
4.  The frontend will be available at `http://localhost:5173` (or another port if 5173 is busy) and the backend at `http://localhost:3000`.

## Project Structure

```
.
├── backend/            # Node.js backend
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic
│   │   ├── middleware/ # Express middleware
│   │   └── index.js    # Backend entrypoint
│   └── package.json
├── frontend/           # Vue.js frontend
│   ├── src/
│   │   ├── components/ # Vue components
│   │   ├── views/      # Vue views (pages)
│   │   ├── router/     # Vue router setup
│   │   ├── stores/     # Pinia stores
│   │   └── main.js     # Frontend entrypoint
│   └── package.json
├── docker-compose.yml  # Docker Compose configuration
└── README.md
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.