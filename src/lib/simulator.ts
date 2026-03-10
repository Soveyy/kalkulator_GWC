export const P_ATM = 1013.25;
export const OMEGA_DAY = (2.0 * Math.PI) / 365.25;

export const GRUNTY = {
  wilgotna_glina: [1800.0, 1500.0, 1.5, 0.55],
  srednia_glina: [1700.0, 1300.0, 1.2, 0.45],
  suchy_piasek: [1600.0, 800.0, 0.35, 0.35],
} as const;

export const TYPOSZEREG_RUR = {
  110: { d_zew: 0.110, grubosc: 0.0055 },
  160: { d_zew: 0.160, grubosc: 0.0066 },
  200: { d_zew: 0.200, grubosc: 0.0077 },
  250: { d_zew: 0.250, grubosc: 0.0090 },
} as const;

export const LAMBDA_RURY = 0.50; // W/(m*K) - polietylen GEOHEAT
export type DNRury = keyof typeof TYPOSZEREG_RUR;

export const L_RURY_DEFAULT = 50.0;
export const D_RURY_DEFAULT = 160;
export const N_RUR_DEFAULT = 1;
export const HISTEREZA_CHLODZENIA_ON = 1.0;  // [st. C] aktywacja 
export const HISTEREZA_CHLODZENIA_OFF = 2.0; // [st. C] dezaktywacja
export const HISTEREZA_BYPASSU_ZIMA = 1.0; // [st. C]
export const HISTEREZA_AKTYWACJI_ZIMA = 1.0; // [st. C]

export function oblicz_rho(t_c: number) {
  return 353.0 / (t_c + 273.15);
}

export function oblicz_nu(t_c: number) {
  return (
    (1.458e-6 * Math.pow(t_c + 273.15, 1.5)) /
    (t_c + 273.15 + 110.4) /
    oblicz_rho(t_c)
  );
}

export function oblicz_k(t_c: number) {
  return 0.0242 + 7.3e-5 * t_c;
}

export function oblicz_cp(t_c: number) {
  return 1004.5 + 0.3 * t_c;
}

export function oblicz_cieplo_par(t_c: number) {
  return 2501.0 - 2.36 * t_c;
}

export function analizuj_klimat_z_tmy(dane_tmy: any[]) {
  let suma_temperatur = 0.0;
  const mies_temp: Record<number, number[]> = {};
  for (let i = 1; i <= 12; i++) {
    mies_temp[i] = [];
  }

  for (const dane of dane_tmy) {
    const t = dane.T || 0.0;
    const m = dane.Miesiac || 1;
    suma_temperatur += t;
    if (mies_temp[m]) {
      mies_temp[m].push(t);
    }
  }

  const t_mean = suma_temperatur / 8760.0;

  const srednie_miesieczne: Record<number, number> = {};
  for (let m = 1; m <= 12; m++) {
    const temperatury = mies_temp[m];
    if (temperatury && temperatury.length > 0) {
      const sum = temperatury.reduce((a, b) => a + b, 0);
      srednie_miesieczne[m] = sum / temperatury.length;
    } else {
      srednie_miesieczne[m] = t_mean;
    }
  }

  let najcieplejszy_miesiac = 1;
  let najzimniejszy_miesiac = 1;
  let max_temp = -Infinity;
  let min_temp = Infinity;

  for (let m = 1; m <= 12; m++) {
    if (srednie_miesieczne[m] > max_temp) {
      max_temp = srednie_miesieczne[m];
      najcieplejszy_miesiac = m;
    }
    if (srednie_miesieczne[m] < min_temp) {
      min_temp = srednie_miesieczne[m];
      najzimniejszy_miesiac = m;
    }
  }

  const t_max_srednia = srednie_miesieczne[najcieplejszy_miesiac];
  const t_min_srednia = srednie_miesieczne[najzimniejszy_miesiac];

  const t_amp = (t_max_srednia - t_min_srednia) / 2.0;

  const srodki_miesiecy: Record<number, number> = {
    1: 15, 2: 45, 3: 75, 4: 106, 5: 136, 6: 167,
    7: 197, 8: 228, 9: 259, 10: 289, 11: 320, 12: 350
  };
  const t_phase = srodki_miesiecy[najcieplejszy_miesiac] || 197;

  return { t_mean, t_amp, t_phase };
}

