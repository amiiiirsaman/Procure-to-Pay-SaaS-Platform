import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar />
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
