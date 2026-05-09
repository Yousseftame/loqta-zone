/**
 * src/pages/Admin/Dashboard/Dashboard.tsx
 *
 * This is the root admin page (/).
 * It now simply renders the FinancePage, which contains all tabs
 * including the new "Analytics Dashboard" tab.
 */

import FinancePage from "../Finance/FinancePage";

export default function Dashboard() {
  return <FinancePage />;
}
