import type { SatelliteRecord, SatellitePosition } from '../types';

/**
 * "Lixo" = objetos SpaceX sem função em órbita: estágios superiores abandonados
 * (FALCON 9/HEAVY R/B), fragmentos (… DEB) e metades de carenagem.
 *
 * Massa e volume são estimativas — o catálogo público não informa massa por objeto.
 */
export const JUNK_ASSUMPTIONS = {
  'rocket-body': { massKg: 4000, volumeM3: 148, costUsd: 12_000_000, label: 'Estágio superior Falcon (≈4 t, cilindro de 3,7 × 13,8 m, ≈US$ 12 mi)' },
  fairing: { massKg: 950, volumeM3: 140, costUsd: 3_000_000, label: 'Metade de carenagem (≈950 kg)' },
  debris: { massKg: 50, volumeM3: 0.1, costUsd: 0, label: 'Fragmento (≈50 kg, estimativa conservadora)' },
} as const;

type JunkCategory = keyof typeof JUNK_ASSUMPTIONS;

export function isJunk(sat: SatelliteRecord): sat is SatelliteRecord & { spaceXCategory: JunkCategory } {
  return sat.spaceXCategory === 'rocket-body' || sat.spaceXCategory === 'debris' || sat.spaceXCategory === 'fairing';
}

export interface JunkSummary {
  count: number;
  stages: number;
  fragments: number;
  massKg: number;
  volumeM3: number;
  costUsd: number;
  oldestYear: number | null;
  highestKm: number | null;
  avgSpeedKms: number | null;
}

export function summarizeJunk(sats: SatelliteRecord[], positions: Map<number, SatellitePosition>): JunkSummary {
  const s: JunkSummary = { count: 0, stages: 0, fragments: 0, massKg: 0, volumeM3: 0, costUsd: 0, oldestYear: null, highestKm: null, avgSpeedKms: null };
  let speedSum = 0;
  let speedN = 0;

  for (const sat of sats) {
    if (!isJunk(sat)) continue;
    const a = JUNK_ASSUMPTIONS[sat.spaceXCategory];
    s.count++;
    if (sat.spaceXCategory === 'debris') s.fragments++;
    else s.stages++;
    s.massKg += a.massKg;
    s.volumeM3 += a.volumeM3;
    s.costUsd += a.costUsd;

    const year = parseInt(sat.objectId.slice(0, 4), 10);
    if (year > 1950 && (s.oldestYear === null || year < s.oldestYear)) s.oldestYear = year;

    const pos = positions.get(sat.noradCatId);
    if (pos) {
      if (s.highestKm === null || pos.altitudeKm > s.highestKm) s.highestKm = pos.altitudeKm;
      speedSum += pos.velocityKms;
      speedN++;
    }
  }
  if (speedN) s.avgSpeedKms = speedSum / speedN;
  return s;
}

// ---------- Unidades de medida nacionais (aproximadas, com orgulho) ----------

const FIAT_MAREA_KG = 1300;
const UNO_MILLE_KG = 810;
const BORBA_GATO_KG = 20_000;
const CRISTO_REDENTOR_KG = 635_000;
const KOMBI_KG = 1200;
const FUSCA_KG = 790;
const CAPIVARA_KG = 50;
const BOTIJAO_CHEIO_KG = 28;
const PAO_FRANCES_KG = 0.05;
const CAIXA_DAGUA_M3 = 1;
const COPO_AMERICANO_M3 = 0.00019;
const CASA_EUA_USD = 300_000;
const BRL_POR_USD = 5.4;
const MCMV_BRL = 200_000;
const MAREA_OLX_BRL = 15_000;
const SP_MANAUS_KM = 2690;
const UNO_VELOCIDADE_MAX_KMH = 140;

const fmt = (n: number, digits = 0) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const big = (n: number) => {
  if (n >= 1e9) return `${fmt(n / 1e9, 1)} bilhões`;
  if (n >= 1e6) return `${fmt(n / 1e6, 1)} milhões`;
  if (n >= 10_000) return `${fmt(n / 1000, 0)} mil`;
  return fmt(n);
};

export interface JunkFact {
  id: string;
  text: string;
}

