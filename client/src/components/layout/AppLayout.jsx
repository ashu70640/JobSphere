import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

/**
 * AppLayout — wraps every authenticated page.
 * Provides fixed sidebar + topbar + scrollable main content.
 *
 * Usage:
 *   <AppLayout title="Dashboard">
 *     {page content}
 *   </AppLayout>
 */
export default function AppLayout({ title, children }) {
  return (
    <div className="flex h-screen overflow-hidden
                    bg-gray-50 dark:bg-gray-900
                    transition-colors duration-200">

      {/* Fixed sidebar */}
      <Sidebar />

      {/* Right column: topbar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar title={title} />

        <main className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 lg:px-8 lg:py-8 max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
