import { Outlet } from 'react-router-dom';
import MainNav from './MainNav';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav />
      <main className="container mx-auto py-6 px-4">
        <Outlet />
      </main>
    </div>
  );
}