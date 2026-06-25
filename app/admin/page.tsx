import AdminDashboard from "@/components/AdminDashboard";

// Always render dynamically — this page is gated by middleware and shows live data.
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminDashboard />;
}
