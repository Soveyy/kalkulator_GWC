import React, { useState, useEffect, useMemo } from 'react';
import { MapPin, Calculator, Info, Thermometer, Wind, Zap, DollarSign, Activity, BarChart2, BookOpen } from 'lucide-react';
import { symulacja_rok, GRUNTY, DNRury } from './lib/simulator';
import embeddedTmyData from './data/tmy_12375.json';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MethodologyModal } from './components/MethodologyModal';

export default function App() {
  const [tmyData, setTmyData] = useState<any[] | null>(null);
  const [tmyMetadata, setTmyMetadata] = useState<any | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMonthlyStats, setShowMonthlyStats] = useState(false);
  const [activeTab, setActiveTab] = useState<'podsumowanie' | 'wykresy' | 'statystyki'>('podsumowanie');
  const [statsView, setStatsView] = useState<'godziny' | 'energia' | 'finanse'>('godziny');
  const [chartMonth, setChartMonth] = useState<number | 'all'>('all');
  const [selectedYear, setSelectedYear] = useState<number>(3);
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [showPing, setShowPing] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowPing(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (embeddedTmyData) {
      if (embeddedTmyData.Dane_Godzinowe && Array.isArray(embeddedTmyData.Dane_Godzinowe)) {
        setTmyData(embeddedTmyData.Dane_Godzinowe);
        setTmyMetadata(embeddedTmyData.Metadane);
      } else if (Array.isArray(embeddedTmyData)) {
        setTmyData(embeddedTmyData);
      }
    }
  }, []);

  const [params, setParams] = useState({
    v_nom: 250,
    t_wewn_zima: 20.0,
    t_wewn_lato: 24.0,
    z_gwc: 2.0,
    n_rur: 5,
    d_rury: 160 as DNRury,
    l_rury: 25.0,
    typ_gruntu: 'srednia_glina' as keyof typeof GRUNTY,
    typ_reku: 'przeciwpradowy',
    sprawnosc_reku: 85,
    scop_ogrzewania: 3.5,
    cena_pradu: 1.15,
    koszt_inwestycji: 10000,
    includeCooling: false,
    seer: 6.2,
  });

  const runSimulation = () => {
    if (!tmyData) {
      setError('Najpierw wgraj plik z danymi klimatycznymi (TMY).');
      return;
    }

    // Check for empty or NaN values
    const hasInvalidParams = Object.values(params).some(v => v === '' || (typeof v === 'number' && isNaN(v)));
    if (hasInvalidParams) {
      setError('Proszę wypełnić wszystkie parametry poprawnymi wartościami liczbowymi.');
      return;
    }

    setIsSimulating(true);
    setError(null);

    // Run simulation in a timeout to allow UI to update
    setTimeout(() => {
      try {
        const res = symulacja_rok(
          tmyData,
          params.v_nom as number,
          params.t_wewn_zima as number,
          params.t_wewn_lato as number,
          params.z_gwc as number,
          params.typ_gruntu as any,
          params.typ_reku as any,
          (params.sprawnosc_reku as number) / 100,
          params.scop_ogrzewania as number,
          params.cena_pradu as number,
          params.koszt_inwestycji as number,
          params.n_rur as number,
          params.d_rury as DNRury,
          params.l_rury as number
        );
        setResults(res);
      } catch (err: any) {
        setError('Błąd podczas symulacji: ' + err.message);
      } finally {
        setIsSimulating(false);
      }
    }, 100);
  };

  const handleParamChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: any = value;
    
    if (type === 'number') {
      parsedValue = value === '' ? '' : parseFloat(value);
    } else if (name === 'd_rury') {
      parsedValue = parseInt(value, 10) as DNRury;
    }

    setParams((prev) => ({
      ...prev,
      [name]: parsedValue,
    }));
  };

  const chartData = useMemo(() => {
    if (!results || !results[3] || !results[3].Wykres) return [];
    if (chartMonth === 'all') return results[3].Wykres;
    return results[3].Wykres.filter((d: any) => d.miesiac === chartMonth);
  }, [results, chartMonth]);

  const monthTicks = [1, 745, 1417, 2161, 2881, 3625, 4345, 5089, 5833, 6553, 7297, 8017];
  const monthNames = ['sty.', 'lut.', 'mar.', 'kwi.', 'maj', 'cze.', 'lip.', 'sie.', 'wrz.', 'paź.', 'lis.', 'gru.'];

  const formatXAxis = (tickItem: any) => {
    if (chartMonth === 'all') {
      const monthIndex = monthTicks.indexOf(tickItem);
      if (monthIndex !== -1) return monthNames[monthIndex];
      return '';
    } else {
      const item = results?.[3]?.Wykres?.[tickItem - 1];
      if (item && item.godzina % 24 === 0) {
        const daysInMonths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let dayOfYear = Math.floor(item.dzien_roku);
        let m = 0;
        while (dayOfYear > daysInMonths[m] && m < 12) {
          dayOfYear -= daysInMonths[m];
          m++;
        }
        return dayOfYear.toString();
      }
      return '';
    }
  };

  const currentResults = results ? results[selectedYear] : null;

  const financialData = useMemo(() => {
    if (!currentResults) return [];
    return currentResults.Miesieczne_Statystyki.map((stat: any) => ({
      ...stat,
      oszczednosc_ogrzewanie_pln: (stat.oszczednosc_ogrzewanie_kwh / (params.scop_ogrzewania || 1)) * (params.cena_pradu || 0),
      oszczednosc_grzalka_pln: stat.oszczednosc_grzalka_kwh * (params.cena_pradu || 0),
      oszczednosc_chlodzenie_pln: params.includeCooling && params.seer ? (stat.dostarczony_chlod_kwh / params.seer) * (params.cena_pradu || 0) : 0,
    }));
  }, [currentResults, params.scop_ogrzewania, params.cena_pradu, params.includeCooling, params.seer]);

  const coolingSavings = useMemo(() => {
    if (!currentResults || !params.includeCooling || !params.seer) return 0;
    return (currentResults.Lato.Dostarczony_Chlod_kWh / params.seer) * params.cena_pradu;
  }, [currentResults, params.includeCooling, params.seer, params.cena_pradu]);

  const totalSavings = useMemo(() => {
    if (!currentResults) return 0;
    return currentResults.Ekonomia.Calkowita_Roczna_Oszczednosc_PLN + coolingSavings;
  }, [currentResults, coolingSavings]);

  const roiYears = useMemo(() => {
    if (totalSavings <= 0) return Infinity;
    return params.koszt_inwestycji / totalSavings;
  }, [params.koszt_inwestycji, totalSavings]);

  const yAxisDomain = useMemo(() => {
    if (chartMonth === 'all') return [-20, 35];
    switch (chartMonth) {
      case 1: return [-20, 10];
      case 2: return [-20, 15];
      case 3: return [-15, 20];
      case 4: return [-5, 25];
      case 5: return [0, 30];
      case 6: return [5, 35];
      case 7: return [5, 35];
      case 8: return [5, 35];
      case 9: return [0, 30];
      case 10: return [-5, 25];
      case 11: return [-10, 20];
      case 12: return [-15, 15];
      default: return [-20, 35];
    }
  }, [chartMonth]);

  const yAxisTicks = useMemo(() => {
    const ticks = [];
    for (let i = yAxisDomain[0]; i <= yAxisDomain[1]; i += 5) {
      ticks.push(i);
    }
    return ticks;
  }, [yAxisDomain]);

  const handleLegendClick = (e: any) => {
    if (e && e.dataKey) {
      setHiddenLines(prev => ({
        ...prev,
        [e.dataKey]: !prev[e.dataKey]
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col lg:flex-row">
      {/* Sidebar Konfiguracji */}
      <div className="w-full lg:w-[400px] xl:w-[450px] bg-white border-r border-slate-200 flex flex-col h-screen shrink-0">
        <div className="p-6 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                <Calculator size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">Kalkulator GWC</h1>
                <p className="text-sm text-slate-500">Symulator opłacalności</p>
              </div>
            </div>
            <button
              onClick={() => setIsMethodologyOpen(true)}
              className="relative flex items-center justify-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors group"
              title="Metodologia obliczeń"
            >
              {showPing && (
                <span className="absolute inset-0 rounded-xl bg-indigo-400 opacity-20 animate-[ping_2s_ease-in-out_infinite]"></span>
              )}
              <BookOpen size={18} className="relative z-10" />
              <span className="relative z-10 text-sm font-medium">Metodologia</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-6">
            
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MapPin size={18} className="text-indigo-500" />
                Lokalizacja i Klimat
              </h2>
              <p className="text-sm text-slate-600">
                Wbudowane dane klimatyczne (TMY) dla stacji WMO 12375 - Warszawa Okęcie.
              </p>
              {error && <p className="text-red-500 text-sm">{error}</p>}

              {tmyMetadata && (
                <div className="pt-2">
                  <button
                    onClick={() => setShowMonthlyStats(!showMonthlyStats)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  >
                    <Info size={14} />
                    {showMonthlyStats ? 'Ukryj statystyki miesięczne' : 'Pokaż statystyki miesięczne'}
                  </button>
                  
                  {showMonthlyStats && tmyMetadata.Statystyki_Miesieczne && (
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Średnia roczna</div>
                          <div className="text-lg font-bold text-indigo-700">{tmyMetadata.Srednia_Roczna_T ?? '9.65'}°C</div>
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Amplituda roczna</div>
                          <div className="text-lg font-bold text-indigo-700">
                            {(() => {
                              const stats = Object.values(tmyMetadata.Statystyki_Miesieczne) as any[];
                              const temps = stats.map(s => s.T_srednia);
                              return (Math.max(...temps) - Math.min(...temps)).toFixed(2);
                            })()} K
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold">
                            <tr>
                              <th className="p-2">Miesiąc</th>
                              <th className="p-2">T śr. (°C)</th>
                              <th className="p-2">T min/max</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {Object.entries(tmyMetadata.Statystyki_Miesieczne).map(([month, stats]: [string, any]) => (
                              <tr key={month} className="hover:bg-slate-50/50">
                                <td className="p-2 font-medium">{month}</td>
                                <td className="p-2">{stats.T_srednia}</td>
                                <td className="p-2 text-slate-500">{stats.T_min} / {stats.T_max}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Activity size={20} className="text-indigo-500" />
                Parametry Symulacji
              </h2>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Przepływ nominalny (m³/h)</label>
                  <input type="number" name="v_nom" value={params.v_nom ?? ''} onChange={handleParamChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Liczba rur (układ Tiechelmana)</label>
                  <input type="number" name="n_rur" value={params.n_rur ?? ''} onChange={handleParamChange} min="1" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Średnica rury</label>
                  <select name="d_rury" value={params.d_rury} onChange={handleParamChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                    <option value={110}>DN 110</option>
                    <option value={160}>DN 160</option>
                    <option value={200}>DN 200</option>
                    <option value={250}>DN 250</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Długość pojedynczej rury (m)</label>
                  <input type="number" name="l_rury" value={params.l_rury ?? ''} onChange={handleParamChange} step="1" min="1" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temperatura wewnętrzna - Zima (°C)</label>
                  <input type="number" name="t_wewn_zima" value={params.t_wewn_zima ?? ''} onChange={handleParamChange} step="0.5" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temperatura wewnętrzna - Lato (°C)</label>
                  <input type="number" name="t_wewn_lato" value={params.t_wewn_lato ?? ''} onChange={handleParamChange} step="0.5" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Głębokość posadowienia GWC (m)</label>
                  <input type="number" name="z_gwc" value={params.z_gwc ?? ''} onChange={handleParamChange} step="0.1" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Typ gruntu</label>
                  <select name="typ_gruntu" value={params.typ_gruntu} onChange={handleParamChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                    <option value="wilgotna_glina">Wilgotna glina</option>
                    <option value="srednia_glina">Średnia glina</option>
                    <option value="suchy_piasek">Suchy piasek</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Typ rekuperatora</label>
                  <select name="typ_reku" value={params.typ_reku} onChange={handleParamChange} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                    <option value="przeciwpradowy">Przeciwprądowy</option>
                    <option value="obrotowy">Obrotowy</option>
                    <option value="entalpiczny">Entalpiczny (ERV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sprawność rekuperatora (%)</label>
                  <input type="number" name="sprawnosc_reku" value={params.sprawnosc_reku ?? ''} onChange={handleParamChange} step="1" min="0" max="100" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SCOP systemu grzewczego</label>
                  <input type="number" name="scop_ogrzewania" value={params.scop_ogrzewania ?? ''} onChange={handleParamChange} step="0.1" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cena prądu (PLN/kWh)</label>
                  <input type="number" name="cena_pradu" value={params.cena_pradu ?? ''} onChange={handleParamChange} step="0.01" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Koszt inwestycji w GWC (PLN)</label>
                  <input type="number" name="koszt_inwestycji" value={params.koszt_inwestycji ?? ''} onChange={handleParamChange} step="100" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>

              <button
                onClick={runSimulation}
                disabled={!tmyData || isSimulating}
                className="w-full mt-6 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                {isSimulating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Symulowanie...
                  </>
                ) : (
                  <>
                    <Calculator size={20} />
                    Uruchom Symulację
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Główny panel wyników */}
      <div className="flex-1 h-screen overflow-y-auto p-4 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {!currentResults ? (
              <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Info size={32} className="text-slate-400" />
                </div>
                <h3 className="text-xl font-medium text-slate-900 mb-2">Brak wyników</h3>
                <p className="text-slate-500 max-w-md">
                  Dostosuj parametry i uruchom symulację, aby zobaczyć wyniki opłacalności GWC.
                </p>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Zakładki */}
                <div className="flex space-x-2 border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab('podsumowanie')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'podsumowanie'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    Podsumowanie
                  </button>
                  <button
                    onClick={() => setActiveTab('wykresy')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'wykresy'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Activity size={16} />
                    Wykresy
                  </button>
                  <button
                    onClick={() => setActiveTab('statystyki')}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
                      activeTab === 'statystyki'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <BarChart2 size={16} />
                    Statystyki
                  </button>
                </div>

                {activeTab === 'podsumowanie' && (
                  <div className="space-y-6">
                    {/* Wybór roku */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-700">Wybierz rok symulacji</h2>
                        <p className="text-xs text-slate-500">Rok 3 reprezentuje ustabilizowaną temperaturę gruntu.</p>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
                        {[0, 1, 2, 3].map((year) => (
                          <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                              selectedYear === year
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {year === 3 ? 'Rok 3 (Ustabilizowany)' : `Rok ${year}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Ekonomia */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <DollarSign className="text-emerald-500" />
                        Podsumowanie Ekonomiczne
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                          <p className="text-sm text-emerald-700 font-medium mb-1">Roczna oszczędność całkowita</p>
                          <p className="text-3xl font-bold text-emerald-600">{totalSavings.toFixed(2)} PLN</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <p className="text-sm text-blue-700 font-medium mb-1">Zwrot z inwestycji (ROI)</p>
                          <p className="text-3xl font-bold text-blue-600">
                            {roiYears === Infinity ? 'Nigdy' : `${roiYears.toFixed(1)} lat`}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-600 font-medium mb-1">Oszczędność na ogrzewaniu</p>
                          <p className="text-xl font-bold text-slate-800">{currentResults.Ekonomia.Oszczednosc_Ogrzewanie_PLN} PLN</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-sm text-slate-600 font-medium mb-1">Oszczędność na grzałce wstępnej</p>
                          <p className="text-xl font-bold text-slate-800">{currentResults.Ekonomia.Oszczednosc_Grzalka_PLN} PLN</p>
                        </div>
                        {params.includeCooling && (
                          <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100 md:col-span-2">
                            <p className="text-sm text-cyan-700 font-medium mb-1">Oszczędność na chłodzeniu</p>
                            <p className="text-xl font-bold text-cyan-800">{coolingSavings.toFixed(2)} PLN</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Zima */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Thermometer className="text-orange-500" />
                          Okres Zimowy (Grzanie)
                        </h2>
                        <ul className="space-y-3">
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Zaoszczędzone ciepło</span>
                            <span className="font-semibold">{currentResults.Zima.Zaoszczedzone_Cieplo_kWh} kWh</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Zaoszczędzona energia grzałki</span>
                            <span className="font-semibold">{currentResults.Zima.Zaoszczedzona_Grzalka_kWh} kWh</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Zmniejszenie projektowej straty ciepła</span>
                            <span className="font-semibold">{currentResults.Zima.Szczytowa_Moc_Grzewcza_Oszczednosc_W} W</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Śr. temp. zewn. (gdy GWC grzało)</span>
                            <span className="font-semibold">{currentResults.Zima.Srednia_T_Zewn_Gdy_GWC_Grzalo}°C</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Śr. temp. po GWC (gdy GWC grzało)</span>
                            <span className="font-semibold">{currentResults.Zima.Srednia_T_Po_GWC_Gdy_GWC_Grzalo}°C</span>
                          </li>
                          <li className="flex justify-between items-center py-2">
                            <span className="text-slate-600">Min. temperatura gruntu</span>
                            <span className="font-semibold">{currentResults.Zima.Min_Temperatura_Zloza}°C</span>
                          </li>
                        </ul>
                      </div>

                      {/* Lato */}
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                          <Wind className="text-cyan-500" />
                          Okres Letni (Chłodzenie)
                        </h2>
                        <ul className="space-y-3">
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Dostarczony chłód</span>
                            <span className="font-semibold">{currentResults.Lato.Dostarczony_Chlod_kWh} kWh</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Maks. moc chłodnicza (Maj)</span>
                            <span className="font-semibold">{currentResults.Lato.Maksymalna_Moc_Maj_kW} kW</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Maks. moc chłodnicza (Czerwiec)</span>
                            <span className="font-semibold">{currentResults.Lato.Maksymalna_Moc_Czerwiec_kW} kW</span>
                          </li>
                          <li className="flex justify-between items-center py-2 border-b border-slate-100">
                            <span className="text-slate-600">Maks. moc chłodnicza (Lipiec)</span>
                            <span className="font-semibold">{currentResults.Lato.Maksymalna_Moc_Lipiec_kW} kW</span>
                          </li>
                          <li className="flex justify-between items-center py-2">
                            <span className="text-slate-600">Maks. moc chłodnicza (Sierpień)</span>
                            <span className="font-semibold">{currentResults.Lato.Maksymalna_Moc_Sierpien_kW} kW</span>
                          </li>
                        </ul>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <label className="flex items-center gap-2 cursor-pointer mb-3">
                            <input
                              type="checkbox"
                              name="includeCooling"
                              checked={params.includeCooling}
                              onChange={(e) => setParams({ ...params, includeCooling: e.target.checked })}
                              className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500"
                            />
                            <span className="text-sm font-medium text-slate-700">Uwzględnij chłodzenie w kalkulacji opłacalności</span>
                          </label>
                          {params.includeCooling && (
                            <div className="flex items-center justify-between bg-cyan-50 p-3 rounded-lg border border-cyan-100">
                              <span className="text-sm text-cyan-800 font-medium">SEER klimatyzatora:</span>
                              <input
                                type="number"
                                name="seer"
                                value={params.seer}
                                onChange={handleParamChange}
                                step="0.1"
                                min="1"
                                className="w-24 p-1.5 text-right border border-cyan-200 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Statystyki Czasu */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Zap className="text-amber-500" />
                        Statystyki Czasu Pracy
                      </h2>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-orange-50 rounded-xl">
                          <p className="text-2xl font-bold text-orange-600">{currentResults.Statystyki_Czasu.Godziny_Grzanie}</p>
                          <p className="text-sm text-orange-800 mt-1">Godzin grzania</p>
                        </div>
                        <div className="p-4 bg-cyan-50 rounded-xl">
                          <p className="text-2xl font-bold text-cyan-600">{currentResults.Statystyki_Czasu.Godziny_Chlodzenie}</p>
                          <p className="text-sm text-cyan-800 mt-1">Godzin chłodzenia</p>
                        </div>
                        <div className="p-4 bg-slate-100 rounded-xl">
                          <p className="text-2xl font-bold text-slate-600">{currentResults.Statystyki_Czasu.Godziny_Bypass}</p>
                          <p className="text-sm text-slate-700 mt-1">Godzin na bypassie</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'wykresy' && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart2 className="text-indigo-500" />
                        Przebieg Temperatur
                      </h2>
                      <select
                        value={chartMonth}
                        onChange={(e) => setChartMonth(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        className="p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                      >
                        <option value="all">Cały rok</option>
                        <option value={1}>Styczeń</option>
                        <option value={2}>Luty</option>
                        <option value={3}>Marzec</option>
                        <option value={4}>Kwiecień</option>
                        <option value={5}>Maj</option>
                        <option value={6}>Czerwiec</option>
                        <option value={7}>Lipiec</option>
                        <option value={8}>Sierpień</option>
                        <option value={9}>Wrzesień</option>
                        <option value={10}>Październik</option>
                        <option value={11}>Listopad</option>
                        <option value={12}>Grudzień</option>
                      </select>
                    </div>

                    <div className="h-[calc(100vh-240px)] min-h-[500px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={chartData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis 
                            dataKey="godzina" 
                            tickFormatter={formatXAxis}
                            ticks={chartMonth === 'all' ? monthTicks : undefined}
                            minTickGap={chartMonth === 'all' ? 0 : 30}
                            stroke="#94a3b8"
                            fontSize={12}
                          />
                          <YAxis 
                            domain={yAxisDomain}
                            ticks={yAxisTicks}
                            stroke="#94a3b8" 
                            fontSize={12}
                            tickFormatter={(val) => `${val}°C`}
                          />
                          <Tooltip 
                            formatter={(value: number, name: string) => {
                              const labels: Record<string, string> = {
                                t_zewn: 'T zewn.',
                                t_kusuda: 'T gruntu',
                                t_do_reku_aktywne: 'T za GWC',
                                t_do_reku_bypass: 'T (bypass)'
                              };
                              return [`${value}°C`, labels[name] || name];
                            }}
                            labelFormatter={(label, payload) => {
                              if (payload && payload.length > 0) {
                                const data = payload[0].payload;
                                return `Dzień: ${Math.floor(data.dzien_roku)}, Godzina: ${data.godzina % 24}:00`;
                              }
                              return label;
                            }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                          <Legend 
                            onClick={handleLegendClick}
                            wrapperStyle={{ cursor: 'pointer' }}
                            formatter={(value, entry: any) => {
                              const labels: Record<string, string> = {
                                t_zewn: 'T zewn.',
                                t_kusuda: 'T gruntu',
                                t_do_reku_aktywne: 'T za GWC',
                                t_do_reku_bypass: 'T (bypass)'
                              };
                              const isHidden = hiddenLines[entry.dataKey];
                              return (
                                <span className={`transition-colors ${isHidden ? 'text-slate-400 line-through' : 'text-slate-700 font-medium hover:text-indigo-600'}`}>
                                  {labels[value] || value}
                                </span>
                              );
                            }}
                          />
                          <Line hide={hiddenLines['t_zewn']} type="linear" dataKey="t_zewn" stroke="#94a3b8" dot={false} strokeWidth={1} name="t_zewn" />
                          <Line hide={hiddenLines['t_kusuda']} type="linear" dataKey="t_kusuda" stroke="#10b981" dot={false} strokeWidth={2} name="t_kusuda" />
                          <Line hide={hiddenLines['t_do_reku_aktywne']} type="linear" dataKey="t_do_reku_aktywne" stroke="#f59e0b" dot={false} strokeWidth={2} name="t_do_reku_aktywne" connectNulls={false} />
                          <Line hide={hiddenLines['t_do_reku_bypass']} type="linear" dataKey="t_do_reku_bypass" stroke="#ef4444" strokeOpacity={0.6} dot={false} strokeWidth={1.5} name="t_do_reku_bypass" connectNulls={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      Wykres przedstawia temperatury w poszczególnych godzinach dla roku 3 (ustabilizowanego). W przypadku wyłączenia GWC (bypass), linia zmienia kolor na czerwony. <strong>Kliknij element w legendzie, aby go ukryć lub pokazać.</strong>
                    </p>
                  </div>
                )}

                {activeTab === 'statystyki' && currentResults && (
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <BarChart2 className="text-indigo-500" />
                        Szczegółowe Statystyki Miesięczne
                      </h2>
                      <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
                        <button
                          onClick={() => setStatsView('godziny')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            statsView === 'godziny'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Godziny pracy
                        </button>
                        <button
                          onClick={() => setStatsView('energia')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            statsView === 'energia'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Energia
                        </button>
                        <button
                          onClick={() => setStatsView('finanse')}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            statsView === 'finanse'
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Finanse (PLN)
                        </button>
                      </div>
                    </div>

                    <div className="h-[500px] w-full mt-6">
                      <ResponsiveContainer width="100%" height="100%">
                        {statsView === 'godziny' ? (
                          <BarChart
                            data={currentResults.Miesieczne_Statystyki}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="miesiac" 
                              tickFormatter={(val) => ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'][val - 1]}
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              axisLine={{ stroke: '#cbd5e1' }}
                            />
                            <YAxis 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              axisLine={{ stroke: '#cbd5e1' }}
                              label={{ value: 'Godziny', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip 
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number, name: string) => {
                                const names: Record<string, string> = {
                                  godziny_grzanie: 'Grzanie',
                                  godziny_chlodzenie: 'Chłodzenie',
                                  godziny_bypass: 'Bypass (wyłączone)'
                                };
                                return [`${value} h`, names[name] || name];
                              }}
                              labelFormatter={(val) => `Miesiąc: ${['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'][val - 1]}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="godziny_grzanie" name="Grzanie" stackId="a" fill="#f59e0b" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="godziny_chlodzenie" name="Chłodzenie" stackId="a" fill="#0ea5e9" />
                            <Bar dataKey="godziny_bypass" name="Bypass (wyłączone)" stackId="a" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : statsView === 'energia' ? (
                          <BarChart
                            data={currentResults.Miesieczne_Statystyki}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="miesiac" 
                              tickFormatter={(val) => ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'][val - 1]}
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              axisLine={{ stroke: '#cbd5e1' }}
                            />
                            <YAxis 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              axisLine={{ stroke: '#cbd5e1' }}
                              label={{ value: 'Energia (kWh)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip 
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number, name: string) => {
                                const names: Record<string, string> = {
                                  oszczednosc_ogrzewanie_kwh: 'Zaoszczędzone ciepło',
                                  oszczednosc_grzalka_kwh: 'Zaoszczędzona praca grzałki',
                                  dostarczony_chlod_kwh: 'Dostarczony chłód'
                                };
                                return [`${value.toFixed(1)} kWh`, names[name] || name];
                              }}
                              labelFormatter={(val) => `Miesiąc: ${['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'][val - 1]}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="oszczednosc_ogrzewanie_kwh" name="Zaoszczędzone ciepło" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="oszczednosc_grzalka_kwh" name="Zaoszczędzona praca grzałki" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="dostarczony_chlod_kwh" name="Dostarczony chłód" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        ) : (
                          <BarChart
                            data={financialData}
                            margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="miesiac" 
                              tickFormatter={(val) => ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'][val - 1]}
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              axisLine={{ stroke: '#cbd5e1' }}
                            />
                            <YAxis 
                              tick={{ fill: '#64748b', fontSize: 12 }}
                              axisLine={{ stroke: '#cbd5e1' }}
                              label={{ value: 'Oszczędności (PLN)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }}
                            />
                            <Tooltip 
                              cursor={{ fill: '#f1f5f9' }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              formatter={(value: number, name: string) => {
                                const names: Record<string, string> = {
                                  oszczednosc_ogrzewanie_pln: 'Oszczędność (Ciepło)',
                                  oszczednosc_grzalka_pln: 'Oszczędność (Grzałka)',
                                  oszczednosc_chlodzenie_pln: 'Oszczędność (Chłodzenie)'
                                };
                                return [`${value.toFixed(2)} PLN`, names[name] || name];
                              }}
                              labelFormatter={(val) => `Miesiąc: ${['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'][val - 1]}`}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar dataKey="oszczednosc_ogrzewanie_pln" name="Oszczędność (Ciepło)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="oszczednosc_grzalka_pln" name="Oszczędność (Grzałka)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            {params.includeCooling && (
                              <Bar dataKey="oszczednosc_chlodzenie_pln" name="Oszczędność (Chłodzenie)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                            )}
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-slate-500 text-center mt-2">
                      {statsView === 'godziny' 
                        ? 'Wykres przedstawia sumaryczny czas pracy GWC w poszczególnych trybach dla każdego miesiąca. Całkowita liczba godzin w miesiącu to suma wszystkich trzech wartości.'
                        : statsView === 'energia'
                        ? 'Wykres przedstawia ilość zaoszczędzonej energii (cieplnej dla budynku, elektrycznej dla grzałki) oraz dostarczonego chłodu w poszczególnych miesiącach.'
                        : 'Wykres przedstawia oszczędności finansowe w poszczególnych miesiącach, uwzględniając cenę prądu oraz sprawność (SCOP/SEER) urządzeń.'}
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
      <MethodologyModal isOpen={isMethodologyOpen} onClose={() => setIsMethodologyOpen(false)} />
    </div>
  );
}

