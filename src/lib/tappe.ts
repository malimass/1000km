export interface Tappa {
  giorno: number;
  da: string;
  a: string;
  km: number;
  data: string;
}

export const tappe: Tappa[] = [
  { giorno: 1,  da: "Bologna",           a: "Faenza",                  km: 55,  data: "18 aprile" },
  { giorno: 2,  da: "Faenza",            a: "Rimini",                  km: 70,  data: "19 aprile" },
  { giorno: 3,  da: "Rimini",            a: "Ancona",                  km: 90,  data: "20 aprile" },
  { giorno: 4,  da: "Ancona",            a: "Porto San Giorgio",       km: 65,  data: "21 aprile" },
  { giorno: 5,  da: "Porto San Giorgio", a: "Pescara",                 km: 85,  data: "22 aprile" },
  { giorno: 6,  da: "Pescara",           a: "Vasto",                   km: 75,  data: "23 aprile" },
  { giorno: 7,  da: "Vasto",             a: "Campobasso",              km: 90,  data: "24 aprile" },
  { giorno: 8,  da: "Campobasso",        a: "Avellino",                km: 90,  data: "25 aprile" },
  { giorno: 9,  da: "Avellino",          a: "Sala Consilina",          km: 70,  data: "26 aprile" },
  { giorno: 10, da: "Sala Consilina",    a: "Scalea",                  km: 85,  data: "27 aprile" },
  { giorno: 11, da: "Scalea",            a: "Paola",                   km: 55,  data: "28 aprile" },
  { giorno: 12, da: "Paola",             a: "Pizzo Calabro",           km: 65,  data: "29 aprile" },
  { giorno: 13, da: "Pizzo Calabro",     a: "Rosarno",                 km: 65,  data: "30 aprile" },
  { giorno: 14, da: "Rosarno",           a: "Terranova Sappo Minulio", km: 40,  data: "1 maggio"  },
];
