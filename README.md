# Real-Time Collaborative Task Manager

A full-stack collaborative task management application built with Spring Boot and React. The application allows teams to manage projects, assign tasks, collaborate in real time using WebSockets, and receive AI-assisted task suggestions.

## Features

- User authentication using JWT
- Role-based access (Admin, Member, Viewer)
- Real-time task updates using WebSockets
- Project and task management
- Team member management
- AI-generated subtasks and task suggestions using Groq (Llama 3)
- PostgreSQL database
- Redis caching
- Dockerized backend and frontend
- Docker Compose support
- GitHub version control

## Tech Stack

### Backend
- Java 21
- Spring Boot
- Spring Security
- Spring Data JPA
- PostgreSQL
- Redis
- WebSockets
- JWT Authentication

### Frontend
- React
- JavaScript
- HTML
- CSS

### DevOps
- Docker
- Docker Compose
- Git
- GitHub

## Project Structure

```
task-manager/
│
├── frontend/        # React application
└── taskmanager/     # Spring Boot backend
```

## Getting Started

### Clone the repository

```bash
git clone https://github.com/Ankithakarmanchi/task-manager.git
```

### Start the application

```bash
cd taskmanager
docker compose up --build
```

### Access the application

Frontend:

```
http://localhost:3000
```

Backend API:

```
http://localhost:8081
```

## Future Improvements

- GitHub Actions CI/CD
- Swagger API documentation
- Cloud deployment
- Unit and integration testing
- Email notifications

## Author

**Ankitha K**