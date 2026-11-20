import { AvisoErro, Protecao } from "@/components/Protecao";
import { Sidebar } from "@/components/Sidebar";
import { DadosProvider } from "@/lib/dados";

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Protecao>
      <DadosProvider>
        <Sidebar />
        <div className="lg:pl-60">
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <AvisoErro />
            {children}
          </main>
        </div>
      </DadosProvider>
    </Protecao>
  );
}
