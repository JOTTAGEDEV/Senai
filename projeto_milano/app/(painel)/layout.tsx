import { Sidebar } from "@/components/Sidebar";
import { EstoqueProvider } from "@/lib/estoque-store";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <EstoqueProvider>
      <Sidebar />
      <div className="lg:pl-60">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </EstoqueProvider>
  );
}
