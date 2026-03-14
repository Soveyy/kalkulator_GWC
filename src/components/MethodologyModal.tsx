import React from 'react';
import { X, BookOpen, Thermometer, Droplets, Wind, Settings, Database, Activity, RefreshCw } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface MethodologyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyModal: React.FC<MethodologyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800">Metodologia Obliczeń GWC</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 text-slate-600">
          
          {/* Sekcja 1: TMY */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 mb-2">
              <Database className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">1. Przygotowanie Danych Klimatycznych (TMY)</h3>
            </div>
            <p className="leading-relaxed">
              Dane klimatyczne (TMY - Typowy Rok Meteorologiczny) wygenerowano w oparciu o metodę <strong>Sandia National Laboratories</strong>, poddając analizie historyczne pomiary godzinowe z lat 2000–2024.
            </p>
            <p className="leading-relaxed">
              Selekcja reprezentatywnych miesięcy bazuje na statystyce <strong>Finkelsteina-Schafera (FS)</strong>, minimalizując różnice między dystrybuantami empirycznymi (ECDF) krótkoterminowymi a wieloletnimi dla temperatury i wilgotności. Algorytm <strong>wybiera miesiące o rozkładzie statystycznym najbliższym rozkładowi wieloletniemu</strong>, tworząc syntetyczny rok, który precyzyjnie odzwierciedla uśredniony profil klimatyczny badanej lokalizacji.
            </p>
            <p className="leading-relaxed">
              Proces selekcji jest dwuetapowy. Najpierw wyłania się 5 najbardziej reprezentatywnych miesięcy (najniższe FS). Ostateczny wybór oparto na bliskości mediany wieloletniej dla 5 kryteriów z wagami 0.2: <InlineMath math="T_{mean}" />, <InlineMath math="T_{max}" />, <InlineMath math="T_{min}" />, <InlineMath math="RH_{mean}" />, <InlineMath math="RH_{max}" />. Braki danych (luki &lt; 24h) uzupełniono interpolacją liniową.
            </p>
          </section>

          {/* Sekcja 2: Model Gruntu */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <Thermometer className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">2. Model Temperatury Gruntu (Kusuda-Achenbach)</h3>
            </div>
            <p className="leading-relaxed">
              Temperatura gruntu na zadanej głębokości obliczana jest w oparciu o analityczny model Kusudy-Achenbacha, uwzględniający tłumienie amplitudy i przesunięcie fazowe fali cieplnej wnikającej w głąb ziemi.
            </p>
            <div className="bg-slate-50 p-4 rounded-xl overflow-x-auto border border-slate-100">
              <BlockMath math="T(z, t) = T_{mean} - T_{amp} \cdot e^{-z \cdot \sqrt{\frac{\pi}{365 \cdot \alpha}}} \cdot \cos\left(\frac{2\pi}{365} \cdot (t - t_{shift}) - z \cdot \sqrt{\frac{\pi}{365 \cdot \alpha}}\right)" />
            </div>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li><InlineMath math="z" /> - głębokość posadowienia GWC [m]</li>
              <li><InlineMath math="t" /> - dzień roku (1-365)</li>
              <li><InlineMath math="\alpha" /> - dyfuzyjność cieplna gruntu [m²/dzień]</li>
              <li><InlineMath math="T_{mean}" /> - średnia roczna temperatura powietrza (wyliczana z TMY)</li>
              <li><InlineMath math="T_{amp}" /> - amplituda roczna temperatury (wyliczana z TMY)</li>
              <li><InlineMath math="t_{shift}" /> - przesunięcie fazowe [dni] (wyliczane dynamicznie jako środek najcieplejszego miesiąca w TMY)</li>
            </ul>
          </section>

          {/* Sekcja 3: Parametry Powietrza */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sky-600 mb-2">
              <Wind className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">3. Dynamiczne Parametry Powietrza</h3>
            </div>
            <p className="leading-relaxed">
              Właściwości fizyczne powietrza są przeliczane dynamicznie dla każdej godziny w zależności od jego aktualnej temperatury (T [°C]):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Gęstość (<InlineMath math="\rho" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Model gazu idealnego</p>
                <div className="text-indigo-600"><BlockMath math="\rho = \frac{353}{T + 273.15} \text{ [kg/m}^3\text{]}" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Ciepło właściwe (<InlineMath math="c_p" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Aproksymacja liniowa ASHRAE</p>
                <div className="text-indigo-600"><BlockMath math="c_p = 1004.5 + 0.3 \cdot T \text{ [J/(kg}\cdot\text{K)]}" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Lepkość dynamiczna (<InlineMath math="\mu" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Prawo Sutherlanda</p>
                <div className="text-indigo-600 overflow-x-auto text-sm"><BlockMath math="\mu = \frac{1.458 \cdot 10^{-6} \cdot (T+273.15)^{1.5}}{T+273.15+110.4} \text{ [Pa}\cdot\text{s]}" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Przewodność (<InlineMath math="k" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Korelacja temperaturowa</p>
                <div className="text-indigo-600"><BlockMath math="k = 0.0242 + 7.3 \cdot 10^{-5} \cdot T \text{ [W/(m}\cdot\text{K)]}" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Liczba Prandtla (<InlineMath math="Pr" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Definicja bezwymiarowa</p>
                <div className="text-indigo-600"><BlockMath math="Pr = \frac{c_p \cdot \mu}{k}" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Lepkość kinematyczna (<InlineMath math="\nu" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Relacja lepkości i gęstości</p>
                <div className="text-indigo-600"><BlockMath math="\nu = \frac{\mu}{\rho} \text{ [m}^2\text{/s]}" /></div>
              </div>
            </div>
          </section>

          {/* Sekcja 4: Wymiana Ciepła */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500 mb-2">
              <Settings className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">4. Wymiana Ciepła (Metoda NTU)</h3>
            </div>
            <p className="leading-relaxed">
              Wymiana ciepła między powietrzem a gruntem modelowana jest z wykorzystaniem metody <strong>NTU (Number of Transfer Units - Liczba jednostek przenikania ciepła)</strong> oraz korelacji empirycznych dla przepływu w rurach. NTU jest bezwymiarowym parametrem określającym zdolność wymiennika do wymiany ciepła.
            </p>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <strong>1. Liczba Reynoldsa (<InlineMath math="Re" />):</strong> Określa charakter przepływu (laminarny vs turbulentny).<br/>
                <div className="text-indigo-600"><BlockMath math="Re = \frac{4 \cdot \dot{m}}{\pi \cdot D \cdot \mu}" /></div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <strong>2. Liczba Nusselta (<InlineMath math="Nu" />):</strong><br/>
                Dla <InlineMath math="Re < 2300" /> (laminarny): <div className="text-indigo-600"><BlockMath math="Nu = 3.66" /></div>
                Dla <InlineMath math="Re \in [2300, 4000]" /> (strefa przejściowa): stosowana jest interpolacja liniowa między modelem laminarnym a turbulentnym.<br/>
                Dla <InlineMath math="Re > 4000" /> (korelacja Gnielińskiego):<br/>
                <div className="text-indigo-600 overflow-x-auto"><BlockMath math="Nu = \frac{\frac{f}{8} \cdot (Re - 1000) \cdot Pr}{1 + 12.7 \cdot \sqrt{\frac{f}{8}} \cdot (Pr^{2/3} - 1)}" /></div>
                Gdzie współczynnik tarcia <div className="text-indigo-600"><BlockMath math="f = (0.79 \cdot \ln(Re) - 1.64)^{-2}" /></div>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <strong>3. Skuteczność (<InlineMath math="\varepsilon" />) i Temperatura Wyjściowa:</strong><br/>
                <div className="text-indigo-600"><BlockMath math="NTU = \frac{U \cdot A}{\dot{m} \cdot c_p}" /></div>
                <div className="text-indigo-600"><BlockMath math="\varepsilon = 1 - e^{-NTU}" /></div>
                <div className="text-indigo-600"><BlockMath math="T_{out} = T_{in} + \varepsilon \cdot (T_{gruntu} - T_{in})" /></div>
                
                <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500 grid grid-cols-2 gap-x-4">
                  <div><InlineMath math="NTU" /> - Liczba jednostek przenikania</div>
                  <div><InlineMath math="U" /> - Współczynnik przenikania ciepła</div>
                  <div><InlineMath math="A" /> - Powierzchnia wymiany ciepła</div>
                  <div><InlineMath math="\dot{m}" /> - Masowe natężenie przepływu</div>
                  <div><InlineMath math="\varepsilon" /> - Skuteczność wymiennika</div>
                  <div><InlineMath math="T_{out}" /> - Temperatura powietrza po GWC</div>
                </div>
              </div>
            </div>
            <p className="leading-relaxed mt-4">
              Model uwzględnia całkowity opór cieplny wymiennika, w tym opór przewodzenia samej ścianki rury. Przyjęto parametry specjalistycznych rur systemu GEOHEAT (polietylen o podwyższonej przewodności <InlineMath math="\lambda = 0.50" /> W/mK). Zgodnie z danymi producenta systemu, grubości ścianek są inne dla każdej średnicy zewnętrznej (np. 5.5 mm dla DN110, 6.6 mm dla DN160). Ma to bezpośredni wpływ na całkowity współczynnik przenikania ciepła, precyzyjniej oddając spadek wydajności termicznej w rurach o dużych średnicach.
            </p>
          </section>

          {/* Sekcja 5: Kondensacja */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Droplets className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">5. Wykroplenie Wilgoci (Kondensacja)</h3>
            </div>
            <p className="leading-relaxed">
              Latem, gdy gorące i wilgotne powietrze trafia do chłodnej rury, następuje wykroplenie wody. Program oblicza ciśnienie pary nasyconej (wzór Magnusa-Tetensa) i temperaturę punktu rosy. Jeśli temperatura ścianki rury jest niższa niż punkt rosy, obliczana jest masa wykroplonej wody oraz <strong>ciepło utajone kondensacji</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Ciśnienie pary nasyconej (<InlineMath math="e_s" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Wzór Magnusa-Tetensa</p>
                <div className="text-indigo-600"><BlockMath math="e_s(T) = 6.112 \cdot e^{\frac{17.62 \cdot T}{T + 243.12}} \text{ [hPa]}" /></div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-medium text-slate-700 mb-1">Temperatura punktu rosy (<InlineMath math="T_d" />)</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Zależność od wilgotności RH</p>
                <div className="text-indigo-600 overflow-x-auto text-sm">
                  <BlockMath math="\gamma(T, RH) = \ln\left(\frac{RH}{100}\right) + \frac{17.62 \cdot T}{243.12 + T}" />
                  <BlockMath math="T_d = \frac{243.12 \cdot \gamma(T, RH)}{17.62 - \gamma(T, RH)} \text{ [°C]}" />
                </div>
              </div>
            </div>
            <p className="leading-relaxed text-sm bg-blue-50 text-blue-800 p-3 rounded-lg border border-blue-100 mb-3">
              <em>Ciepło utajone kondensacji obciąża cieplnie złoże gruntu, jednak nie jest wliczane do rocznego bilansu dostarczonego chłodu do budynku (program raportuje wyłącznie chłód jawny).</em>
            </p>
            <p className="leading-relaxed">
              Model stosuje iteracyjną metodę entalpiczną (sprzężenie ciepła jawnego i utajonego): efektywna pojemność cieplna powietrza jest w każdej iteracji korygowana o człon utajony <InlineMath math="L \cdot \left|\frac{dx_{sat}}{dT}\right|" />. Pozwala to na jednoczesne wyznaczenie temperatury wyjściowej i masy kondensatu w stanie równowagi termodynamicznej.
            </p>
          </section>

          {/* Sekcja 6: Termodynamika Złoża Gruntowego */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Activity className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">6. Termodynamika Złoża Gruntowego (Degradacja i Spin-up)</h3>
            </div>
            <p className="leading-relaxed">
              Kluczowym elementem modelu jest symulacja wyczerpywania się potencjału cieplnego gruntu. Wymiana ciepła w danej sekundzie to tylko część procesu – odebrane lub oddane ciepło trwale zmienia temperaturę samego złoża.
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <li>
                <strong>Pojemność cieplna walca ziemi:</strong> Obliczana jest precyzyjna masa gruntu w promieniu aktywnym wokół rury, z odjęciem "pustki" samej rury.
              </li>
              <li>
                <strong>Degradacja:</strong> Ciepło jawne oraz utajone (z kondensacji) odebrane/oddane przez powietrze w każdej godzinie trwale zmienia temperaturę złoża (<InlineMath math="T_{zloza}" />). To wyczerpywanie się potencjału gruntu jest głównym powodem spadku wydajności GWC w trakcie długiej zimy.
              </li>
              <li>
                <strong>Relaksacja:</strong> Grunt nieustannie dąży do powrotu do naturalnej nienaruszonej temperatury gruntu z równania Kusudy-Achenbacha zgodnie z prawem stygnięcia Newtona, wykorzystując stałą czasową relaksacji (<InlineMath math="\tau_{reg}" />).
              </li>
              <li>
                <strong>Procedura Spin-up:</strong> Aby wyniki były miarodajne naukowo, silnik wykonuje <strong>3-letnią symulację rozgrzewkową</strong> przed zaraportowaniem wyników. Dzięki temu grunt wchodzi w stan quasi-ustalony, co zapobiega sztucznemu zawyżaniu wyników w pierwszym roku pracy.
              </li>
            </ul>
          </section>

          {/* Sekcja 7: Integracja z Rekuperatorem */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">7. Integracja z Rekuperatorem</h3>
            </div>
            <p className="leading-relaxed">
              Program nie jest jedynie kalkulatorem samego GWC, lecz symuluje <strong>opłacalność GWC w systemie z rekuperacją</strong>. Uwzględnia to zjawisko "prawa malejących przychodów".
            </p>
            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <strong>Dynamiczny próg szronienia:</strong> Grzałka wstępna rekuperatora nie włącza się przy sztywnym 0°C. Próg ten jest liczony dynamicznie i zależy od sprawności wymiennika (<InlineMath math="\eta" />):
                <div className="text-indigo-600 mt-2"><BlockMath math="T_{szronienia} = T_{wewn} \cdot \left(1 - \frac{1}{\eta}\right)" /></div>
                <p className="text-[11px] text-slate-500 mt-2 italic">
                  Wzór wyznacza temperaturę na czerpni rekuperatora, przy której powietrze wyrzucane osiąga 0°C. Przyjmuje się założenie bezpieczne, że przy tej temperaturze obecna w wywiewie wilgoć zacznie zamarzać, blokując przepływ.
                </p>
                <p className="text-[11px] text-slate-500 mt-1 italic">
                  Wyjątkiem od powyższego wzoru są rekuperatory z wymiennikiem <strong>entalpicznym (ERV)</strong>, dla których próg szronienia został założony na stałym poziomie <strong>-7°C</strong>. W przypadku urządzeń z wymiennikiem <strong>obrotowym</strong> grzałka wstępna fizycznie nie występuje, dlatego program nie nalicza dla nich oszczędności wynikających z jej pracy.
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                <strong>Zysk pozorny:</strong> Podgrzanie powietrza przez GWC przed rekuperatorem jest w większości "konsumowane" przez mniejszy odzysk ciepła na samym rekuperatorze (mniejsza różnica temperatur między powietrzem czerpanym a wywiewanym).
              </div>
            </div>
          </section>

          {/* Sekcja 8: Logika Bypassu */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-rose-500 mb-2">
              <Settings className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-slate-800">8. Logika Sterowania (Bypass i Histereza)</h3>
            </div>
            <p className="leading-relaxed">
              System wyposażony jest w wirtualną przepustnicę (bypass), która omija GWC, gdy jego praca byłaby niekorzystna energetycznie. Zastosowano maszynę stanów z histerezą, aby zapobiec "taktowaniu" (ciągłemu przełączaniu):
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <li>
                <strong>Zima (Ogrzewanie):</strong><br/>
                - GWC włącza się, gdy złoże jest cieplejsze od powietrza zewnętrznego o min. <strong>1.0°C</strong> (Histereza Aktywacji).<br/>
                - GWC wyłącza się (Bypass), gdy powietrze zewnętrzne staje się cieplejsze od złoża o min. <strong>1.0°C</strong> (Histereza Bypassu).
              </li>
              <li>
                <strong>Lato (Chłodzenie):</strong><br/>
                - Biorąc pod uwagę letnie zyski ciepła od słońca, algorytm bierze pod uwagę korzystanie z GWC nawet w przypadku temperatury powietrza zewnętrznego niższej niż zadana temperatura wewnętrzna. Próg aktywacji GWC wynosi 4°C poniżej zadanej temperatury wewnętrznej letniej (np. bazowo 20°C przy docelowych 24°C).<br/>
                - Zastosowano zaawansowaną, niesymetryczną histerezę dla całego układu budynku: tryb free-coolingu włącza się, gdy temperatura rośnie powyżej progu + 1.0°C (aktywacja przy 21°C), a wyłącza dopiero przy spadku o 2.0°C poniżej progu (dezaktywacja przy 18°C). Zapewnia to maksymalne wykorzystanie darmowego chłodu w cyklu dobowym i chroni siłowniki przed taktowaniem.<br/>
                - GWC włącza się, gdy temperatura zewnętrzna przekracza ten próg, a złoże jest chłodniejsze od powietrza o min. 1.0°C.<br/>
                - Maszyna stanów rekuperatora otwiera bypass zawsze, gdy powietrze czerpane (z zewnątrz lub z GWC) jest chłodniejsze niż temperatura docelowa w trybie letnim, co chroni darmowy chłód z wymiennika przed ogrzaniem na wymienniku.
              </li>
              <li>
                <strong>Blokady Sezonowe i Miesiące Przejściowe:</strong><br/>
                W celu odzwierciedlenia rzeczywistej pracy automatyki budynkowej (tzw. tryb letni / tryb zimowy) oraz wyeliminowania anomalii z danych klimatycznych TMY, program stosuje sztywne blokady kalendarzowe. Funkcja ogrzewania i zliczanie oszczędności grzewczych są całkowicie zablokowane w miesiącach letnich (czerwiec, lipiec, sierpień). Funkcja free-coolingu oraz zliczanie dostarczonego chłodu są zablokowane w sezonie jesienno-zimowym i wczesnowiosennym (od października do kwietnia włącznie). Maj i wrzesień traktowane są jako miesiące przejściowe, w których dozwolone jest zarówno ogrzewanie, jak i chłodzenie. Aby jednak uniknąć częstego taktowania systemu dla marginalnych zysków, histereza aktywacji grzania w tych miesiącach została zwiększona do 3.0°C, a próg aktywacji chłodzenia (histereza chłodzenia) został zwiększony do 2.0°C (chłodzenie włącza się np. dopiero po przekroczeniu 22°C na zewnątrz).
              </li>
            </ul>
          </section>

        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