export function oblicz_t_kusuda(z: number, dzien_roku: number, d_kusuda: number, t_mean: number, t_amp: number, t_phase: number) {
  const faza = OMEGA_DAY * (dzien_roku - t_phase) - z / d_kusuda;
  return t_mean + t_amp * Math.exp(-z / d_kusuda) * Math.cos(faza);
}

export function x_abs(rh: number, t: number) {
  const p_sat = 6.112 * Math.exp((17.67 * t) / (t + 243.5));
  const p_v = (rh / 100.0) * p_sat;
  return (0.622 * p_v) / (P_ATM - p_v);
}

export function oblicz_t_gwc_out(
  t_zewn: number,
  rh_zewn: number,
  t_zloza: number,
  v_m3h: number,
  n_rur: number = N_RUR_DEFAULT,
  d_rury: DNRury = D_RURY_DEFAULT as DNRury,
  l_rury: number = L_RURY_DEFAULT
) {
  const rho_in = oblicz_rho(t_zewn);
  const nu_in = oblicz_nu(t_zewn);
  const k_in = oblicz_k(t_zewn);
  const cp_in = oblicz_cp(t_zewn);

  const rura = TYPOSZEREG_RUR[d_rury];
  if (!rura) throw new Error(`Nieznana średnica rury: ${d_rury}`);

  const d_zew_rzeczywiste = rura.d_zew;
  const d_wew_rzeczywiste = rura.d_zew - 2 * rura.grubosc;

  const m_dot_total = (v_m3h / 3600.0) * rho_in;
  const m_dot_per_pipe = m_dot_total / n_rur;
  const A_przekroj = Math.PI * Math.pow(d_wew_rzeczywiste / 2.0, 2);

  const x_in = x_abs(rh_zewn, t_zewn);

  function get_nu_liczba(re: number, pr: number) {
    if (re < 2300) return 3.66;
    if (re > 4000) {
      const f = Math.pow(0.79 * Math.log(re) - 1.64, -2);
      return ((f / 8.0) * (re - 1000) * pr) /
             (1.0 + 12.7 * Math.sqrt(f / 8.0) * (Math.pow(pr, 2 / 3) - 1.0));
    }
    const f_t = Math.pow(0.79 * Math.log(4000) - 1.64, -2);
    // Wzór Gnielińskiego używa członu (Re - 1000), więc dla Re=4000 mamy (4000 - 1000)
    const nu_turb = ((f_t / 8.0) * (4000 - 1000) * pr) /
                    (1.0 + 12.7 * Math.sqrt(f_t / 8.0) * (Math.pow(pr, 2 / 3) - 1.0));
    const blend = (re - 2300) / (4000 - 2300);
    return 3.66 + blend * (nu_turb - 3.66);
  }

  // --- Tryb zimowy (ogrzewanie powietrza) ---
  if (t_zloza > t_zewn) {
    const pr_in = (cp_in * rho_in * nu_in) / k_in;
    const re_in = (m_dot_per_pipe * d_wew_rzeczywiste) / (A_przekroj * rho_in * nu_in);
    
    const nu_liczba_in = get_nu_liczba(re_in, pr_in);
    const h_in = (nu_liczba_in * k_in) / d_wew_rzeczywiste;
    
    const R_pow_in = 1.0 / (h_in * Math.PI * d_wew_rzeczywiste * l_rury * n_rur);
    const R_rury = Math.log(d_zew_rzeczywiste / d_wew_rzeczywiste) / (2.0 * Math.PI * LAMBDA_RURY * l_rury * n_rur);
    const UA_in = 1.0 / (R_pow_in + R_rury);

    const ntu_in = UA_in / (m_dot_total * cp_in);
    const epsilon_in = 1.0 - Math.exp(-ntu_in);
    const t_out_wstepne = t_zewn + epsilon_in * (t_zloza - t_zewn);

    const t_srednia = (t_zewn + t_out_wstepne) / 2.0;
    const rho_sr = oblicz_rho(t_srednia);
    const nu_sr = oblicz_nu(t_srednia);
    const k_sr = oblicz_k(t_srednia);
    const cp_sr = oblicz_cp(t_srednia);

    const rho_out_wstepne = oblicz_rho(t_out_wstepne);
    const m_dot_total_sr = (v_m3h / 3600.0) * rho_out_wstepne;
    const m_dot_per_pipe_sr = m_dot_total_sr / n_rur;

    const pr_sr = (cp_sr * rho_sr * nu_sr) / k_sr;
    const re_sr = (m_dot_per_pipe_sr * d_wew_rzeczywiste) / (A_przekroj * rho_sr * nu_sr);

    const nu_liczba_sr = get_nu_liczba(re_sr, pr_sr);
    const h_sr = (nu_liczba_sr * k_sr) / d_wew_rzeczywiste;
    
    const R_pow_sr = 1.0 / (h_sr * Math.PI * d_wew_rzeczywiste * l_rury * n_rur);
    const UA_sr = 1.0 / (R_pow_sr + R_rury);

    const ntu_sr = UA_sr / (m_dot_total_sr * cp_sr);
    const epsilon_sr = 1.0 - Math.exp(-ntu_sr);
    const t_out = t_zewn + epsilon_sr * (t_zloza - t_zewn);

    return { t_out, x_out: x_in, q_kond_W: 0, m_dot_total: m_dot_total_sr, cp_srednie: cp_sr };
  }

  // --- Tryb letni (chłodzenie powietrza z możliwą kondensacją) ---
  const pr_in = (cp_in * rho_in * nu_in) / k_in;
  const re_in = (m_dot_per_pipe * d_wew_rzeczywiste) / (A_przekroj * rho_in * nu_in);
  const nu_liczba_in = get_nu_liczba(re_in, pr_in);
  const h_in = (nu_liczba_in * k_in) / d_wew_rzeczywiste;
  
  const R_pow_in = 1.0 / (h_in * Math.PI * d_wew_rzeczywiste * l_rury * n_rur);
  const R_rury = Math.log(d_zew_rzeczywiste / d_wew_rzeczywiste) / (2.0 * Math.PI * LAMBDA_RURY * l_rury * n_rur);
  const UA_in = 1.0 / (R_pow_in + R_rury);
  
  const ntu_in = UA_in / (m_dot_total * cp_in);
  const epsilon_in = 1.0 - Math.exp(-ntu_in);
  let t_out_guess = t_zewn + epsilon_in * (t_zloza - t_zewn);

  let c_p_eff = cp_in;
  let cp_suche = cp_in;
  let m_dot_total_sr = m_dot_total;
  let t_out = t_out_guess;

  for (let iter = 0; iter < 30; iter++) {
    const t_srednia = (t_zewn + t_out_guess) / 2.0;
    const rho_sr = oblicz_rho(t_srednia);
    const nu_sr = oblicz_nu(t_srednia);
    const k_sr = oblicz_k(t_srednia);
    cp_suche = oblicz_cp(t_srednia);

    const rho_out_guess = oblicz_rho(t_out_guess);
    m_dot_total_sr = (v_m3h / 3600.0) * rho_out_guess;
    const m_dot_per_pipe_sr = m_dot_total_sr / n_rur;

    const x_sat_out = x_abs(100, t_out_guess);
    if (x_in > x_sat_out && t_out_guess < t_zewn) {
      const dt = 0.01;
      const dx_sat_dT = (x_abs(100, t_out_guess + dt) - x_abs(100, t_out_guess - dt)) / (2 * dt);
      c_p_eff = cp_suche + (oblicz_cieplo_par(t_out_guess) * 1000.0) * Math.abs(dx_sat_dT);
    } else {
      c_p_eff = cp_suche;
    }

    const pr_sr = (c_p_eff * rho_sr * nu_sr) / k_sr;
    const re_sr = (m_dot_per_pipe_sr * d_wew_rzeczywiste) / (A_przekroj * rho_sr * nu_sr);

    const nu_liczba_sr = get_nu_liczba(re_sr, pr_sr);
    const h_sr = (nu_liczba_sr * k_sr) / d_wew_rzeczywiste;
    
    const R_pow_sr = 1.0 / (h_sr * Math.PI * d_wew_rzeczywiste * l_rury * n_rur);
    const UA_sr = 1.0 / (R_pow_sr + R_rury);

    const ntu_sr = UA_sr / (m_dot_total_sr * c_p_eff);
    const t_pred = t_zewn + (1.0 - Math.exp(-ntu_sr)) * (t_zloza - t_zewn);

    const t_out_nowe = 0.5 * t_out_guess + 0.5 * t_pred;

    if (Math.abs(t_out_nowe - t_out_guess) < 0.01) {
      t_out = t_out_nowe;
      break;
    }
    t_out_guess = t_out_nowe;
    t_out = t_out_nowe;
  }

  const x_out = Math.min(x_in, x_abs(100, t_out));
  const m_dot_wody = m_dot_total_sr * (x_in - x_out);
  const q_kond_W = m_dot_wody * (oblicz_cieplo_par(t_out) * 1000.0);

  return { t_out, x_out, q_kond_W, m_dot_total: m_dot_total_sr, cp_srednie: cp_suche };
}

