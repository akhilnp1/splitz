# Split-It — Expense Tracker

A full-stack expense splitting app built with Django REST Framework + Next.js.

Split shared expenses with friends, track who owes what, and settle debts easily.

---

## Tech Stack

- **Backend**: Python, Django, Django REST Framework, JWT Auth
- **Frontend**: Next.js 14, TanStack Query, Tailwind CSS
- **Database**: SQLite (dev)

---

## How to Run

### Backend (Django)

**Step 1 — Go to backend folder:**
```bash
cd backend
```

**Step 2 — Create virtual environment:**
```bash
python -m venv venv
```

**Step 3 — Activate it:**
```bash
# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

**Step 4 — Install dependencies:**
```bash
pip install -r requirements.txt
```

**Step 5 — Create .env file:**
```bash
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

**Step 6 — Run migrations:**
```bash
python manage.py makemigrations
python manage.py migrate
```

**Step 7 — Create admin user:**
```bash
python manage.py createsuperuser
```

**Step 8 — Start server:**
```bash
python manage.py runserver
```

Backend runs at: http://localhost:8000

---

### Frontend (Next.js)

**Step 1 — Go to frontend folder:**
```bash
cd frontend
```

**Step 2 — Install dependencies:**
```bash
npm install
```

**Step 3 — Create .env.local file:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

**Step 4 — Start the app:**
```bash
npm run dev
```

Frontend runs at: http://localhost:3000

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register/ | Register new user |
| POST | /api/auth/login/ | Login, get JWT tokens |
| POST | /api/auth/logout/ | Logout, blacklist token |
| GET | /api/auth/profile/ | Get current user profile |
| GET | /api/groups/ | List all your groups |
| POST | /api/groups/ | Create a new group |
| GET | /api/groups/:id/ | Get group details |
| POST | /api/groups/:id/add-member/ | Add member by email |
| GET | /api/groups/:id/balances/ | Get net balance per member |
| GET | /api/groups/:id/settlements/ | Get minimum payments to settle |
| GET | /api/groups/:id/expenses/ | List group expenses |
| POST | /api/groups/:id/expenses/ | Add new expense |
| DELETE | /api/expenses/:id/ | Delete an expense |
| POST | /api/groups/:id/repayments/ | Record a payment |
| GET | /api/groups/:id/repayments/ | List all repayments |

---

## API Documentation

Import `Split-It.postman_collection.json` into Postman to test all endpoints.

---

## Features

- JWT Authentication with auto token refresh
- Create groups and add members by email
- Add expenses with Equal, Exact, or Percentage splits
- Handles edge case: payer not part of the split
- Net balance summary per member
- Greedy algorithm to calculate minimum settlements
- Record payments to clear debts
- Real-time UI updates with TanStack Query