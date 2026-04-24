# Daily Sales Report Workflow

## Overview
Generates and sends daily sales reports automatically.

## Flow
```
Schedule (Daily) → Fetch Sales → Format → [Email + Sheets]
```

## Features
- **Scheduled** — Runs automatically every 24 hours
- **Metrics** — Revenue, order count, average order value
- **Top Items** — Best selling products
- **Email** — Sends to owner
- **Sheets** — Archives data in Google Sheets

## Setup
1. Import workflow.json
2. Configure Restro API credentials
3. Configure Gmail for reports
4. Configure Google Sheets for data storage
5. Add endpoint `/api/orders/daily-summary` to Restro