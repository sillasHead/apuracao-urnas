export const REGIONS = {
  norte: {
    name: "Norte",
    short: "N",
    states: ["AC", "AP", "AM", "PA", "RO", "RR", "TO"],
  },
  nordeste: {
    name: "Nordeste",
    short: "NE",
    states: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  },
  "centro-oeste": {
    name: "Centro-Oeste",
    short: "CO",
    states: ["DF", "GO", "MT", "MS"],
  },
  sudeste: {
    name: "Sudeste",
    short: "SE",
    states: ["ES", "MG", "RJ", "SP"],
  },
  sul: {
    name: "Sul",
    short: "S",
    states: ["PR", "RS", "SC"],
  },
} as const;

export type RegionKey = keyof typeof REGIONS;

export const STATE_NAMES: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};

export const UFS = Object.keys(STATE_NAMES);
