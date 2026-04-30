import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import BottomNav from "./BottomNav";

export default function AppLayout({ title, children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="px-4 py-5 md:px-6 md:py-7 lg:px-8 lg:py-8 max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>

    </div>
  );
}
