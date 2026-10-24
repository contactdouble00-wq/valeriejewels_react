# Valerie Jewels — Finance Manager User Guide

## Overview
The Finance Manager is built directly into the Valerie Jewels Atelier Admin Portal (`https://valeriejewels.in/vj-manage-x1126` or local `#vj-manage-x1126`), replacing legacy disjointed Excel spreadsheets with a unified, high-speed, multi-partner ledger system for **Yash, Dhruvik, and Jeel**.

---

## 1. Current Excel Backup & Download
- A clearly visible **"Download Current Excel Backup"** button is located in the top action bar of the Finance module and in the **Reports & Export** tab.
- **Instant Client-Side & Live Database Sync**: When clicked, the system queries the latest live database state (reflecting all recent additions, edits, and deletions) and compiles a multi-sheet `.xlsx` file.
- **Preserved Structure**:
  - **Sheet 1 ("Expense Manager")**:
    - **Yash**: Columns A–D (*Description, Amount ₹, Status, Date*)
    - **Dhruvik**: Columns G–J (*Description, Amount ₹, Status, Date*)
    - **Jeel**: Columns M–P (*Description, Amount ₹, Status, Date*)
    - **Working Live Formulas**: The bottom totals row contains genuine Excel formulas (`=SUM(B5:B...)`, `=SUM(H5:H...)`, `=SUM(N5:N...)`) rather than static text.
  - **Sheet 2 ("Marketing Budget")**:
    - Tracks campaigns with auto-calculated 20% marketing agency charges (`=C5*20%`), total cost (`=C5+D5`), and grand totals.
  - **Sheet 3 ("Settlements Summary")**:
    - Complete net equity positions and debt balances per partner.
- **Filename**: `Valerie_Jewels_Finance_Backup_YYYY-MM-DD.xlsx`.
- **Zero Page Refresh**: Download triggers immediately in the browser without reloading or navigating away.

---

## 2. Fast Data Entry (&lt;10 Seconds)
- The first row of every partner table is an always-visible **Quick-Add row**.
- **Keyboard Shortcuts**:
  - Type `Description` -> Type `Amount` -> Press **Enter**.
  - Automatically saves the row, updates live totals, clears the inputs, keeps focus on the description for the next entry, and displays a subtle success toast.
- **Auto-Category by Keyword**:
  - `shiprocket`, `courier` -> **Shiprocket**
  - `meta`, `ad`, `marketing`, `campaign` -> **Marketing**
  - `influencer`, `reel`, `creator` -> **Influencer**
  - `packaging`, `pouch`, `honeycomb`, `box` -> **Packaging**
  - `hostinger`, `domain`, `server` -> **Hosting**
  - `trademark`, `legal`, `ip` -> **Legal/Trademark**
  - `order` -> **Order Cost**
- **Inline Editing**: Click any description, amount, or date to edit inline; press Enter or click away to save.
- **Status Cycling**: Click any status badge (`PAID` -> `PENDING` -> `RECEIVED`) to toggle with a single click.
- **Bulk Excel Paste**: Click **"Paste From Excel"** to paste rows copied directly from Excel or Google Sheets (tab-separated: Description, Amount, Status, Date). Preview and confirm with 1 click.

---

## 3. Financial Logic & Calculations

| Metric | Calculation Formula | Notes |
| :--- | :--- | :--- |
| **Partner Total Expense** | $\sum \text{Amount}$ where `type = EXPENSE` and `status = PAID` | Soft-deleted entries excluded |
| **Partner Pending** | $\sum \text{Amount}$ where `status = PENDING` | Displayed separately; not added to paid expense |
| **Partner Net Position** | $(\text{Contributions} + \text{Reimbursements} + \text{Transfers In}) - (\text{Expenses} + \text{Transfers Out})$ | Positive = Creditor; Negative = Debtor |
| **Marketing Charge** | $\text{Budget Amount} \times 20\%$ | Auto-calculated live |
| **Marketing Total Cost** | $\text{Budget Amount} + \text{Marketing Charge}$ | Auto-calculated live |
| **Business Total Expense** | $\sum (\text{Yash} + \text{Dhruvik} + \text{Jeel Paid Expenses})$ | All partners combined |

---

## 4. Settlements & "Who Owes Whom"
- Located in the **Settlements & Equity** tab.
- Automatically calculates debt balances based on each partner's net position compared to an equal 1/3 (33.33%) fair share.
- Generates concrete instructions (e.g., *"Jeel pays Yash ₹15,562.84"*).
- Includes a 1-click **"Record Settlement"** button that atomically creates paired `TRANSFER_OUT` and `TRANSFER_IN` entries in a database transaction.

---

## 5. Security & Soft Delete Undo
- **Access Control**: Restricted to authenticated administrators and staff via JWT.
- **Soft Delete**: When an entry is deleted, it is flagged with `deleted_at` rather than permanently destroyed.
- **8-Second Undo**: A floating banner appears offering an instant **"UNDO"** button to restore the entry with a single click.
- **Audit Trail**: Every creation, update, deletion, and restoration is logged in `finance_audit_log` with timestamp, user ID, IP address, and before/after values.