export function oblicz_prog_szronienia(
  t_wewn: number,
  sprawnosc: number,
  typ_wymiennika: string
) {
  if (typ_wymiennika === "obrotowy") {
    return -99.0; // Próg nieistotny, brak grzałki
  }
  if (typ_wymiennika === "entalpiczny") {
    return -7.0;
  }
  return t_wewn * (1.0 - 1.0 / sprawnosc);
}

export function oblicz_t_nawiewu(
  t_wejscie: number,
  t_wewn: number,
  t_zewn: number,
  sprawnosc: number,
  t_aktywacja_chlodzenia: number
) {
  // Bypass tylko gdy jesteśmy w trybie chłodzenia (t_wewn = t_wewn_lato)
  // i powietrze nawiewane jest chłodniejsze niż wnętrze
  if (t_zewn >= t_aktywacja_chlodzenia && t_wejscie < t_wewn && t_wewn > t_aktywacja_chlodzenia) {
    return t_wejscie;
  }
  return t_wejscie + sprawnosc * (t_wewn - t_wejscie);
}

export function _jeden_rok(
  dane_tmy: any[],
  t_zloza_start: number,
  v_nom: number,
  t_wewn_zima: number,
  t_wewn_lato: number,
  z_gwc: number,
  d_kusuda: number,
  C_zloza: number,
  tau_reg: number,
  typ_reku: string,
  sprawnosc_reku: number,
  n_rur: number,
  d_rury: DNRury,
  l_rury: number,
  t_mean_lokalne: number,
  t_amp_lokalne: number,
  t_phase_lokalne: number,
  zapisz_wykres: boolean = false
) {
  let t_zloza = t_zloza_start;

  let energia_grzalki_baza_kwh = 0.0;
  let energia_grzalki_gwc_kwh = 0.0;
  let energia_dogrzewania_baza_kwh = 0.0;
  let energia_dogrzewania_gwc_kwh = 0.0;
  
  // Uwaga: chlod_*_kwh może być ujemne w strefie t_aktywacja_eff–t_wewn_lato (free-cooling poniżej progu letniego). 
  // Wartość diagnostyczna to końcowa różnica obu zmiennych: Dostarczony_Chlod_kWh.
  let chlod_baza_kwh = 0.0;
  let chlod_gwc_kwh = 0.0;

  let tryb_chlodzenia_aktywny = false;

  let godziny_grzanie = 0;
  let godziny_chlodzenie = 0;
  let godziny_bypass = 0;
  let suma_t_zewn_zima = 0.0;
  let suma_t_gwc_zima = 0.0;
  let min_t_zloza = 100.0;
  let max_moc_grzewcza_oszczednosc_W = 0.0;
  const szczyty_chlodnicze_kW: Record<number, number> = { 5: 0.0, 6: 0.0, 7: 0.0, 8: 0.0 };
  const dane_wykres: any[] = [];
  let prev_status: string | null = null;

  const wspolczynnik_relaksacji = 1.0 - Math.exp(-3600.0 / tau_reg);
  const t_frost = oblicz_prog_szronienia(t_wewn_zima, sprawnosc_reku, typ_reku);
  const t_frost_target = t_frost + 1.0; // Margines bezpieczeństwa

  for (let godzina = 1; godzina <= 8760; godzina++) {
    const dane_godziny = dane_tmy[godzina - 1] || {};
    const t_zewn = dane_godziny.T ?? 0.0;
    const rh_zewn = dane_godziny.RH ?? 50.0;
    const miesiac = dane_godziny.Miesiac ?? 1;
    const dzien_roku = godzina / 24.0;

    // Blokady kalendarzowe zapobiegające anomaliom z TMY
    const zablokuj_grzanie = miesiac >= 6 && miesiac <= 8; // Czerwiec, Lipiec, Sierpień
    const zablokuj_chlodzenie = [1, 2, 3, 4, 10, 11, 12].includes(miesiac); // Styczeń-Kwiecień, Październik-Grudzień

    // Dynamiczna histereza aktywacji grzania
    // W maju i wrześniu wymagamy aż 3 stopni różnicy, by uniknąć taktowana dla marginalnych zysków
    const histereza_zima_eff = (miesiac === 5 || miesiac === 9) ? 3.0 : HISTEREZA_AKTYWACJI_ZIMA;

    // Dynamiczna histereza aktywacji chłodzenia
    // W maju i wrześniu zwiększamy próg aktywacji chłodzenia do 2.0 stopni, by uniknąć chłodzenia przy umiarkowanych temperaturach
    const histereza_chlodzenia_on_eff = (miesiac === 5 || miesiac === 9) ? 2.0 : HISTEREZA_CHLODZENIA_ON;

    const tryb_grzewczy = t_zewn <= (t_wewn_zima + t_wewn_lato) / 2.0;
    const t_wewn_eff = tryb_grzewczy ? t_wewn_zima : t_wewn_lato;

    const t_kusuda = oblicz_t_kusuda(z_gwc, dzien_roku, d_kusuda, t_mean_lokalne, t_amp_lokalne, t_phase_lokalne);
    const cp_zewn = oblicz_cp(t_zewn);
    const m_dot_baza = (v_nom / 3600.0) * oblicz_rho(t_zewn);

    // Próg free-coolingu: zakładamy, że zyski słoneczne podnoszą
    // temperaturę w domu o ~4°C ponad temperaturę zewnętrzną.
    // Dla t_wewn_lato=24°C: bazowy próg to 20°C.
    const t_aktywacja_bazowa = t_wewn_lato - 4.0;

    // Niesymetryczna histereza chłodzenia budynku (+1°C ON, -2°C OFF)
    if (!zablokuj_chlodzenie) {
      if (tryb_chlodzenia_aktywny) {
        if (t_zewn < t_aktywacja_bazowa - HISTEREZA_CHLODZENIA_OFF) {
          tryb_chlodzenia_aktywny = false;
        }
      } else {
        if (t_zewn >= t_aktywacja_bazowa + histereza_chlodzenia_on_eff) {
          tryb_chlodzenia_aktywny = true;
        }
      }
    } else {
      tryb_chlodzenia_aktywny = false;
    }

    // Efektywny próg dla całej automatyki (GWC, rekuperator, bilans)
    const t_aktywacja_eff = tryb_chlodzenia_aktywny 
      ? (t_aktywacja_bazowa - HISTEREZA_CHLODZENIA_OFF) 
      : (t_aktywacja_bazowa + histereza_chlodzenia_on_eff);

    let gwc_pomaga_zima = false;
    if (!zablokuj_grzanie && t_zewn < t_wewn_zima) {
      if (prev_status === "AKTYWNE") {
        // System pracuje: wyłącz dopiero, gdy powietrze zewnętrzne będzie wyraźnie cieplejsze od złoża
        gwc_pomaga_zima = t_zloza > t_zewn - HISTEREZA_BYPASSU_ZIMA;
      } else {
        // System pauzuje: włącz dopiero, gdy złoże będzie wyraźnie cieplejsze od powietrza zewnętrznego
        gwc_pomaga_zima = t_zloza > t_zewn + histereza_zima_eff;
      }
    }
    const gwc_pomaga_lato = !zablokuj_chlodzenie && t_zewn >= t_aktywacja_eff && t_zloza < t_zewn - 1.0;
    const status_gwc = gwc_pomaga_zima || gwc_pomaga_lato ? "AKTYWNE" : "BYPASS";

    let t_do_reku = 0;
    let m_dot_gwc = 0;
    let cp_gwc = 0;

    if (status_gwc === "AKTYWNE") {
      const res = oblicz_t_gwc_out(t_zewn, rh_zewn, t_zloza, v_nom, n_rur, d_rury, l_rury);
      t_do_reku = res.t_out;
      m_dot_gwc = res.m_dot_total;
      cp_gwc = res.cp_srednie;

      const q_zloza_jawne_kw =
        (m_dot_gwc * cp_gwc * (t_zewn - t_do_reku)) / 1000.0;
      const q_kond_kw = res.q_kond_W / 1000.0;

      t_zloza += ((q_zloza_jawne_kw + q_kond_kw) * 3600.0 * 1000.0) / C_zloza;

      const moc_jawna_powietrza_kw =
        (m_dot_gwc * cp_gwc * (t_do_reku - t_zewn)) / 1000.0;

      if (t_do_reku > t_zewn) {
        godziny_grzanie += 1;
        suma_t_zewn_zima += t_zewn;
        suma_t_gwc_zima += t_do_reku;
      } else if (t_do_reku < t_zewn) {
        godziny_chlodzenie += 1;
      }
    } else {
      t_do_reku = t_zewn;
      m_dot_gwc = m_dot_baza;
      cp_gwc = cp_zewn;
      godziny_bypass += 1;
    }

    t_zloza += (t_kusuda - t_zloza) * wspolczynnik_relaksacji;
    if (t_zloza < min_t_zloza) min_t_zloza = t_zloza;

    // BAZA
    let t_wejscie_baza = t_zewn;
    let moc_grzalki_baza_W = 0;
    if (typ_reku !== "obrotowy" && t_wejscie_baza < t_frost_target) {
      moc_grzalki_baza_W = m_dot_baza * cp_zewn * (t_frost_target - t_wejscie_baza);
      energia_grzalki_baza_kwh += moc_grzalki_baza_W / 1000.0;
      t_wejscie_baza = t_frost_target;
    }

    const t_naw_baza = oblicz_t_nawiewu(
      t_wejscie_baza,
      t_wewn_eff,
      t_zewn,
      sprawnosc_reku,
      t_aktywacja_eff
    );
    
    let moc_dogrzewania_baza_W = 0;
    if (!tryb_chlodzenia_aktywny && !zablokuj_grzanie && t_zewn < t_wewn_zima) {
      moc_dogrzewania_baza_W = m_dot_baza * oblicz_cp(t_naw_baza) * (t_wewn_zima - t_naw_baza);
      energia_dogrzewania_baza_kwh += moc_dogrzewania_baza_W / 1000.0;
    } else if (!zablokuj_chlodzenie && t_zewn >= t_aktywacja_eff) {
      chlod_baza_kwh +=
        (m_dot_baza * oblicz_cp(t_naw_baza) * (t_naw_baza - t_wewn_lato)) / 1000.0;
    }

    // GWC
    let t_wejscie_gwc = t_do_reku;
    let moc_grzalki_gwc_W = 0;
    if (typ_reku !== "obrotowy" && t_wejscie_gwc < t_frost_target) {
      moc_grzalki_gwc_W = m_dot_gwc * cp_gwc * (t_frost_target - t_wejscie_gwc);
      energia_grzalki_gwc_kwh += moc_grzalki_gwc_W / 1000.0;
      t_wejscie_gwc = t_frost_target;
    }

    const t_naw_gwc = oblicz_t_nawiewu(
      t_wejscie_gwc,
      t_wewn_eff,
      t_zewn,
      sprawnosc_reku,
      t_aktywacja_eff
    );
    
    let moc_dogrzewania_gwc_W = 0;
    if (!tryb_chlodzenia_aktywny && !zablokuj_grzanie && t_zewn < t_wewn_zima) {
      moc_dogrzewania_gwc_W = m_dot_gwc * oblicz_cp(t_naw_gwc) * (t_wewn_zima - t_naw_gwc);
      energia_dogrzewania_gwc_kwh += moc_dogrzewania_gwc_W / 1000.0;
      
      // Zmniejszenie projektowej straty ciepła budynku (bez uwzględniania grzałki wstępnej)
      const oszczednosc_mocy_W = moc_dogrzewania_baza_W - moc_dogrzewania_gwc_W;
      
      if (oszczednosc_mocy_W > max_moc_grzewcza_oszczednosc_W) {
        max_moc_grzewcza_oszczednosc_W = oszczednosc_mocy_W;
      }
    } else if (!zablokuj_chlodzenie && t_zewn >= t_aktywacja_eff) {
      chlod_gwc_kwh +=
        (m_dot_gwc * oblicz_cp(t_naw_gwc) * (t_naw_gwc - t_wewn_lato)) / 1000.0;
    }

    if (status_gwc === "AKTYWNE" && t_naw_gwc < t_wewn_lato && t_zewn >= t_wewn_lato) {
      if (miesiac in szczyty_chlodnicze_kW) {
        const moc_uzyteczna_kW = (m_dot_gwc * oblicz_cp(t_naw_gwc) * (t_wewn_lato - t_naw_gwc)) / 1000.0;
        if (moc_uzyteczna_kW > szczyty_chlodnicze_kW[miesiac]) {
          szczyty_chlodnicze_kW[miesiac] = moc_uzyteczna_kW;
        }
      }
    }

    let t_aktywne: number | null = status_gwc === "AKTYWNE" ? t_do_reku : null;
    let t_bypass: number | null = status_gwc === "BYPASS" ? t_do_reku : null;

    prev_status = status_gwc;

    if (zapisz_wykres) {
      dane_wykres.push({
        godzina,
        miesiac,
        dzien_roku,
        t_zewn: Number(t_zewn.toFixed(2)),
        t_kusuda: Number(t_kusuda.toFixed(2)),
        t_do_reku_aktywne: t_aktywne !== null ? Number(t_aktywne.toFixed(2)) : null,
        t_do_reku_bypass: t_bypass !== null ? Number(t_bypass.toFixed(2)) : null,
      });
    }
  }

  const wyniki = {
    Statystyki_Czasu: {
      Godziny_Grzanie: godziny_grzanie,
      Godziny_Chlodzenie: godziny_chlodzenie,
      Godziny_Bypass: godziny_bypass,
    },
    Zima: {
      Zaoszczedzone_Cieplo_kWh:
        energia_dogrzewania_baza_kwh - energia_dogrzewania_gwc_kwh,
      Zaoszczedzona_Grzalka_kWh:
        energia_grzalki_baza_kwh - energia_grzalki_gwc_kwh,
      Szczytowa_Moc_Grzewcza_Oszczednosc_W: max_moc_grzewcza_oszczednosc_W,
      Srednia_T_Zewn_Gdy_GWC_Grzalo:
        godziny_grzanie > 0 ? suma_t_zewn_zima / godziny_grzanie : 0,
      Srednia_T_Po_GWC_Gdy_GWC_Grzalo:
        godziny_grzanie > 0 ? suma_t_gwc_zima / godziny_grzanie : 0,
      Min_Temperatura_Zloza: min_t_zloza,
    },
    Lato: {
      Dostarczony_Chlod_kWh: chlod_baza_kwh - chlod_gwc_kwh,
      Maksymalna_Moc_Maj_kW: szczyty_chlodnicze_kW[5],
      Maksymalna_Moc_Czerwiec_kW: szczyty_chlodnicze_kW[6],
      Maksymalna_Moc_Lipiec_kW: szczyty_chlodnicze_kW[7],
      Maksymalna_Moc_Sierpien_kW: szczyty_chlodnicze_kW[8],
    },
    Wykres: dane_wykres,
  };
  return { t_zloza, wyniki };
}

