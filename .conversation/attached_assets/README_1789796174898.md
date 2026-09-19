# Grand Crown Platform

Grand Crown is a Node.js platform with a customer site and a mobile-responsive administrator panel.

## Local URLs
- Customer: http://localhost:3000/
- Admin: http://localhost:3000/admin

## Admin login
Default local credentials:
- Username: `admin`
- Password: `change-me-now`

For deployment, set `ADMIN_USER` and `ADMIN_PASS` environment variables and change the default credentials.

## Admin interface
The admin navigation follows the supplied Chipz/Doritos Admin reference layout: Dashboard, Analytics, Users, Deposits, Withdrawals, Products, Gift Codes, Messages, Transactions, Referrals, Settings, Countries, Admins and Activity Log. The dashboard uses a responsive two-column overview-card layout.

## Real-money manual payments
Grand Crown uses manual real-money mobile-money payments. Customers pay through the provided Airtel Money or MTN Mobile Money numbers, submit transaction details, and an administrator manually verifies and approves the payment. A submitted transaction is never treated as proof of payment by itself.

- Airtel Money: `0743240195` — Nakaliiba Martha
- MTN Mobile Money: `0764312328` — Nakaliiba Martha

## Withdrawal rules
- Minimum withdrawal: UGX 7,000
- Withdrawal fee: 12%
- At least one approved product purchase is required before withdrawal is allowed.
- Withdrawal requests remain pending until an administrator manually marks them paid or rejects them.

## Referral rules
- Every registered user receives a unique referral code.
- Three levels: 25% / 2% / 1%.
- Commissions are created only when the referred user's purchase is manually approved.
- Duplicate commission creation is prevented per purchase and level.

## Earnings
Approved purchases have independent earning schedules. The server credits one daily earning after each completed 24-hour period, up to the product validity period, and prevents duplicate daily credits.

## Support
- Customer support: `@Doritos1225`
- Telegram group: https://t.me/+zNDnaz_xKfdiMTlk

## Production notes
This package uses JSON storage for local/testing purposes. Before production real-money use, move to persistent database storage, use secure authentication/session storage, HTTPS, rate limiting, audit logging, backups, and appropriate payment/legal compliance.
