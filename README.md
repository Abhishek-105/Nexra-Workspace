# 🚀 WorkSphere
Also shown as "Nexra Workspace" in the app UI.

> Employee daily work and project management platform designed to manage teams, projects, tasks, assignments, and daily work updates through role-based Manager and Employee workflows.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-Frontend-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-Language-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Laravel-Backend-red?style=for-the-badge&logo=laravel" alt="Laravel" />
  <img src="https://img.shields.io/badge/PostgreSQL-Database-blue?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Status-Live-success?style=for-the-badge" alt="Status" />
</p>

<p align="center">
  <a href="#-live-demo">Live Demo</a> •
  <a href="#-features">Features</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-known-issues">Known Issues</a>
</p>

---

## 📖 Overview

**WorkSphere** is a full-stack workspace built around a realistic company workflow.

Managers can create projects, manage employees, assign tasks, and review daily work updates. Employees can view their assignments, complete tasks, submit daily updates, report blockers, and manage their profiles.

The application uses a separate **Next.js frontend** and **Laravel REST API**, with **Sanctum authentication, role-based authorization, relational database design, file management, and cloud deployment**.

## 🔗 Live Demo

* **App:** [work-sphere-pi-taupe.vercel.app](https://work-sphere-pi-taupe.vercel.app/)

> 🔐 Demo accounts are available for testing both Manager and Employee workflows.

## 🔐 Demo Access

| Role           | Email                          | Password      |
| -------------- | ------------------------------ | ------------- |
| 👨‍💼 Manager  | `demo.manager@worksphere.com`  | `Demo@123456` |
| 👨‍💻 Employee | `demo.employee@worksphere.com` | `Demo@123456` |

> Public registration is intentionally disabled because WorkSphere represents an internal company workspace.

## ✨ Features

* 🔐 **Authentication & Authorization** — Laravel Sanctum authentication with role-based Manager and Employee access
* 👥 **Team Management** — Manage employees, roles, designations, status, and assignments
* 📁 **Project Management** — Create, update, track, and manage projects with assigned employees
* 📋 **Task Management** — Create tasks, assign employees, manage deadlines, and track progress
* 📝 **Daily Work Updates** — Employees submit work summaries, hours, blockers, and next-day plans
* 🔎 **Manager Review Workflow** — Managers can review employee daily updates, acknowledge blockers, and mark updates as reviewed
* 📎 **File Management** — Upload and manage project and work-related files
* 👤 **Profile Management** — Users can update their profile information and profile photo
* 📊 **Role-Based Dashboards** — Separate dashboards and workflows for Managers and Employees
* 🖥️ **Compact Enterprise UI** — Clean dashboard-style interface with separate Manager and Employee themes
* 🛡️ **Protected Demo Accounts** — Shared demo accounts cannot change their login credentials

## 🛠️ Tech Stack

**Frontend**

* Next.js
* React
* TypeScript
* Tailwind CSS

**Backend**

* Laravel 12
* PHP 8.2
* Laravel Sanctum
* Eloquent ORM
* REST API

**Database**

* PostgreSQL

**Deployment**

* Vercel
* Render
* Docker

**Tools**

* Git
* GitHub

## 🏗️ Architecture

```text
Next.js + React + TypeScript
            │
            │ REST API
            ▼
    Laravel 12 + Sanctum
            │
            │ Eloquent ORM
            ▼
        PostgreSQL
```

### Application Flow

```text
👨‍💼 Manager
     │
     ├── 📁 Creates Projects
     ├── 📋 Creates Tasks
     └── 👥 Assigns Employees
                │
                ▼
          👨‍💻 Employee
                │
                ├── 🛠️ Completes Work
                └── 📝 Submits Daily Update
                           │
                           ▼
                      👨‍💼 Manager
                           │
                        🔎 Reviews
```

## 🚀 Getting Started

### Prerequisites

* PHP 8.2+
* Composer
* Node.js 18+
* PostgreSQL
* Git

### 1. Clone the repository

```bash
git clone https://github.com/Abhishek-105/WorkSphere.git
cd WorkSphere
```

### 2. Backend Setup

```bash
composer install
cp .env.example .env        # on Windows use: copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan storage:link
php artisan serve
```

Configure your database and application settings in `.env`.

The Laravel API will run at:

```text
http://127.0.0.1:8000
```

### 3. Frontend Setup

```bash
cd nexra-frontend
npm install
npm run dev
```

Create `.env.local`:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

The Next.js application will run at:

```text
http://localhost:3000
```

## 📂 Project Structure

```text
WorkSphere/
├── app/
│   ├── Http/
│   │   └── Controllers/
│   └── Models/
│
├── database/
│   └── migrations/
│
├── routes/
│   ├── api.php
│   └── web.php
│
├── nexra-frontend/
│   ├── app/
│   │   ├── manager/
│   │   └── employee/
│   ├── components/
│   ├── context/
│   └── lib/
│
├── Dockerfile
└── README.md
```

## 🐞 Known Issues

* The **Task** dropdown in the employee Daily Update form can appear empty for some projects, even when the employee has a task assigned in that project.
* Daily Updates are limited to one per project per day.

## 🗺️ Roadmap

* Link daily updates more tightly to assigned tasks
* Add automated tests for the task assignment and daily update flows
* Notifications for new task assignments and reported blockers

## 🎯 What This Project Demonstrates

WorkSphere demonstrates practical full-stack development across:

**System Architecture → Database Design → REST APIs → Authentication → Authorization → CRUD → Role-Based Workflows → File Handling → Frontend Integration → Docker → Cloud Deployment**

The project was built to simulate an internal business application, going beyond a basic CRUD demonstration.

## 👤 Author

**Abhishek Kumar**

Full-Stack Developer

[GitHub](https://github.com/Abhishek-105)

---

<p align="center">Built with ❤️ using Next.js, TypeScript, Laravel & PostgreSQL</p>