export function symulacja_rok(
  dane_tmy: any[],
  v_nom: number,
  t_wewn_zima: number,
  t_wewn_lato: number,
  z_gwc: number,
  typ_gruntu: keyof typeof GRUNTY,
  typ_reku: string,
  sprawnosc_reku: number,
  scop_ogrzewania: number,
  cena_pradu: number,
  koszt_inwestycji: number,
  n_rur: number = N_RUR_DEFAULT,
  d_rury: DNRury = D_RURY_DEFAULT as DNRury,
  l_rury: number = L_RURY_DEFAULT
) {
  const [rho_g, cp_g, lambda_g, r_akt] = GRUNTY[typ_gruntu];

  const { t_mean: t_mean_lokalne, t_amp: t_amp_lokalne, t_phase: t_phase_lokalne } = analizuj_klimat_z_tmy(dane_tmy);

  const rura = TYPOSZEREG_RUR[d_rury];
  if (!rura) throw new Error(`Nieznana średnica rury: ${d_rury}`);
  const d_zew_rzeczywiste = rura.d_zew;

  const C_zloza_1_rura =
    rho_g *
    cp_g *
    (Math.PI * (Math.pow(r_akt, 2) - Math.pow(d_zew_rzeczywiste / 2.0, 2)) * l_rury);

  const C_zloza = C_zloza_1_rura * n_rur;

  const tau_reg =
    C_zloza_1_rura *
    (Math.log(r_akt / (d_zew_rzeczywiste / 2.0)) / (2.0 * Math.PI * lambda_g * l_rury));

  const alpha_g_m2_s = lambda_g / (rho_g * cp_g);
  const alpha_g_m2_day = alpha_g_m2_s * 86400.0;
  const d_kusuda = Math.sqrt((2.0 * alpha_g_m2_day) / OMEGA_DAY);

  let t_zloza = oblicz_t_kusuda(z_gwc, 1.0, d_kusuda, t_mean_lokalne, t_amp_lokalne, t_phase_lokalne);
  const wyniki_lata = [];

  for (let i = 0; i < 4; i++) {
    const isLastYear = i === 3;
    const res = _jeden_rok(
      dane_tmy,
      t_zloza,
      v_nom,
      t_wewn_zima,
      t_wewn_lato,
      z_gwc,
      d_kusuda,
      C_zloza,
      tau_reg,
      typ_reku,
      sprawnosc_reku,
      n_rur,
      d_rury,
      l_rury,
      t_mean_lokalne,
      t_amp_lokalne,
      t_phase_lokalne,
      isLastYear
    );
    t_zloza = res.t_zloza;
    
    const wyniki = res.wyniki;
    const oszczednosc_pln_ogrzewanie =
      (wyniki.Zima.Zaoszczedzone_Cieplo_kWh / scop_ogrzewania) * cena_pradu;
    const oszczednosc_pln_grzalka =
      wyniki.Zima.Zaoszczedzona_Grzalka_kWh * cena_pradu;
    const calkowity_zysk_pln =
      oszczednosc_pln_ogrzewanie + oszczednosc_pln_grzalka;
    const roi_lata =
      calkowity_zysk_pln > 0 ? koszt_inwestycji / calkowity_zysk_pln : Infinity;

    wyniki_lata.push({
      ...wyniki,
      Zima: {
        Zaoszczedzone_Cieplo_kWh: Number(wyniki.Zima.Zaoszczedzone_Cieplo_kWh.toFixed(2)),
        Zaoszczedzona_Grzalka_kWh: Number(wyniki.Zima.Zaoszczedzona_Grzalka_kWh.toFixed(2)),
        Szczytowa_Moc_Grzewcza_Oszczednosc_W: Number(wyniki.Zima.Szczytowa_Moc_Grzewcza_Oszczednosc_W.toFixed(2)),
        Srednia_T_Zewn_Gdy_GWC_Grzalo: Number(wyniki.Zima.Srednia_T_Zewn_Gdy_GWC_Grzalo.toFixed(2)),
        Srednia_T_Po_GWC_Gdy_GWC_Grzalo: Number(wyniki.Zima.Srednia_T_Po_GWC_Gdy_GWC_Grzalo.toFixed(2)),
        Min_Temperatura_Zloza: Number(wyniki.Zima.Min_Temperatura_Zloza.toFixed(2)),
      },
      Lato: {
        Dostarczony_Chlod_kWh: Number(wyniki.Lato.Dostarczony_Chlod_kWh.toFixed(2)),
        Maksymalna_Moc_Maj_kW: Number(wyniki.Lato.Maksymalna_Moc_Maj_kW.toFixed(2)),
        Maksymalna_Moc_Czerwiec_kW: Number(wyniki.Lato.Maksymalna_Moc_Czerwiec_kW.toFixed(2)),
        Maksymalna_Moc_Lipiec_kW: Number(wyniki.Lato.Maksymalna_Moc_Lipiec_kW.toFixed(2)),
        Maksymalna_Moc_Sierpien_kW: Number(wyniki.Lato.Maksymalna_Moc_Sierpien_kW.toFixed(2)),
      },
      Ekonomia: {
        Oszczednosc_Ogrzewanie_PLN: Number(oszczednosc_pln_ogrzewanie.toFixed(2)),
        Oszczednosc_Grzalka_PLN: Number(oszczednosc_pln_grzalka.toFixed(2)),
        Calkowita_Roczna_Oszczednosc_PLN: Number(calkowity_zysk_pln.toFixed(2)),
        ROI_Lata: Number(roi_lata.toFixed(1)),
      },
      Kusuda_Parametry: {
        t_mean: Number(t_mean_lokalne.toFixed(2)),
        t_amp: Number(t_amp_lokalne.toFixed(2)),
        t_phase: Number(t_phase_lokalne.toFixed(0)),
      }
    });
  }

  return wyniki_lata;
}

