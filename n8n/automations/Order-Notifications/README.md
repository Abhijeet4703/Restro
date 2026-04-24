# Order Notifications Workflow

## Overview
Sends real-time notifications when new orders are placed.

## Flow
```
Order Webhook → Check Type → [Slack + Email] → Response
```

## Features
- **Slack** — Instant notification to team channel
- **Email** — Kitchen gets detailed order for preparation
- **Delivery detection** — Special handling for delivery orders

## Setup
1. Import workflow.json into n8n
2. Configure Slack credentials
3. Configure Gmail for kitchen notifications
4. Add webhook URL to Restro order controller