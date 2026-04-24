# Customer Feedback Automation

## Overview
Processes customer feedback and alerts team for negative reviews.

## Flow
```
Feedback Webhook → Check Rating → [Slack + Email + Sheets] → Response
```

## Features
- **Rating check** — Triggers alerts for ratings < 3
- **Slack** — Immediate alert to team
- **Email** — Detailed report to manager
- **Logging** — All feedback saved to Google Sheets

## Webhook Payload
```json
{
  "orderNumber": "ORD-001",
  "rating": 2,
  "comment": "Food was cold",
  "customerName": "John Doe",
  "customerPhone": "+91 9876543210"
}
```

## Setup
1. Import workflow
2. Configure Slack & Gmail
3. Configure Google Sheets
4. Call webhook from Restro when feedback is submitted