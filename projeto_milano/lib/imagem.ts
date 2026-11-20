/**
 * Reduz a foto para no máximo 1280px no maior lado e converte para WebP.
 * Uma foto de celular de ~4 MB costuma virar ~150–250 KB.
 */
export async function comprimirImagem(
  arquivo: File,
  tamanhoMax = 1280,
  qualidade = 0.8,
): Promise<string> {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await carregarImagem(url);
    const escala = Math.min(1, tamanhoMax / Math.max(img.width, img.height));
    const largura = Math.round(img.width * escala);
    const altura = Math.round(img.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível");
    ctx.drawImage(img, 0, 0, largura, altura);

    const webp = canvas.toDataURL("image/webp", qualidade);
    // Safari antigo não gera WebP e devolve PNG: nesse caso usa JPEG
    return webp.startsWith("data:image/webp")
      ? webp
      : canvas.toDataURL("image/jpeg", qualidade);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
    img.src = src;
  });
}

/** Tamanho aproximado de um data URL em KB */
export function tamanhoKB(src: string): number {
  const base64 = src.split(",")[1] ?? "";
  return Math.round((base64.length * 3) / 4 / 1024);
}
