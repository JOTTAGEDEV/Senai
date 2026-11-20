import type { ConfigIA } from "./tipos.ts";

/** Fuso da loja. O Brasil não tem horário de verão desde 2019, então São Paulo é sempre UTC-3. */
export const FUSO = "America/Sao_Paulo";
export const OFFSET = "-03:00";

export interface Momento {
  diaSemana: number; // 0 = domingo
  minutos: number; // minutos desde 00:00
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
}

const DIAS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function momentoLocal(d = new Date()): Momento {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const hora = `${partes.hour}:${partes.minute}`;
  return {
    diaSemana: DIAS.indexOf(partes.weekday),
    minutos: Number(partes.hour) * 60 + Number(partes.minute),
    data: `${partes.year}-${partes.month}-${partes.day}`,
    hora,
  };
}

const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function lojaAberta(config: ConfigIA, d = new Date()): boolean {
  const m = momentoLocal(d);
  const dia = config.horarios?.[m.diaSemana];
  if (!dia?.aberto) return false;
  return m.minutos >= paraMinutos(dia.abre) && m.minutos < paraMinutos(dia.fecha);
}

/** Mesma regra do painel (lib/crm.ts → iaDeveAtender). */
export function iaDeveAtender(config: ConfigIA, d = new Date()): boolean {
  if (!config || config.modo === "desligado") return false;
  if (config.modo === "sempre") return true;
  return !lojaAberta(config, d);
}

/** Converte data e hora locais da loja para ISO (UTC). */
export function paraISO(data: string, hora: string): string {
  return new Date(`${data}T${hora}:00${OFFSET}`).toISOString();
}

/**
 * Horários livres para visita num dia: de hora em hora, dentro do expediente,
 * no futuro, e com no máximo `capacidade` visitas no mesmo horário.
 */
export function horariosLivres(
  config: ConfigIA,
  data: string,
  ocupados: string[], // ISO de início das visitas já marcadas
  capacidade: number,
  agora = new Date(),
): string[] {
  const diaSemana = new Date(`${data}T12:00:00${OFFSET}`).getUTCDay();
  const dia = config.horarios?.[diaSemana];
  if (!dia?.aberto) return [];
  const livres: string[] = [];
  for (let min = paraMinutos(dia.abre); min + 60 <= paraMinutos(dia.fecha); min += 60) {
    const hora = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    const iso = paraISO(data, hora);
    if (new Date(iso).getTime() <= agora.getTime() + 60 * 60_000) continue; // pelo menos 1h de antecedência
    const noHorario = ocupados.filter((o) => new Date(o).getTime() === new Date(iso).getTime()).length;
    if (noHorario < Math.max(1, capacidade)) livres.push(hora);
  }
  return livres;
}