/** Comparações absurdamente brasileiras, recalculadas a partir do catálogo ao vivo */
export function buildJunkFacts(s: JunkSummary): JunkFact[] {
  if (s.count === 0) return [];
  const m = s.massKg;
  const v = s.volumeM3;
  const brl = s.costUsd * BRL_POR_USD;
  const facts: JunkFact[] = [
    { id: 'marea', text: `Esse lixo pesa o mesmo que ${big(m / FIAT_MAREA_KG)} Fiat Marea. E lá em cima nenhum deles abre o bico da junta do cabeçote.` },
    { id: 'uno', text: `Dá ${big(m / UNO_MILLE_KG)} Uno Mille em peso. Com escada no teto, claro.` },
    { id: 'borba', text: `É o equivalente a ${fmt(m / BORBA_GATO_KG, 1)} estátuas do Borba Gato flutuando sobre a sua cabeça.` },
    {
      id: 'cristo',
      text:
        m < CRISTO_REDENTOR_KG
          ? `Pesa ${fmt((m / CRISTO_REDENTOR_KG) * 100)}% de um Cristo Redentor. Falta pouco pra SpaceX ter um em órbita.`
          : `Pesa ${fmt(m / CRISTO_REDENTOR_KG, 1)} Cristos Redentores. De braços abertos sobre a ionosfera.`,
    },
    { id: 'kombi', text: `São ${big(m / KOMBI_KG)} Kombis de peso. Motor atrás, como Deus quis.` },
    { id: 'fusca', text: `Daria ${big(m / FUSCA_KG)} Fuscas. Imagina a quantidade de soco no jogo do Fusca azul.` },
    { id: 'capivara', text: `Equivale a ${big(m / CAPIVARA_KG)} capivaras adultas em órbita. Em peso, calma.` },
    { id: 'botijao', text: `Ou ${big(m / BOTIJAO_CHEIO_KG)} botijões de gás cheios. Com o preço do gás, o lixo vale mais lá em cima.` },
    { id: 'pao', text: `Dá pra fazer ${big(m / PAO_FRANCES_KG)} pãezinhos franceses com esse peso. Pede na chapa.` },
    { id: 'caixa', text: `O volume encheria ${big(v / CAIXA_DAGUA_M3)} caixas d'água de 1.000 litros.` },
    { id: 'copo', text: `Ou ${big(v / COPO_AMERICANO_M3)} copos americanos. De café passado no coador de pano.` },
    { id: 'casa', text: `Fabricar esses estágios custou uns US$ ${big(s.costUsd)}: daria pra comprar ${big(s.costUsd / CASA_EUA_USD)} casas simples nos Estados Unidos.` },
    { id: 'mcmv', text: `Em reais, uns R$ ${big(brl)}. Ou ${big(brl / MCMV_BRL)} apartamentos do Minha Casa Minha Vida.` },
    { id: 'olx', text: `Ou ${big(brl / MAREA_OLX_BRL)} Fiat Marea usados na OLX, sem garantia e com o famoso "só ligar e andar".` },
  ];

  if (s.highestKm !== null) {
    facts.push({
      id: 'altura',
      text: `O pedaço mais alto está agora a ${fmt(s.highestKm)} km da Terra: ${fmt(s.highestKm / SP_MANAUS_KM, 1)} vezes a distância São Paulo–Manaus.`,
    });
  }
  if (s.avgSpeedKms !== null) {
    const kmh = s.avgSpeedKms * 3600;
    facts.push({
      id: 'velocidade',
      text: `Em média cada pedaço viaja a ${fmt(kmh)} km/h, ${fmt(kmh / UNO_VELOCIDADE_MAX_KMH)} vezes um Uno Mille no talo, na descida da serra.`,
    });
  }
  if (s.oldestYear !== null) {
    facts.push({
      id: 'antigo',
      text: `O lixo SpaceX mais antigo ainda em órbita é de ${s.oldestYear}. Está lá desde antes de você trocar de celular ${Math.max(2, Math.round((new Date().getFullYear() - s.oldestYear) / 2.5))} vezes.`,
    });
  }
  return facts;
}
