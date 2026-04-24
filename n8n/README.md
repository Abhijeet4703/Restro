# Restro n8n Automations

Collection of n8n workflows to automate restaurant operations with Restro.

## Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| [Inventory-Auto-Update](automations/Inventory-Auto-Update/) | Webhook | Reduces stock when orders placed, alerts on low stock |
| [Order-Notifications](automations/Order-Notifications/) | Webhook | Real-time Slack + email notifications for new orders |
| [Daily-Sales-Report](automations/Daily-Sales-Report/) | Schedule (daily) | Automated daily sales report via email + Sheets |
| [Customer-Feedback-Automation](automations/Customer-Feedback-Automation/) | Webhook | Alerts for negative feedback (< 3 stars) |
| [Payment-Reconciliation](automations/Payment-Reconciliation/) | Schedule (6h) | Alerts for unreconciled payments |

## Quick Start

1. **Install n8n** — [n8n.io](https://n8n.io) or self-hosted
2. **Import workflows** — Import each `workflow.json` into n8n
3. **Configure credentials** — Add API keys for:
   - Restro server (HTTP Header Auth)
   - Gmail (for emails)
   - Slack (for notifications)
   - Google Sheets (for data storage)
4. **Update endpoints** — Change `localhost:5000` to your Restro server URL
5. **Connect webhooks** — Add webhook calls in Restro order controller

## Environment Variables (Restro)

Add to `.env`:
```env
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

## Folder Structure

```
n8n/
└── automations/
    ├── Inventory-Auto-Update/
    ├── Order-Notifications/
    ├── Daily-Sales-Report/
    ├── Customer-Feedback-Automation/
    └── Payment-Reconciliation/
```

## More Ideas

- **Table Reservation** — Auto-confirm bookings
- **Supplier Orders** — Auto-order when stock critical
- **Staff Scheduling** — Shift management automation
- **Marketing** — Birthday discounts, loyalty rewards
- **Kitchen Display** — Send orders to kitchen displays