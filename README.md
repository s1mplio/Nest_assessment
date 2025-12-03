# NestJS Task Management API

A simple REST API for a task management application built with NestJS, TypeORM, and PostgreSQL. It includes user authentication with JWT.

## Features

- User registration and sign-in.
- JWT-based authentication for protected endpoints.
- CRUD operations for tasks.
- Tasks are associated with the logged-in user.

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Node.js](https://nodejs.org/en/) (v18 or later recommended)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/) (usually included with Docker Desktop)

---

## Getting Started

Follow these steps to get the application up and running on your local machine.

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd nest-assessment
```

### 2. Configure Environment Variables

Create a `.env` file in the root of the project by copying the example file.

```bash
# For Windows (Command Prompt)
copy .env.example .env

# For Windows (PowerShell) or macOS/Linux
cp .env.example .env
```

The default values in `.env.example` are configured to work with the Docker setup below. No changes are needed.

### 3. Start the Database

This project uses Docker to run a PostgreSQL database. Run the following command to start the database container in the background.

```bash
docker-compose up -d
```

### 4. Install Dependencies

Install the required npm packages.

```bash
npm install
```

### 5. Run the Application

Start the NestJS application in development mode. The server will automatically reload on file changes.

```bash
npm run start:dev
```

The application will be running at `http://localhost:3000`.

---

## API Usage (Postman)

1.  **Sign Up**: `POST /auth/signup` with a `username` and `password` in the JSON body to create a user.
2.  **Sign In**: `POST /auth/signin` with the same credentials to receive a JWT `accessToken`.
3.  **Access Protected Routes**: For endpoints like `GET /tasks`, go to the `Authorization` tab in Postman, select `Bearer Token`, and paste the `accessToken`.