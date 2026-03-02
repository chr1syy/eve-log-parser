import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import VersionFooter from "./VersionFooter";

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-void">
      {/* Fixed sidebar */}
      <Sidebar />

      {/* Main area offset by sidebar width */}
      <div className="flex flex-col flex-1 ml-[240px] min-w-0 h-screen">
        {/* Fixed topbar */}
        <Topbar title={title} />

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>

        {/* Footer */}
        <VersionFooter />
      </div>
    </div>
  );
}
