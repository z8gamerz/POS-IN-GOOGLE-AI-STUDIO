import { RouterProvider, usePathname } from '@/lib/router-shim';
import { AuthProvider } from '@/lib/contexts/auth-context';
import { ReceiptProvider } from '@/lib/context/receipt-context';
import { StoreProvider } from '@/lib/hooks/use-store';
import { ThemeProvider } from '@/lib/contexts/theme-context';

// Import Pages
import Home from '@/pages/page';
import Login from '@/pages/login/page';
import Signup from '@/pages/signup/page';
import Pos from '@/pages/pos/page';
import PosHistory from '@/pages/pos/history/page';
import EwalletHistory from '@/pages/pos/ewallet-history/page';
import Products from '@/pages/products/page';
import Expenses from '@/pages/expenses/page';
import Restocking from '@/pages/restocking/page';
import Utang from '@/pages/utang/page';
import Settings from '@/pages/settings/page';
import Reports from '@/pages/reports/page';
import ReportsDaily from '@/pages/reports/daily/page';
import ReportsSalesJournal from '@/pages/reports/sales-journal/page';
import AdminAuditTrail from '@/pages/admin/audit-trail/page';
import AdminUsers from '@/pages/admin/users/page';

function AppContent() {
  const pathname = usePathname();

  // Route matching logic
  switch (pathname) {
    case '/':
      return <Home />;
    case '/login':
      return <Login />;
    case '/signup':
      return <Signup />;
    case '/pos':
      return <Pos />;
    case '/pos/history':
      return <PosHistory />;
    case '/pos/ewallet-history':
      return <EwalletHistory />;
    case '/products':
      return <Products />;
    case '/expenses':
      return <Expenses />;
    case '/restocking':
      return <Restocking />;
    case '/utang':
      return <Utang />;
    case '/settings':
      return <Settings />;
    case '/reports':
      return <Reports />;
    case '/reports/daily':
      return <ReportsDaily />;
    case '/reports/sales-journal':
      return <ReportsSalesJournal />;
    case '/admin/audit-trail':
      return <AdminAuditTrail />;
    case '/admin/users':
      return <AdminUsers />;
    default:
      return <Home />; // Fallback to Home page
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <StoreProvider>
          <AuthProvider>
            <ReceiptProvider>
              <AppContent />
            </ReceiptProvider>
          </AuthProvider>
        </StoreProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
