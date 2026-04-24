# Payment Reconciliation Workflow

## Overview
Monitors unreconciled payments and alerts the finance team.

## Flow
```
Schedule (Every 6h) → Fetch Payments → Check Count → [Email + Slack + Sheets]
```

## Features
- **Scheduled** — Runs every 6 hours
- **Detection** — Fetches unreconciled payments from Restro
- **Alerts** — Email + Slack if any found
- **Logging** — Tracks reconciliation history

## Required API Endpoint
```
GET /api/payments/unreconciled
```

**Response:**
```json
{
  "count": 3,
  "payments": [
    { "orderNumber": "ORD-001", "amount": 500, "mode": "upi" },
    { "orderNumber": "ORD-002", "amount": 1200, "mode": "card" }
  ]
}
```

## Setup
1. Import workflow
2. Configure Restro API credentials
3. Configure Gmail & Slack
4. Add endpoint to Restro