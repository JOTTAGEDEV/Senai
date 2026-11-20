import { Hammer } from "lucide-react";

export function EmBreve({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-zinc-900">{titulo}</h1>
      <div className="cartao p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-marca-50 text-marca-600">
            <Hammer className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium text-zinc-900">Tela em construção</p>
            <p className="mt-1 text-sm text-zinc-500">O que vai ter aqui:</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700">
              {itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
