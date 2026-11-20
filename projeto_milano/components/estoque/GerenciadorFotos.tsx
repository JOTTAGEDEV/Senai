"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bot, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { MAX_FOTOS, MAX_FOTOS_IA } from "@/lib/constants";
import { gerarId } from "@/lib/format";
import { comprimirImagem, tamanhoKB } from "@/lib/imagem";
import type { Foto } from "@/lib/types";

interface Props {
  fotos: Foto[];
  onChange: (fotos: Foto[]) => void;
}

export function GerenciadorFotos({ fotos, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [processando, setProcessando] = useState(0);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [soltarSobre, setSoltarSobre] = useState(false);
  const [aviso, setAviso] = useState("");

  const restantes = MAX_FOTOS - fotos.length;
  const totalIA = fotos.filter((f) => f.enviarIA).length;
  const totalKB = fotos.reduce((soma, f) => soma + tamanhoKB(f.src), 0);

  async function adicionarArquivos(lista: FileList | File[]) {
    setAviso("");
    const imagens = Array.from(lista).filter((f) => f.type.startsWith("image/"));
    if (imagens.length === 0) return;

    const aceitas = imagens.slice(0, restantes);
    if (imagens.length > restantes) {
      setAviso(`Limite de ${MAX_FOTOS} fotos: ${imagens.length - aceitas.length} foto(s) não foram adicionadas.`);
    }
    if (aceitas.length === 0) return;

    setProcessando(aceitas.length);
    const novas: Foto[] = [];
    let iaDisponivel = MAX_FOTOS_IA - totalIA;
    for (const arquivo of aceitas) {
      try {
        const src = await comprimirImagem(arquivo);
        // As primeiras fotos já entram marcadas para a IA enviar, até o limite
        novas.push({ id: gerarId(), src, enviarIA: iaDisponivel-- > 0 });
      } catch {
        setAviso(`Não foi possível ler "${arquivo.name}".`);
      }
      setProcessando((p) => p - 1);
    }
    onChange([...fotos, ...novas]);
  }

  function mover(de: number, para: number) {
    if (para < 0 || para >= fotos.length || de === para) return;
    const copia = [...fotos];
    const [item] = copia.splice(de, 1);
    copia.splice(para, 0, item);
    onChange(copia);
  }

  function alternarIA(id: string) {
    const foto = fotos.find((f) => f.id === id);
    if (!foto) return;
    if (!foto.enviarIA && totalIA >= MAX_FOTOS_IA) {
      setAviso(`A IA envia no máximo ${MAX_FOTOS_IA} fotos. Desmarque outra primeiro.`);
      return;
    }
    setAviso("");
    onChange(fotos.map((f) => (f.id === id ? { ...f, enviarIA: !f.enviarIA } : f)));
  }

  function remover(id: string) {
    onChange(fotos.filter((f) => f.id !== id));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-zinc-600">
          <span className="font-semibold text-zinc-900">{fotos.length}</span>/{MAX_FOTOS} fotos
          <span className="mx-2 text-zinc-300">·</span>
          <span className="font-semibold text-zinc-900">{totalIA}</span>/{MAX_FOTOS_IA} enviadas pela IA
          {fotos.length > 0 && (
            <>
              <span className="mx-2 text-zinc-300">·</span>~{(totalKB / 1024).toFixed(1)} MB
            </>
          )}
        </p>
        <p className="text-xs text-zinc-500">Arraste para reordenar. A primeira foto é a capa.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {fotos.map((foto, i) => (
          <div
            key={foto.id}
            draggable
            onDragStart={() => setArrastando(i)}
            onDragEnd={() => setArrastando(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (arrastando !== null) mover(arrastando, i);
              setArrastando(null);
            }}
            className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-lg border bg-zinc-100 active:cursor-grabbing ${
              arrastando === i ? "opacity-40" : ""
            } ${i === 0 ? "border-marca-500 ring-2 ring-marca-100" : "border-zinc-200"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" draggable={false} />

            <div className="absolute left-1.5 top-1.5 flex gap-1">
              {i === 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-marca-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  <Star className="h-3 w-3" /> Capa
                </span>
              )}
              {foto.enviarIA && (
                <span className="inline-flex items-center gap-1 rounded bg-zinc-900/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                  <Bot className="h-3 w-3" /> IA
                </span>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5 pt-6 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <div className="flex gap-1">
                <BotaoFoto rotulo="Mover para a esquerda" onClick={() => mover(i, i - 1)} desabilitado={i === 0}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </BotaoFoto>
                <BotaoFoto rotulo="Mover para a direita" onClick={() => mover(i, i + 1)} desabilitado={i === fotos.length - 1}>
                  <ArrowRight className="h-3.5 w-3.5" />
                </BotaoFoto>
              </div>
              <div className="flex gap-1">
                {i !== 0 && (
                  <BotaoFoto rotulo="Usar como capa" onClick={() => mover(i, 0)}>
                    <Star className="h-3.5 w-3.5" />
                  </BotaoFoto>
                )}
                <BotaoFoto
                  rotulo={foto.enviarIA ? "IA não envia esta foto" : "IA envia esta foto"}
                  onClick={() => alternarIA(foto.id)}
                  ativo={foto.enviarIA}
                >
                  <Bot className="h-3.5 w-3.5" />
                </BotaoFoto>
                <BotaoFoto rotulo="Remover foto" onClick={() => remover(foto.id)} perigo>
                  <Trash2 className="h-3.5 w-3.5" />
                </BotaoFoto>
              </div>
            </div>
          </div>
        ))}

        {Array.from({ length: processando }).map((_, i) => (
          <div key={`carregando-${i}`} className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ))}

        {restantes > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setSoltarSobre(true);
            }}
            onDragLeave={() => setSoltarSobre(false)}
            onDrop={(e) => {
              e.preventDefault();
              setSoltarSobre(false);
              if (e.dataTransfer.files.length) adicionarArquivos(e.dataTransfer.files);
            }}
            className={`flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed text-sm transition ${
              soltarSobre ? "border-marca-500 bg-marca-50 text-marca-700" : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            <ImagePlus className="h-6 w-6" />
            <span className="font-medium">Adicionar fotos</span>
            <span className="text-xs">ou arraste aqui</span>
          </button>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) adicionarArquivos(e.target.files);
          e.target.value = "";
        }}
      />

      {aviso && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{aviso}</p>}
      <p className="text-xs text-zinc-500">
        As fotos são reduzidas automaticamente (máx. 1280px, WebP) para economizar espaço. As marcadas com{" "}
        <Bot className="inline h-3 w-3" /> são enviadas pela IA no WhatsApp; as demais ficam no link do anúncio.
      </p>
    </div>
  );
}

function BotaoFoto({
  children,
  rotulo,
  onClick,
  desabilitado,
  ativo,
  perigo,
}: {
  children: React.ReactNode;
  rotulo: string;
  onClick: () => void;
  desabilitado?: boolean;
  ativo?: boolean;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      title={rotulo}
      aria-label={rotulo}
      onClick={onClick}
      disabled={desabilitado}
      className={`grid h-7 w-7 place-items-center rounded-md text-white transition disabled:opacity-30 ${
        ativo ? "bg-marca-600 hover:bg-marca-700" : perigo ? "bg-black/50 hover:bg-rose-600" : "bg-black/50 hover:bg-black/70"
      }`}
    >
      {children}
    </button>
  );
}
