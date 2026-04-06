# ExpenseSplitter

A web app that automatically calculates who owes whom after shared expenses among friends, roommates, or travel groups.

## Demo

![ExpenseSplitter Screenshot](docs/screenshot1.png)
![Debt Calculation Screenshot](docs/screenshot2.png)

## Product Context

### End Users
University students, roommates, and friend groups who share living expenses, groceries, utilities, or travel costs.

### Problem
Tracking shared expenses and settling debts manually is tedious and error-prone. Friends often avoid discussing money to prevent awkward conversations, leading to unresolved debts and damaged relationships.

### Solution
ExpenseSplitter lets users create expense groups, log who paid for what, and instantly see a clear breakdown of who owes whom — eliminating manual calculations and awkward money conversations.

## Features

### Implemented (Version 1)
- ✅ Create expense groups
- ✅ Add members to groups
- ✅ Log expenses with custom splits
- ✅ Automatic debt calculation (who owes whom)
- ✅ Clean, responsive web UI
- ✅ Docker deployment

### Not Yet Implemented (Version 2)
- 🔄 LLM-powered expense entry (natural language parsing)
- 🔄 Export reports (PDF/CSV)
- 🔄 Expense history filtering
- 🔄 Mobile app

## Usage

1. Open the app in your browser
2. Create a new group (e.g., "Apartment 42")
3. Add members (e.g., "Alice", "Bob", "Charlie")
4. Add expenses:
   - Enter description (e.g., "Groceries")
   - Enter amount
   - Select who paid
   - Choose who splits the cost
5. Click "Who Owes Whom" tab to see debt settlement plan

## Deployment

### Requirements
- **OS:** Ubuntu 24.04 (or any Linux with Docker support)
- **Installed:** Docker and Docker Compose

### Step-by-Step Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/se-toolkit-hackathon.git
   cd se-toolkit-hackathon
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Access the application:**
   - Frontend: http://YOUR_VM_IP
   - Backend API: http://YOUR_VM_IP/api
   - API Docs: http://YOUR_VM_IP/api/docs

4. **Stop the application:**
   ```bash
   docker-compose down
   ```

### Architecture
- **Frontend:** React + Bootstrap (served via Nginx)
- **Backend:** Python + FastAPI
- **Database:** PostgreSQL 16
