'use strict';
/* ===================== Konfiguration =====================
   Produktiv: Bibliotheken + Kacheln ausschliesslich vom eigenen Kartenserver (Projektanweisung Kap. 2).
   Der CDN-Fallback ist nur für diesen Prototyp gedacht. Der Supabase-Key ist ein publishable (öffentlicher) Key;
   der Schutz der Daten erfolgt über Row Level Security + Anmeldung. */
const CFG={mapBase:'http://83.228.212.145',sb:{url:'https://tcnukiwzsitmicqerhdo.supabase.co',key:'sb_publishable_0xFTQgcjH1fNuYhho0Dpdw_rUTdCWBh'},
  cdn:{ml:'https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.js',mlcss:'https://unpkg.com/maplibre-gl@5.1.0/dist/maplibre-gl.css',pm:'https://unpkg.com/pmtiles@3.2.0/dist/pmtiles.js',bm:'https://unpkg.com/@protomaps/basemaps@5.0.0/dist/basemaps.js'},
  own:{ml:'/lib/maplibre-gl.js',mlcss:'/lib/maplibre-gl.css',pm:'/lib/pmtiles.js',bm:'/lib/basemaps.js',topo:'/topo.pmtiles',sat:'/sat.pmtiles',dem:'/dem.pmtiles',glyphs:'/fonts/{fontstack}/{range}.pbf'}};
const GR={w:8.65,s:46.16,e:10.50,n:47.07};
const TOWNS=[['Chur',9.533,46.850],['Davos',9.822,46.797],['St. Moritz',9.838,46.498],['Arosa',9.680,46.779],['Scuol',10.298,46.797],['Disentis',8.853,46.703],['Thusis',9.440,46.697],['Poschiavo',10.060,46.325],['Ilanz',9.205,46.774],['Klosters',9.880,46.869],['Lenzerheide',9.558,46.729],['Flims',9.284,46.836],['Savognin',9.598,46.597],['Zernez',10.093,46.699],['Samedan',9.873,46.534],['Landquart',9.564,46.967],['Splügen',9.323,46.552],['Vals',9.181,46.617],['Maloja',9.695,46.404],['Müstair',10.448,46.626],['Roveredo',9.129,46.236],['Bergün',9.746,46.629]];

/* ===================== Schema-Daten (aus discover.swiss Klassifikation + ODTA-CH) ===================== */
const L=s=>s.split(';').map(x=>x.split('|'));
const CLS={
Event:L("_|Veranstaltung;ExhibitionEvent|Ausstellung;VisualArtsEvent|Bildende Kunst Veranstaltung;EducationEvent|Bildungsveranstaltung;ComedyEvent|Comedy-Veranstaltung;HolidayCamp|Ferienlager;Festival|Festival;ScienceEvent|Forschungsveranstaltung;GuidedTour|Führung;MunicipalityEvent|Gemeindeveranstaltung;HistoryEvent|Geschichtsveranstaltung;BusinessEvent|Geschäftsveranstaltung;HealthEvent|Gesundheitsveranstaltung;Hackathon|Hackathon;CinemaScreening|Kinovorführung;CommunicationEvent|Kommunikationsveranstaltung;Congress|Kongress;MusicEvent|Konzert;FoodEvent|Kulinarische Veranstaltung;ArtsAndCraftsEvent|Kunsthandwerksausstellung;CourseInstance|Kursinstanz;LiteraryEvent|Literarische Veranstaltung;Fair|Messeveranstaltung;MuseumEvent|Museumsveranstaltung;OpenAirEvent|Open-Air-Veranstaltung;PartyEvent|Party;PoliticalEvent|Politische Veranstaltung;SpiritualEvent|Religiöse Veranstaltung;ScreeningEvent|Screening-Event;SocialEvent|Soziale Veranstaltung;SportsEvent|Sportveranstaltung;StreetMarketEvent|Strassenmarkt;DanceEvent|Tanzveranstaltung;TechnologicalEvent|Technologieveranstaltung;TheaterEvent|Theateraufführung;TraditionalEvent|Traditionelle Veranstaltung;EventSeries|Veranstaltungsreihe;SaleEvent|Verkaufsveranstaltung;VariousEvent|Verschiedene Veranstaltungen;PublicationEvent|Veröffentlichungsveranstaltung;eSports|eSports"),
FoodEstablishment:L("_|Gastronomie;BarOrPub|Bar;MountainRestaurant|Bergrestaurant;BeerGarden|Biergarten;Bistro|Bistro;Brewery|Brauerei;Distillery|Brennerei;Bakery|Bäckerei;CafeOrCoffeeShop|Café;IceCreamShop|Eisdiele;FastFoodRestaurant|Fast-Food-Restaurant;Grotto|Grotto;Imbiss|Imbissstand;Confectionery|Konditorei;Dairy|Molkerei;Pizzeria|Pizzeria;Restaurant|Restaurant;TakeAway|Take-away;Vinotheque|Vinothek;Winery|Weingut"),
Tour:L("_|Tour;AlpineHikingtrail|Alpinwanderweg;CarTour|Autotour;MountainHikingtrail|Bergwanderweg;BikeTrail|Bike Trail;BusTour|Bus-Tour;MotorTour|E-Mountainbike-Tour;GlacierTour|Gletschertour;HighTour|Hochtour;ViaFerrata|Klettersteig;CrossCountry|Langlaufloipe;Longdistance|Langstreckentour;MotorisedTours|Motorisierte Tour;NatureTrail|Naturlehrpfad;QuadTour|Quad-Tour;Route|Route;ShipTour|Schiffstour;TobogganRun|Schlittelpiste;SnowshoeTrail|Schneeschuhwanderweg;SegwayTour|Segway-Tour;SkiSlope|Skipiste;ThemeTrail|Themenweg;SkiRoute|Tourenski Route;HikingTrail|Wanderweg;Way|Weg;WinterHiking|Winterwanderweg;TrainTour|Zugtour"),
Webcam:L("_|Webcam;LiveVideo|Live-Video;StaticWebcam|Statische Webcam;WebLink|WebLink"),
Product:L("_|Produkt;Offer|Angebot;Package|Package;Experience|Erlebnis;Adventure|Abenteuer;Course|Kurs;CityTour|Stadtrundfahrt;Ticket|Fahrkarte;EventTicket|Veranstaltungs-Ticket;SkiTicket|Ski-Ticket;CrossCountryTicket|Langlaufpass;GuestCard|Gästekarte;Vouchers|Gutscheine;Rental|Verleih;Services|Dienstleistungen;Transport|Verkehr;Wellness|Wellness;TableReservation|Tischreservation;Membership|Mitgliedschaft;StayHelper|Aufenthalt;Food|Nahrungsmittel;Beverage|Getränk;Merchandise|Merchandiseartikel;Sportsgood|Sportartikel;IndividualProduct|Individuelles Produkt"),
Place:L("_|Ort;AlpsPass|Alpenpass;ArchaeologicalSite|Archäologische Fundstätte;Mountain|Berg;MountainPeak|Berggipfel;RiverBodyOfWater|Fluss;BodyOfWater|Gewässer;Glacier|Gletscher;HistoricSite|Historische Stätte;Island|Insel;Landform|Landschaft;Moor|Moor;TownScape|OrtsBild;Reservoir|Reservoir;Canyon|Schlucht;LakeBodyOfWater|See;LandmarkOrHistoricalBuilding|Sehenswürdigkeit;Pond|Teich;Waterfall|Wasserfall"),
CivicStructure:L("_|Öffentliche Anlage/Einrichtung;Alp|Alm;Viewpoint|Aussichtspunkt;ObservationTower|Aussichtsturm;BathingSpot|Badestelle;TrainStation|Bahnhof;Farm|Bauernhof;VisitorCenter|Besucherzentrum;Biotope|Biotop;Fountain|Brunnen;Bridge|Brücke;Bunker|Bunker;DamOrWeir|Damm;Monument|Denkmal;Square|Dorfplatz;Fortress|Festung;Fireplace|Feuerstelle;OutdoorStage|Freilichtbühne;Gallery|Galerie;Garden|Garten;GlacierGarden|Gletschergarten;Cave|Höhle;IndustrialMonument|Industriedenkmal;InfoPoint|Infopunkt;Chapel|Kapelle;Church|Kirche;Monastery|Kloster;CongressCenter|Kongresszentrum;ConcertHall|Konzertsaal;HerbGarden|Kräutergarten;CulturalCentre|Kulturzentrum;ArtObject|Kunstobjekt;Market|Markt;Mine|Mine;Museum|Museum;MusicVenue|Musikstätte;Mill|Mühle;NaturalMonument|Naturdenkmal;NaturePark|Naturpark;NatureReserve|Naturschutzgebiet;Observatory|Observatorium;Park|Park;ParkingFacility|Parkplatz;PicnicArea|Picknickplatz;CityHall|Rathaus;Ruin|Ruine;Castle|Schloss;CableCarStation|Seilbahnstation;Playground|Spielplatz;LandingStage|Steg;Beach|Strand;Theatre|Theater;AnimalPark|Tierpark;TouristAttraction|Touristenattraktion;MeetingPoint|Treffpunkt;StalactiteCave|Tropfsteinhöhle;EventVenue|Veranstaltungsort;Mansion|Villa;Forest|Wald;Vineyard|Weinberg;RVPark|Wohnmobilstellplatz;Zoo|Zoo;PublicToilet|Öffentliche Toilette"),
LocalBusiness:L("_|Freizeit/Dienstleistung;OutdoorPool|Aussenpool;MountainSchool|Bergschule;Library|Bibliothek;BikeStore|Bike-Shop;BikePark|Bikepark;BikeSchool|Bikeschule;BowlingAlley|Bowling;Casino|Casino;SkatingRink|Eisbahn;Railway|Eisenbahn;IceField|Eisfeld;EscapeRoom|Escape Room;BikeRental|Fahrradverleih;FlightSchool|Flugschule;PublicSwimmingPool|Freibad;AmusementPark|Freizeitpark;ParaglidingSite|Gleitschirmflugplatz;GolfCourse|Golfplatz;TouristInformationCenter|Gäste-Informationsstelle;IndoorPool|Hallenbad;HighRopesCourse|Hochseilgarten;FarmShop|Hofladen;Cinema|Kino;ClimbingGarden|Klettergarten;ClimbingHall|Kletterhalle;ArtGallery|Kunstgalerie;CrosscountryCenter|Langlaufzentrum;MinigolfCourse|Minigolfanlage;PumpTrack|Pumptrack;Sauna|Sauna;SnowPark|Schneepark;SnowsportRental|Schneesportverleih;Ropepark|Seilpark;SkiSchool|Skischule;SummerTobogganTrack|Sommerrodelbahn;DaySpa|Spa;SportsActivityLocation|Sportanlage;StadiumOrArena|Stadion/Arena;TennisComplex|Tennisanlage;ThermalSpa|Therme;AdventurePoolOrAquaPark|Wasserpark;WatersportRental|Wassersportverleih;WinterTobogganTrack|Winterrodelbahn")};
/* ODTA: [Datentyp E=Enumeration B=Boolean, Mehrfach Y/N, Werte] */
const ODTA={
'access/BudgetLevel':['E','N',"PriceFree|Gratis;PriceLow|$ – Günstig;PriceModerate|$$ – Moderat;PriceUpscale|$$$ – Gehoben;PriceLuxury|$$$$ – Luxus"],
'access/AcceptedProgram':['E','Y',"SwissTravelPass|Swiss Travel Pass;GuestCard|Gästekarte"],
'access/PaymentOptions':['E','Y',"BankTransfer|Banküberweisung;CashOnly|Nur Barzahlung;ContactlessPayment|Kontaktloses Bezahlen;CreditCard|Kreditkarte;CryptoCurrency|Kryptowährung;Twint|Twint;Voucher|Gutschein"],
'access/BookingPolicy':['B','Y',"BookingRequired|Reservierung erforderlich;WalkIn|Ohne Voranmeldung;TimedEntry|Zeitgesteuerter Eintritt;SkipTheLineAvailable|Optionen ohne Anstehen"],
'atmosphere/Format':['E','Y',"Outdoor|Im Freien;Indoor|Drinnen;Virtual|Online"],
'atmosphere/Occasion':['E','N',"Christmas|Weihnachten;Carnival|Fasnacht;Easter|Ostern;NewYear|Neujahr;NationalDay|Nationalfeiertag;ValentinesDay|Valentinstag;Halloween|Halloween;MothersDay|Muttertag;FathersDay|Vatertag"],
'atmosphere/MusicStyle':['E','Y',"Classical|Klassische Musik;Jazz|Jazz;Rock|Rock;Pop|Pop-Musik;Electronic|Elektronische Musik;HipHop|Hip Hop;Latin|Latino-Musik;Traditional|Volksmusik"],
'audience/AgeGroup':['E','Y',"Children|Kinder;Youths|Jugendliche;Adults|Erwachsene;Seniors|Senioren"],
'audience/Lifestyle':['E','Y',"Singles|Singles;Families|Familien;Couples|Paare;Friends|Freunde;DogOwners|Hundebesitzer"],
'availability/Month':['E','Y',"January|Jan;February|Feb;March|Mär;April|Apr;May|Mai;June|Jun;July|Jul;August|Aug;September|Sep;October|Okt;November|Nov;December|Dez"],
'certification/Unesco':['B','Y',"UnescoWorldCulturalHeritage|UNESCO Weltkulturerbe;UnescoWorldNaturalHeritage|UNESCO Weltnaturerbe"],
'certification/Swisstainable':['E','N',"SwisstainableLevel1|Swisstainable Level I – engagiert;SwisstainableLevel2|Swisstainable Level II – engagiert;SwisstainableLevel3|Swisstainable Level III – führend"],
'culinary/CuisineType':['E','Y',"AfricanCuisine|Afrikanische Küche;AmericanCuisine|Amerikanische Küche;AsianCuisine|Asiatische Küche;CentralAmericanCuisine|Zentralamerikanische Küche;ChineseCuisine|Chinesische Küche;FrenchCuisine|Französische Küche;IndianCuisine|Indische Küche;InternationalCuisine|Internationale Küche;ItalianCuisine|Italienische Küche;JapaneseCuisine|Japanische Küche;MediterraneanCuisine|Mediterrane Küche;MexicanCuisine|Mexikanische Küche;OrientalCuisine|Orientalische Küche;PersianCuisine|Persische Küche;SpanishCuisine|Spanische Küche;SwissCuisine|Schweizer Küche;ThaiCuisine|Thailändische Küche;TurkishCuisine|Türkische Küche;VietnameseCuisine|Vietnamesische Küche;BBQ|BBQ"],
'culinary/MealType':['E','Y',"Breakfast|Frühstück;Brunch|Brunch;Lunch|Mittagessen;Dinner|Abendessen"],
'culinary/DietaryOptions':['E','Y',"Vegetarian|Vegetarisch;Vegan|Vegan;GlutenFree|Glutenfrei"],
'difficulty/HikingDifficulty':['E','N',"T1|T1 – Leichtes Wandern;T2|T2 – Bergwandern;T3|T3 – Anspruchsvolles Bergwandern;T4|T4 – Alpinwandern;T5|T5 – Anspruchsvolles Alpinwandern;T6|T6 – Schwieriges Alpinwandern"],
'difficulty/AlpineDifficulty':['E','N',"L|L – Leicht;WS|WS – Wenig schwierig;ZS|ZS – Ziemlich schwierig;S|S – Schwierig;SS|SS – Sehr schwierig;EX|EX – Extrem schwierig"],
'difficulty/SkiTouringDifficulty':['E','N',"L|L – Leicht;WS|WS – Wenig schwierig;ZS|ZS – Ziemlich schwierig;S|S – Schwierig;SS|SS – Sehr schwierig;EX|EX – Extrem schwierig"],
'difficulty/SnowshoeingDifficulty':['E','N',"WT1|WT1 – Leichte Schneeschuhwanderung;WT2|WT2 – Schneeschuhwanderung;WT3|WT3 – Anspruchsvolle Schneeschuhwanderung;WT4|WT4 – Schneeschuhtour;WT5|WT5 – Alpine Schneeschuhtour;WT6|WT6 – Anspruchsvolle alpine Schneeschuhtour"],
'difficulty/ViaFerrataDifficulty':['E','N',"K1|K1 – Leicht;K2|K2 – Wenig schwierig;K3|K3 – Ziemlich schwierig;K4|K4 – Schwierig;K5|K5 – Sehr schwierig;K6|K6 – Extrem schwierig"],
'difficulty/SingletrailDifficulty':['E','N',"S0|S0 – Leicht;S1|S1 – Mittel;S2|S2 – Schwierig;S3|S3 – Sehr schwierig;S4|S4 – Extrem schwierig;S5|S5 – Nicht fahrbar"],
'difficulty/FitnessLevel':['E','N',"FitnessLow|Geringe Kondition erforderlich;FitnessModerate|Mittlere Kondition erforderlich;FitnessHigh|Hohe Kondition erforderlich"],
'difficulty/OverallDifficulty':['E','N',"DifficultyEasy|Einfach;DifficultyModerate|Mittel;DifficultyDifficult|Schwierig"],
'logistics/Season':['E','Y',"Spring|Frühling;Summer|Sommer;Autumn|Herbst;Winter|Winter"],
'logistics/TravelMobility':['E','Y',"CarAccessible|Mit dem Auto erreichbar;PublicTransportAccessible|Mit dem ÖV erreichbar;MountainTransportAccessible|Mit Bergverkehrsmittel erreichbar;BoatAccessible|Mit dem Boot erreichbar"],
'logistics/WeatherDependency':['E','N',"AllWeather|für jedes Wetter geeignet;FairWeather|Nur bei gutem Wetter;Rain|Nur bei Regen;Snow|Nur bei Schnee;Wind|Nur bei Wind"],
'logistics/Guidance':['B','Y',"AudioGuide|Audioguide;GuidedTours|Führungen;SelfGuided|Selbstgeführt"],
'metadata/CopyrightLicence':['E','N',"CCBy|CC-BY;CCByNC|CC-BY-NC;CCByNCND|CC-BY-NC-ND;CCByNCSA|CC-BY-NC-SA;CCByND|CC-BY-ND;CCBySA|CC-BY-SA;CC0|CC-0;Copyright|Copyright – Alle Rechte vorbehalten"],
'metadata/InLanguage':['E','Y',"GermanLanguage|Deutsch;ItalianLanguage|Italienisch;FrenchLanguage|Französisch;EnglishLanguage|Englisch;SpanishLanguage|Spanisch;PortugueseLanguage|Portugiesisch;RussianLanguage|Russisch;ChineseLanguage|Chinesisch;JapaneseLanguage|Japanisch;HindiLanguage|Hindi"]};
for(const k in ODTA)ODTA[k][2]=L(ODTA[k][2]);

const IC={
event:'<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
poi:'<path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
food:'<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2.5 5-2.5 8H17v10"/>',
tour:'<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h7a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h7"/>',
offer:'<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
webcam:'<rect x="3" y="7" width="13" height="10" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
all:'<path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5"/>',imp:'<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',exp:'<path d="M12 15V3M7 8l5-5 5 5M4 20h16"/>',set:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
map:'<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>',tbl:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>'};
const svg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[k]}</svg>`;
const TYPES={
event:{label:'Veranstaltung',plural:'Veranstaltungen',cls:'Event',mk:'event'},
poi:{label:'Ausflugsziel',plural:'Ausflugsziele',cls:null,mk:'default'},
food:{label:'Restaurant',plural:'Restaurants',cls:'FoodEstablishment',mk:'restaurant'},
tour:{label:'Tour',plural:'Touren',cls:'Tour',mk:'route'},
offer:{label:'Angebot',plural:'Angebote',cls:'Product',mk:'offer'},
webcam:{label:'Webcam',plural:'Webcams',cls:'Webcam',mk:'default'}};
const LANGS=['de','it','en','fr'];
const DAYS=[['Mo','Monday',1],['Di','Tuesday',2],['Mi','Wednesday',3],['Do','Thursday',4],['Fr','Friday',5],['Sa','Saturday',6],['So','Sunday',0]];
const TOURP={hike:{v:4,up:300,dn:500,l:'Wandern: 4 km/h, 300 Hm/h auf, 500 Hm/h ab'},bike:{v:13,up:500,dn:2500,l:'Bike: 13 km/h, 500 Hm/h auf'},snow:{v:3,up:250,dn:450,l:'Schnee zu Fuss: 3 km/h, 250 Hm/h auf, 450 Hm/h ab'},ski:{v:3.5,up:350,dn:1500,l:'Skitour: 3.5 km/h, 350 Hm/h auf'},xc:{v:8,up:400,dn:2000,l:'Langlauf: 8 km/h, 400 Hm/h auf'}};
const TOURMAP={'':['hike','HikingDifficulty'],HikingTrail:['hike','HikingDifficulty'],MountainHikingtrail:['hike','HikingDifficulty'],AlpineHikingtrail:['hike','HikingDifficulty'],ThemeTrail:['hike','HikingDifficulty'],NatureTrail:['hike','HikingDifficulty'],Way:['hike','HikingDifficulty'],Longdistance:['hike','HikingDifficulty'],WinterHiking:['snow','HikingDifficulty'],SnowshoeTrail:['snow','SnowshoeingDifficulty'],SkiRoute:['ski','SkiTouringDifficulty'],CrossCountry:['xc',null],BikeTrail:['bike','SingletrailDifficulty'],MotorTour:['bike','SingletrailDifficulty'],ViaFerrata:['hike','ViaFerrataDifficulty'],HighTour:['hike','AlpineDifficulty'],GlacierTour:['hike','AlpineDifficulty']};

/* ===================== Helfer ===================== */
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const get=(o,k)=>k.split('.').reduce((a,p)=>a==null?a:a[p],o);
const set=(o,k,v)=>{const p=k.split('.');let a=o;for(let i=0;i<p.length-1;i++)a=a[p[i]]??(a[p[i]]={});a[p[p.length-1]]=v};
const uid=()=>'gr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const nf=(n,d=0)=>n==null||isNaN(n)?'–':Number(n).toLocaleString('de-CH',{maximumFractionDigits:d,minimumFractionDigits:d});
const isoD=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fmtD=s=>s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'';
const nm=it=>it.name?.de||it.name?.it||it.name?.en||it.name?.fr||'(ohne Namen)';
const isUrl=u=>/^https?:\/\/[^\s]+\.[^\s]+/i.test(u||'');
const clone=o=>JSON.parse(JSON.stringify(o));
const reduced=()=>window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function toast(m){const t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3800)}
function typeLabel(it){const a=it.additionalType||'';if(it.type==='poi'){const[c,s]=a.split(':');return (CLS[c]||[]).find(x=>x[0]===(s||'_'))?.[1]||'Ausflugsziel'}
  return CLS[TYPES[it.type].cls].find(x=>x[0]===(a||'_'))?.[1]||TYPES[it.type].label}
function dl(name,text,mime){try{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime||'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}catch(e){toast('Download nicht möglich – bitte Inhalt kopieren.')}}

/* ===================== Geo-Berechnungen ===================== */
function hav(a,b){const R=6371008.8,r=Math.PI/180,dy=(b.y-a.y)*r,dx=(b.x-a.x)*r,s=Math.sin(dy/2)**2+Math.cos(a.y*r)*Math.cos(b.y*r)*Math.sin(dx/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
function cumDist(tk){const d=[0];for(let i=1;i<tk.length;i++)d.push(d[i-1]+hav(tk[i-1],tk[i]));return d}
/* Höhenprofil aus Stützpunkten; fehlende Höhen werden zwischen bekannten linear interpoliert */
function vertexProfile(tk){const d=cumDist(tk),known=tk.map((p,i)=>p.z!=null&&!isNaN(p.z)?i:-1).filter(i=>i>=0);
  if(!known.length)return{pts:tk.map((p,i)=>({d:d[i],z:null,x:p.x,y:p.y})),known:0};
  const pts=tk.map((p,i)=>{let z=p.z;if(z==null||isNaN(z)){let a=-1,b=-1;for(const k of known){if(k<i)a=k;else if(k>i){b=k;break}}
    if(a<0)z=tk[b].z;else if(b<0)z=tk[a].z;else{const f=(d[i]-d[a])/((d[b]-d[a])||1);z=tk[a].z+(tk[b].z-tk[a].z)*f}}return{d:d[i],z,x:p.x,y:p.y}});
  return{pts,known:known.length}}
/* Auf-/Abstieg mit Hysterese (Schwelle filtert Rauschen des Höhenmodells) */
function climb(zs,th=5){let up=0,dn=0,ref=zs[0];for(const z of zs){const dz=z-ref;if(dz>=th){up+=dz;ref=z}else if(dz<=-th){dn-=dz;ref=z}}return{up,dn}}
function calcTime(len,up,dn,p){if(!p||!len)return null;const h=len/1000/p.v,v=(up||0)/p.up+(dn||0)/p.dn;return Math.max(5,Math.round((Math.max(h,v)+Math.min(h,v)/2)*12)*5)}
const isoDur=m=>m==null?null:'PT'+(m>=60?Math.floor(m/60)+'H':'')+(m%60||m<60?(m%60)+'M':'');
const fmtMin=m=>m==null?'–':Math.floor(m/60)+' h '+String(m%60).padStart(2,'0')+' min';
function tourStats(D,prof){const tk=D.track,c={length:null,ascent:null,descent:null,minAltitude:null,maxAltitude:null,time:null,roundTrip:false,eleSource:null,profile:[]};
  if(tk.length<2)return c;
  const vp=prof?{pts:prof,known:prof.length}:vertexProfile(tk);c.length=Math.round(vp.pts[vp.pts.length-1].d);
  c.roundTrip=hav(tk[0],tk[tk.length-1])<150&&c.length>300;
  if(vp.known){const zs=vp.pts.map(p=>p.z),cl=climb(zs);c.ascent=Math.round(cl.up);c.descent=Math.round(cl.dn);c.minAltitude=Math.round(Math.min(...zs));c.maxAltitude=Math.round(Math.max(...zs));
    const src=new Set(tk.filter(p=>p.z!=null).map(p=>p.s||'manual'));
    c.eleSource=prof?'Höhenmodell (dem.pmtiles), '+prof.length+' Stützstellen':(vp.known<tk.length?'teilweise interpoliert ('+vp.known+' von '+tk.length+' Punkten mit Höhe)':[...src].map(s=>({dem:'Höhenmodell',import:'Import (GPX/GeoJSON)',manual:'manuell erfasst'}[s]||s)).join(' + '));
    c.profile=vp.pts}
  const tp=TOURP[(TOURMAP[D.additionalType||'']||[])[0]];c.time=calcTime(c.length,c.ascent,c.descent,tp);c.timeRule=tp?tp.l:null;return c}
function fitnessSuggestion(c){if(c.time==null)return null;const t=c.time,a=c.ascent||0;return t>300||a>1000?'FitnessHigh':t<120&&a<300?'FitnessLow':'FitnessModerate'}
/* Douglas-Peucker, Toleranz in Metern (iterativ) */
function simplify(tk,tol=5){if(tk.length<3)return tk;const r=Math.PI/180,k=Math.cos(tk[0].y*r)*111320,P=tk.map(p=>[p.x*k,p.y*110540]),keep=new Uint8Array(tk.length);keep[0]=keep[tk.length-1]=1;const st=[[0,tk.length-1]];
  while(st.length){const[a,b]=st.pop();let m=0,mi=-1;const[ax,ay]=P[a],[bx,by]=P[b],dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy;
    for(let i=a+1;i<b;i++){let t=l2?((P[i][0]-ax)*dx+(P[i][1]-ay)*dy)/l2:0;t=Math.max(0,Math.min(1,t));const d=Math.hypot(P[i][0]-ax-t*dx,P[i][1]-ay-t*dy);if(d>m){m=d;mi=i}}
    if(m>tol&&mi>0){keep[mi]=1;st.push([a,mi],[mi,b])}}
  return tk.filter((p,i)=>keep[i])}
function parseTrack(text){text=text.trim();let pts=[];
  if(text[0]==='<'){const x=new DOMParser().parseFromString(text,'application/xml');let n=[...x.getElementsByTagName('trkpt')];if(!n.length)n=[...x.getElementsByTagName('rtept')];
    pts=n.map(e=>{const z=e.getElementsByTagName('ele')[0];return{x:+e.getAttribute('lon'),y:+e.getAttribute('lat'),z:z&&z.textContent!==''?+z.textContent:null}})}
  else{const j=JSON.parse(text),fs=j.type==='FeatureCollection'?j.features:j.type==='Feature'?[j]:[{geometry:j}];
    for(const f of fs){const g=f.geometry;if(!g)continue;const ls=g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];for(const l of ls)for(const c of l)pts.push({x:+c[0],y:+c[1],z:c[2]!=null?+c[2]:null});if(pts.length)break}}
  pts=pts.filter(p=>isFinite(p.x)&&isFinite(p.y));
  if(pts.length&&!(pts[0].x>5&&pts[0].x<11.5&&pts[0].y>45&&pts[0].y<48.5))throw new Error('Koordinaten liegen nicht in der Schweiz (erwartet WGS84 [lon, lat]).');
  if(pts.length<2)throw new Error('Keine Linie gefunden (GPX-Track/-Route oder GeoJSON LineString erwartet).');
  pts.forEach(p=>{if(p.z!=null&&isFinite(p.z)){p.z=Math.round(p.z*10)/10;p.s='import'}else p.z=null});return pts}

/* ===================== Höhenmodell (Terrain-RGB aus dem.pmtiles) ===================== */
const DEM={ok:false,pm:null,z:12,cache:new Map(),
  async init(){this.ok=false;this.cache.clear();if(!CFG.mapBase||!window.pmtiles)return;try{this.pm=new pmtiles.PMTiles(CFG.mapBase+CFG.own.dem);const h=await this.pm.getHeader();this.z=Math.min(h.maxZoom||12,13);this.ok=true}catch(e){console.warn('DEM nicht verfügbar',e)}},
  tile(x,y){const k=x+'/'+y;if(!this.cache.has(k))this.cache.set(k,(async()=>{const r=await this.pm.getZxy(this.z,x,y);if(!r||!r.data)return null;const bmp=await createImageBitmap(new Blob([r.data]));const c=document.createElement('canvas');c.width=bmp.width;c.height=bmp.height;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bmp,0,0);return{w:bmp.width,d:g.getImageData(0,0,bmp.width,bmp.height).data}})().catch(()=>null));return this.cache.get(k)},
  async at(lon,lat){if(!this.ok)return null;const n=2**this.z,fx=(lon+180)/360*n,s=Math.sin(lat*Math.PI/180),fy=(0.5-Math.log((1+s)/(1-s))/(4*Math.PI))*n,tx=Math.floor(fx),ty=Math.floor(fy),t=await this.tile(tx,ty);if(!t)return null;
    const px=Math.min(t.w-1,Math.floor((fx-tx)*t.w)),py=Math.min(t.w-1,Math.floor((fy-ty)*t.w)),i=(py*t.w+px)*4,z=-10000+(t.d[i]*65536+t.d[i+1]*256+t.d[i+2])*0.1;return z>-100&&z<5000?Math.round(z*10)/10:null},
  async profile(tk){const d=cumDist(tk),len=d[d.length-1],step=Math.max(25,len/3000),out=[];
    for(let i=0;i<tk.length-1;i++){const seg=d[i+1]-d[i],n=Math.max(1,Math.round(seg/step));for(let j=0;j<n;j++){const f=j/n;out.push({d:d[i]+seg*f,x:tk[i].x+(tk[i+1].x-tk[i].x)*f,y:tk[i].y+(tk[i+1].y-tk[i].y)*f})}}
    const l=tk[tk.length-1];out.push({d:len,x:l.x,y:l.y});for(const p of out)p.z=await this.at(p.x,p.y);return out.every(p=>p.z!=null)?out:null}};

/* ===================== Zustand ===================== */
const S={items:[],view:'map',types:new Set(),q:'',status:'',draft:null,isNew:false,dirty:false,lang:'de',pick:false,drawing:false,sort:['modified',-1],errs:[]};
function newItem(type){const now=new Date().toISOString();const it={id:uid(),type,status:'draft',created:now,modified:now,name:{},short:{},description:{},additionalType:type==='poi'?'CivicStructure:_':'',
  address:{street:'',zip:'',city:''},geo:{lat:null,lon:null,ele:null},contact:{phone:'',email:'',url:''},image:{url:'',alt:'',credit:'',licence:''},attrs:{}};
  if(type==='event')Object.assign(it,{schedule:[newSched()],location:'',organizer:'',price:{free:false,min:null,max:null,currency:'CHF',url:''}});
  if(type==='poi'||type==='food')Object.assign(it,{hours:[],hoursNote:{},price:{free:false}});
  if(type==='food')Object.assign(it,{reservations:false,menuUrl:'',gm:null,michelin:null});
  if(type==='tour')Object.assign(it,{track:[],computed:{},timeOverride:null,rating:{condition:null,technique:null,landscape:null,experience:null},texts:{startingPoint:{},destination:{},directions:{},safety:{},equipment:{},publicTransport:{},parking:{},tip:{}}});
  if(type==='offer')Object.assign(it,{offer:{price:null,free:false,currency:'CHF',unit:'pro Person',validFrom:'',validThrough:'',bookingUrl:'',provider:'',includes:{}},related:[]});
  if(type==='webcam')Object.assign(it,{cam:{contentUrl:'',embedUrl:'',refresh:null,heading:null,provider:''}});
  return it}
function newSched(){return{startDate:'',startTime:'',endDate:'',endTime:'',repeat:'none',byDay:[],until:'',status:'scheduled',note:''}}
function occurrences(s){if(!s.startDate)return[];if(!s.repeat||s.repeat==='none')return[s.startDate];const out=[],d=new Date(s.startDate+'T12:00'),u=new Date((s.until||s.startDate)+'T12:00'),by=s.byDay&&s.byDay.length?s.byDay:[d.getDay()];
  for(let i=0;d<=u&&i<731;i++,d.setDate(d.getDate()+1))if(s.repeat==='daily'||by.includes(d.getDay()))out.push(isoD(d));return out}
function eventDates(it){const all=[];(it.schedule||[]).forEach(s=>{if(s.status!=='cancelled')occurrences(s).forEach(d=>all.push(d+(s.startTime?' '+s.startTime:'')))});all.sort();const t=isoD(new Date());return{all,next:all.find(d=>d.slice(0,10)>=t)||null}}
function pointOf(it){if(it.type==='tour')return it.track&&it.track.length?[it.track[0].x,it.track[0].y]:null;const g=it.geo;return g&&g.lat!=null&&g.lon!=null&&isFinite(g.lat)&&isFinite(g.lon)?[+g.lon,+g.lat]:null}

/* ===================== Validierung & Qualität ===================== */
function validate(it){const e=[],rec=[],R=(l,ok)=>rec.push([l,!!ok]);
  if(!(it.name.de||'').trim())e.push(['name.de','Name (Deutsch) fehlt.']);
  const p=pointOf(it);
  if(it.type!=='tour'&&p){if(!(p[0]>5.9&&p[0]<10.6&&p[1]>45.8&&p[1]<47.9))e.push(['geo.lat','Koordinaten liegen ausserhalb der Schweiz (WGS84: Breite ≈ 45.8–47.8, Länge ≈ 5.9–10.5).'])}
  if(['poi','food','webcam'].includes(it.type)&&!p)e.push(['geo.lat','Standort (Koordinaten) fehlt.']);
  if(it.type==='event'){const sc=(it.schedule||[]).filter(s=>s.startDate);if(!sc.length)e.push(['schedule.0.startDate','Mindestens eine Spielzeit mit Startdatum erfassen.']);
    (it.schedule||[]).forEach((s,i)=>{if(s.startDate&&s.repeat==='none'&&s.endDate&&s.endDate<s.startDate)e.push([`schedule.${i}.endDate`,`Spielzeit ${i+1}: Enddatum liegt vor dem Startdatum.`]);
      if(s.startDate&&s.repeat!=='none'&&(!s.until||s.until<s.startDate))e.push([`schedule.${i}.until`,`Spielzeit ${i+1}: «Wiederholen bis» fehlt oder liegt vor dem Start.`]);
      if(s.startTime&&s.endTime&&s.endTime<s.startTime&&(s.repeat!=='none'||!s.endDate||s.endDate===s.startDate))rec.push([`Spielzeit ${i+1}: Ende vor Beginn – endet nach Mitternacht?`,false])});
    if(!p&&!(it.location||'').trim())e.push(['location','Veranstaltungsort (Name oder Koordinaten) fehlt.']);
    R('Standort auf Karte',p);R('Veranstalter',it.organizer);R('Preisangabe',it.price.free||it.price.min!=null)}
  if(it.type==='poi'||it.type==='food'){R('Ort (Adresse)',it.address.city);R('Öffnungszeiten',it.hours.length||it.hoursNote.de)}
  if(it.type==='food'){R('Küche',(it.attrs['culinary/CuisineType']||[]).length);R('Preisniveau',it.attrs['access/BudgetLevel'])}
  if(it.type==='poi'){R('Saison',(it.attrs['logistics/Season']||[]).length)}
  if(it.type==='tour'){if((it.track||[]).length<2)e.push(['track','Route fehlt: mindestens zwei Punkte zeichnen oder GPX/GeoJSON importieren.']);
    R('Höhendaten',it.computed&&it.computed.ascent!=null);R('Schwierigkeit',it.attrs['difficulty/OverallDifficulty']);R('Wegbeschreibung',it.texts.directions.de);R('Beste Monate',(it.attrs['availability/Month']||[]).length)}
  if(it.type==='offer'){if(!it.offer.free&&it.offer.price==null)e.push(['offer.price','Preis fehlt (oder «kostenlos» wählen).']);
    if(it.offer.validFrom&&it.offer.validThrough&&it.offer.validThrough<it.offer.validFrom)e.push(['offer.validThrough','Gültigkeit: Ende liegt vor Beginn.']);
    if(it.offer.bookingUrl&&!isUrl(it.offer.bookingUrl))e.push(['offer.bookingUrl','Buchungslink ist keine gültige URL (https://…).']);
    R('Gültigkeit',it.offer.validFrom);R('Buchungslink',it.offer.bookingUrl);R('Anbieter',it.offer.provider);R('Verknüpfte Inhalte',it.related.length)}
  if(it.type==='webcam'){const c=it.cam;if(!c.contentUrl&&!c.embedUrl)e.push(['cam.contentUrl','Bild-URL oder Stream-/Einbettungs-URL fehlt.']);
    if(c.contentUrl&&!isUrl(c.contentUrl))e.push(['cam.contentUrl','Bild-URL ist keine gültige URL (https://…).']);if(c.embedUrl&&!isUrl(c.embedUrl))e.push(['cam.embedUrl','Stream-URL ist keine gültige URL (https://…).']);
    R('Blickrichtung',c.heading!=null);R('Betreiber',c.provider)}
  if(it.contact.url&&!isUrl(it.contact.url))e.push(['contact.url','Website ist keine gültige URL (https://…).']);
  if(it.image.url&&!isUrl(it.image.url))e.push(['image.url','Bild-URL ist keine gültige URL (https://…).']);
  if(it.image.url&&!(it.image.alt||'').trim())e.push(['image.alt','Bildbeschreibung (Alt-Text) ist Pflicht, wenn ein Bild gesetzt ist.']);
  R('Beschreibung',it.description.de);R('Kurztext',it.short.de);if(it.type!=='webcam'){R('Bild',it.image.url);R('Website',it.contact.url||it.type==='offer'&&it.offer.bookingUrl)}
  const tot=rec.length+3,ok=rec.filter(r=>r[1]).length+Math.max(0,3-e.length);
  return{errs:e,rec,score:Math.round(ok/tot*100)}}

/* ===================== Export ===================== */
const prune=o=>{if(Array.isArray(o)){const a=o.map(prune).filter(v=>v!==undefined);return a.length?a:undefined}if(o&&typeof o==='object'){const r={};for(const k in o){const v=prune(o[k]);if(v!==undefined)r[k]=v}return Object.keys(r).length?r:undefined}return o===''||o==null||o===false&&false?undefined:o};
function odtaProps(it){const out=[];for(const g in it.attrs){const v=it.attrs[g],def=ODTA[g];if(!def||v==null||v===''||Array.isArray(v)&&!v.length)continue;const[c,grp]=g.split('/');
  (Array.isArray(v)?v:[v]).forEach(id=>out.push({propertyId:c+grp+id,category:c,group:grp,name:def[2].find(x=>x[0]===id)?.[1]||id,value:true}))}return out}
function hoursSpec(it){return(it.hours||[]).filter(h=>h.days.length&&h.opens).map(h=>({dayOfWeek:h.days.map(d=>DAYS.find(x=>x[0]===d)[1]),opens:h.opens,closes:h.closes}))}
function toDS(it){const T=it.type,[pc,ps]=T==='poi'?(it.additionalType||'CivicStructure:_').split(':'):[TYPES[T].cls,it.additionalType||''],p=pointOf(it);
  const o={identifier:it.id,type:'schema.org/'+pc,additionalType:ps==='_'?'':ps,name:it.name,disambiguatingDescription:it.short,description:it.description,
    geo:p?{latitude:p[1],longitude:p[0],elevation:T==='tour'?it.track[0].z:it.geo.ele}:undefined,
    address:{streetAddress:it.address.street,postalCode:it.address.zip,addressLocality:it.address.city,addressRegion:'GR',addressCountry:'CH',email:it.contact.email},telephone:it.contact.phone,url:it.contact.url,
    image:it.image.url?{contentUrl:it.image.url,caption:it.image.alt,copyrightNotice:it.image.credit,license:it.image.licence}:undefined,
    additionalProperty:odtaProps(it),dataGovernance:{origin:[{datasource:it.source||'gr-contenthub',sourceId:it.sourceId||it.id}]},lastModified:it.modified,status:it.status};
  if(T==='event'){const ds=eventDates(it).all,sc=(it.schedule||[]).filter(s=>s.startDate);const ends=sc.map(s=>s.repeat!=='none'?s.until:(s.endDate||s.startDate)).sort();
    Object.assign(o,{startDate:ds[0]?ds[0].replace(' ','T'):undefined,endDate:ends.length?ends[ends.length-1]:undefined,isAccessibleForFree:it.price.free||undefined,
      eventSchedule:sc.map(s=>({type:'Schedule',startDate:s.startDate,endDate:s.repeat!=='none'?s.until:(s.endDate||s.startDate),startTime:s.startTime,endTime:s.endTime,repeatFrequency:{daily:'P1D',weekly:'P1W'}[s.repeat],
        byDay:s.repeat==='weekly'?(s.byDay.length?s.byDay:[new Date(s.startDate+'T12:00').getDay()]).map(n=>DAYS.find(x=>x[2]===n)[1]):undefined,
        eventStatus:{scheduled:'EventScheduled',cancelled:'EventCancelled',postponed:'EventPostponed',soldout:'SoldOut'}[s.status],description:s.note,occurrences:occurrences(s).length})),
      location:{name:it.location,address:o.address,geo:o.geo},organizer:it.organizer?{name:it.organizer}:undefined,
      offers:it.price.free?[{price:0,priceCurrency:it.price.currency}]:it.price.min!=null?[{price:it.price.min,highPrice:it.price.max,priceCurrency:it.price.currency,url:it.price.url}]:undefined})}
  if(T==='poi'||T==='food')Object.assign(o,{openingHoursSpecification:hoursSpec(it),openingHours:it.hoursNote,isAccessibleForFree:it.price&&it.price.free||undefined});
  if(T==='food')Object.assign(o,{servesCuisine:(it.attrs['culinary/CuisineType']||[]).map(id=>ODTA['culinary/CuisineType'][2].find(x=>x[0]===id)?.[1]),acceptsReservations:it.reservations||undefined,hasMenu:it.menuUrl,
    award:[it.gm?{name:'GaultMillau',value:it.gm}:null,it.michelin?{name:'Michelin',value:it.michelin}:null].filter(Boolean)});
  if(T==='tour'){const c=it.computed||{},time=it.timeOverride??c.time;Object.assign(o,{length:c.length,time,duration:isoDur(time),elevation:{ascent:c.ascent,descent:c.descent,minAltitude:c.minAltitude,maxAltitude:c.maxAltitude},
    rating:it.rating,difficulties:Object.keys(it.attrs).filter(k=>k.startsWith('difficulty/')&&it.attrs[k]).map(k=>({type:k.split('/')[1],value:it.attrs[k]})),
    season:(it.attrs['availability/Month']||[]).length?Object.fromEntries(ODTA['availability/Month'][2].map(m=>[m[0].toLowerCase(),it.attrs['availability/Month'].includes(m[0])])):undefined,
    winterActivity:['snow','ski','xc'].includes((TOURMAP[it.additionalType||'']||[])[0])||undefined,
    startingPointDescription:it.texts.startingPoint,destination:it.texts.destination,directions:it.texts.directions,safetyGuidelines:it.texts.safety,equipment:it.texts.equipment,publicTransport:it.texts.publicTransport,parking:it.texts.parking,tip:it.texts.tip,
    geoShape:it.track.length>1?{type:'LineString',coordinates:it.track.map(p=>p.z!=null?[p.x,p.y,p.z]:[p.x,p.y])}:undefined})}
  if(T==='offer'){const f=it.offer;Object.assign(o,{offers:[{price:f.free?0:f.price,priceCurrency:f.currency,unitText:f.unit,validFrom:f.validFrom,validThrough:f.validThrough,url:f.bookingUrl,seller:f.provider?{name:f.provider}:undefined}],
    includesObject:f.includes,isRelatedTo:it.related.map(id=>({identifier:id,name:nm(S.items.find(x=>x.id===id)||{name:{}})}))})}
  if(T==='webcam'){const c=it.cam;Object.assign(o,{contentUrl:c.contentUrl,embedUrl:c.embedUrl,refreshIntervalSeconds:c.refresh,heading:c.heading,provider:c.provider?{name:c.provider}:undefined})}
  return prune(o)}
function mkType(it){if(it.type==='poi'){const s=(it.additionalType||'').split(':')[1];return s==='MountainPeak'?'summit':s==='Viewpoint'||s==='ObservationTower'?'viewpoint':s==='CableCarStation'?'lift':s==='TrainStation'?'station':s==='ParkingFacility'?'parking':s==='InfoPoint'||s==='TouristInformationCenter'?'info':'default'}return TYPES[it.type].mk}
function toFeatures(it){const p=pointOf(it),d=(it.short.de||it.description.de||'').replace(/\s+/g,' ').slice(0,300),base={title:nm(it),description:d||undefined,image:it.image.url||undefined,imageAlt:it.image.url?it.image.alt:undefined,
    address:[it.address.street,[it.address.zip,it.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')||undefined,contentType:it.type,category:typeLabel(it)},F=[];
  if(it.type==='tour'){if(it.track.length<2)return F;const c=it.computed||{},co=p=>p.z!=null?[p.x,p.y,p.z]:[p.x,p.y];
    F.push({type:'Feature',id:it.id,geometry:{type:'LineString',coordinates:it.track.map(co)},properties:{...base,markerType:'route',lengthKm:c.length!=null?+(c.length/1000).toFixed(2):undefined,ascentM:c.ascent??undefined,descentM:c.descent??undefined,
      durationMin:(it.timeOverride??c.time)??undefined,difficulty:{DifficultyEasy:'easy',DifficultyModerate:'medium',DifficultyDifficult:'hard'}[it.attrs['difficulty/OverallDifficulty']]}});
    F.push({type:'Feature',id:it.id+'-start',geometry:{type:'Point',coordinates:co(it.track[0])},properties:{title:nm(it)+' – Start',markerType:'tour-start'}});
    if(!c.roundTrip)F.push({type:'Feature',id:it.id+'-end',geometry:{type:'Point',coordinates:co(it.track[it.track.length-1])},properties:{title:nm(it)+' – Ziel',markerType:'tour-end'}});return F}
  if(!p)return F;const extra=[];
  if(it.type==='event'){const ed=eventDates(it);if(ed.all.length)extra.push({label:'Termine',value:ed.all.length+(ed.next?' · nächster '+fmtD(ed.next)+ed.next.slice(10):'')})}
  if(it.type==='offer'&&(it.offer.free||it.offer.price!=null))extra.push({label:'Preis',value:it.offer.free?'kostenlos':it.offer.currency+' '+it.offer.price});
  F.push({type:'Feature',id:it.id,geometry:{type:'Point',coordinates:it.geo.ele!=null?[p[0],p[1],+it.geo.ele]:p},properties:{...base,markerType:mkType(it),elevation:it.geo.ele??undefined,extra:extra.length?extra:undefined}});return F}
function toGPX(it){return`<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Contenthub Graubünden" xmlns="http://www.topografix.com/GPX/1/1">\n<trk><name>${esc(nm(it))}</name><trkseg>\n${it.track.map(p=>`<trkpt lat="${p.y}" lon="${p.x}">${p.z!=null?`<ele>${p.z}</ele>`:''}</trkpt>`).join('\n')}\n</trkseg></trk>\n</gpx>`}
/* Import: Hub-Backup oder discover.swiss-Antwort ({data:[…]}) */
function fromDS(o){const t=String(o.type||o['@type']||'').split('/').pop(),type={Event:'event',Tour:'tour',FoodEstablishment:'food',Product:'offer',Webcam:'webcam',Place:'poi',CivicStructure:'poi',LocalBusiness:'poi'}[t];if(!type)return null;
  const it=newItem(type),strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),ml=v=>typeof v==='string'?(strip(v)?{de:strip(v)}:{}):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,strip(x)])):{};
  it.source='discover.swiss';it.sourceId=o.identifier||'';it.name=ml(o.name);it.description=ml(o.description);it.short=ml(o.disambiguatingDescription);
  it.additionalType=type==='poi'?t+':'+(o.additionalType||'_'):(o.additionalType||'');
  if(o.geo&&o.geo.latitude!=null)it.geo={lat:+o.geo.latitude,lon:+o.geo.longitude,ele:o.geo.elevation!=null?+o.geo.elevation:null};
  const a=o.address||{};it.address={street:a.streetAddress||'',zip:a.postalCode||'',city:a.addressLocality||''};it.contact={phone:o.telephone||a.telephone||'',email:a.email||'',url:o.url||''};
  if(o.image&&o.image.contentUrl)it.image={url:o.image.contentUrl,alt:strip(o.image.caption||o.image.name||''),credit:o.image.copyrightNotice||'',licence:''};
  if(type==='event'){const sc=Array.isArray(o.eventSchedule)&&o.eventSchedule.length?o.eventSchedule:[o],cut=(s,a,b)=>typeof s==='string'?s.slice(a,b):'';
    it.schedule=sc.map(s=>Object.assign(newSched(),{startDate:cut(s.startDate,0,10),endDate:cut(s.endDate,0,10),startTime:s.startTime?cut(s.startTime,0,5):cut(s.startDate,11,16),endTime:s.endTime?cut(s.endTime,0,5):cut(s.endDate,11,16)}));
    it.location=strip(o.location&&o.location.name||'')}
  if(type==='tour'){const g=o.geoShape;const co=g&&(g.type==='LineString'?g.coordinates:g.type==='MultiLineString'?g.coordinates.flat():null);if(Array.isArray(co))it.track=co.filter(c=>Array.isArray(c)).map(c=>({x:+c[0],y:+c[1],z:c[2]!=null?+c[2]:null,s:c[2]!=null?'import':undefined}));
    it.computed=tourStats(it);delete it.computed.profile}
  if(type==='webcam'){it.cam.contentUrl=o.contentUrl||'';it.cam.embedUrl=o.embedUrl||''}
  return it}

/* ===================== Filter & Übersicht ===================== */
function filtered(){const q=S.q.trim().toLowerCase();return S.items.filter(it=>(!S.types.size||S.types.has(it.type))&&(!S.status||it.status===S.status)&&(!q||[nm(it),it.name.it,it.name.en,it.address.city,it.address.street,it.description.de,it.short.de,typeLabel(it),it.location,it.organizer].join(' ').toLowerCase().includes(q)))}
function info(it){if(it.type==='event'){const d=eventDates(it);return d.all.length?`${d.all.length} Termin${d.all.length>1?'e':''}`+(d.next?` · nächster ${fmtD(d.next)}`:' · vergangen'):'keine Termine'}
  if(it.type==='tour'){const c=it.computed||{};return c.length!=null?`${nf(c.length/1000,1)} km`+(c.ascent!=null?` · ↑ ${nf(c.ascent)} m ↓ ${nf(c.descent)} m`:'')+((it.timeOverride??c.time)!=null?` · ${fmtMin(it.timeOverride??c.time)}`:''):'keine Route'}
  if(it.type==='offer')return it.offer.free?'kostenlos':it.offer.price!=null?`${it.offer.currency} ${nf(it.offer.price,2)} ${it.offer.unit||''}`:'';
  if(it.type==='food')return(it.attrs['culinary/CuisineType']||[]).map(id=>ODTA['culinary/CuisineType'][2].find(x=>x[0]===id)?.[1]).slice(0,2).join(', ');
  if(it.type==='webcam')return it.cam.heading!=null?`Blickrichtung ${it.cam.heading}°`:'';return it.geo.ele!=null?`${nf(it.geo.ele)} m ü. M.`:''}
function renderChrome(){const cnt={};S.items.forEach(i=>cnt[i.type]=(cnt[i.type]||0)+1);
  $('#nav').innerHTML=`<h2>Inhalte</h2><button data-act="ftype" data-t="" aria-current="${!S.types.size}">${svg('all')}Alle Inhalte<span class="n">${S.items.length}</span></button>`+
    Object.entries(TYPES).map(([k,t])=>`<button data-act="ftype" data-t="${k}" aria-current="${S.types.size===1&&S.types.has(k)}"><span class="dot" style="--c:var(--c-${k})">${svg(k)}</span>${t.plural}<span class="n">${cnt[k]||0}</span></button>`).join('')+
    `<h2>Daten</h2><button data-act="import">${svg('imp')}Importieren</button><button data-act="export">${svg('exp')}Exportieren</button><h2>System</h2><button data-act="settings">${svg('set')}Kartenserver</button>`;
  $('#stats').innerHTML=`<div class="tot">Total: <span>${S.items.length}</span></div>`+Object.entries(TYPES).map(([k,t])=>`<button class="stat" data-act="ttoggle" data-t="${k}" aria-pressed="${S.types.has(k)}" title="${t.plural} filtern"><span class="dot" style="--c:var(--c-${k})">${svg(k)}</span><span>${t.plural}:</span> <b>${cnt[k]||0}</b></button>`).join('')+
    `<div class="seg" role="group" aria-label="Ansicht"><button data-act="view" data-v="map" aria-pressed="${S.view==='map'}">${svg('map')}<span>Karte</span></button><button data-act="view" data-v="table" aria-pressed="${S.view==='table'}">${svg('tbl')}<span>Tabelle</span></button></div>`;
  $('#newMenu').innerHTML=Object.entries(TYPES).map(([k,t])=>`<button data-act="new" data-t="${k}"><span class="dot" style="--c:var(--c-${k})">${svg(k)}</span>${t.label} erfassen</button>`).join('')}
const EMPTY=`<h3>Noch keine Inhalte erfasst</h3><p>Starte mit «+ Neu erfassen», importiere ein Backup oder discover.swiss-Daten – oder lade Demo-Einträge, um den Hub auszuprobieren.</p><p><button class="btn" data-act="demo">Demo-Einträge laden</button></p>`;
function renderList(){const list=filtered(),[sk,sd]=S.sort,key=it=>sk==='name'?nm(it).toLowerCase():sk==='type'?it.type:sk==='q'?validate(it).score:it.modified;
  list.sort((a,b)=>key(a)<key(b)?-sd:key(a)>key(b)?sd:0);
  $('#fCount').textContent=S.items.length?`${list.length} von ${S.items.length}`:'';
  $('#content').classList.toggle('tbl',S.view==='table');$('#tableWrap').hidden=S.view!=='table';
  const em=$('#emptyMap');em.hidden=!!S.items.length||!!S.draft;em.innerHTML=EMPTY;
  if(S.view==='table'){const th=(k,l)=>`<th aria-sort="${S.sort[0]===k?(S.sort[1]>0?'ascending':'descending'):'none'}"><button data-act="sort" data-k="${k}">${l}${S.sort[0]===k?(S.sort[1]>0?' ↑':' ↓'):''}</button></th>`;
    $('#tableWrap').innerHTML=!S.items.length?`<div class="empty">${EMPTY}</div>`:!list.length?`<div class="empty"><h3>Keine Treffer</h3><p>Suche oder Filter anpassen.</p></div>`:
    `<table class="list"><thead><tr>${th('type','Typ')}${th('name','Name')}<th>Kategorie</th><th>Ort</th><th>Details</th>${th('q','Qualität')}<th>Status</th>${th('modified','Geändert')}</tr></thead><tbody>`+
    list.map(it=>{const v=validate(it);return`<tr data-id="${it.id}" tabindex="0"><td><span class="ty"><span class="dot" style="--c:var(--c-${it.type})">${svg(it.type)}</span>${TYPES[it.type].label}</span></td><td><b>${esc(nm(it))}</b>${it.demo?' <span class="tag demo">Demo</span>':''}${it.source==='discover.swiss'?' <span class="tag">discover.swiss</span>':''}</td><td>${esc(typeLabel(it))}</td><td>${esc(it.address.city||it.location||'')}</td><td>${esc(info(it))}</td><td><span class="qb"><i style="width:${v.score}%"></i></span><span class="num">${v.score}%</span>${v.errs.length?` <span class="tag" title="${esc(v.errs.map(x=>x[1]).join(' '))}">${v.errs.length} offen</span>`:''}</td><td><span class="tag ${it.status==='published'?'pub':''}">${it.status==='published'?'Publiziert':'Entwurf'}</span></td><td class="num">${fmtD(it.modified.slice(0,10))}</td></tr>`}).join('')+'</tbody></table>'}
  syncMap()}
function renderAll(){renderChrome();renderList()}

/* ===================== Karte ===================== */
const M={map:null,ready:false,server:false,markers:[],vx:[],towns:[],hov:null,sat:false};
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('Laden fehlgeschlagen: '+src));document.head.appendChild(s)})}
async function loadLib(k,test){if(test())return;const urls=CFG.mapBase?[CFG.mapBase+CFG.own[k],CFG.cdn[k]]:[CFG.cdn[k]];let err;for(const u of urls){try{await loadScript(u);if(test())return}catch(e){err=e;console.warn(e.message)}}throw err||new Error('Bibliothek fehlt: '+k)}
function cssVar(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim()}
function buildStyle(){const st={version:8,sources:{},layers:[{id:'bg',type:'background',paint:{'background-color':'#e6e9e1'}}]},b=CFG.mapBase;
  if(M.server){st.glyphs=b+CFG.own.glyphs;st.sources.topo={type:'vector',url:'pmtiles://'+b+CFG.own.topo};
    try{st.layers.push(...basemaps.layers('topo',basemaps.namedFlavor('light'),{lang:'de'}))}catch(e){console.warn('Basiskartenstil nicht verfügbar',e)}
    st.sources.sat={type:'raster',url:'pmtiles://'+b+CFG.own.sat,tileSize:256};st.layers.push({id:'sat',type:'raster',source:'sat',layout:{visibility:'none'}});
    st.sources.dem={type:'raster-dem',url:'pmtiles://'+b+CFG.own.dem,encoding:'mapbox',tileSize:256};st.layers.push({id:'hill',type:'hillshade',source:'dem',paint:{'hillshade-exaggeration':0.25}})}
  else{const f=[];for(let x=8.5;x<=10.751;x+=0.25)f.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[x,46],[x,47.25]]}});for(let y=46;y<=47.251;y+=0.25)f.push({type:'Feature',properties:{},geometry:{type:'LineString',coordinates:[[8.5,y],[10.75,y]]}});
    f.push({type:'Feature',properties:{b:1},geometry:{type:'LineString',coordinates:[[GR.w,GR.s],[GR.e,GR.s],[GR.e,GR.n],[GR.w,GR.n],[GR.w,GR.s]]}});
    st.sources.grat={type:'geojson',data:{type:'FeatureCollection',features:f}};
    st.layers.push({id:'grat',type:'line',source:'grat',filter:['!',['has','b']],paint:{'line-color':'#cfd4ca','line-width':1}},{id:'grbox',type:'line',source:'grat',filter:['has','b'],paint:{'line-color':'#9aa39c','line-width':1.5,'line-dasharray':[3,3]}})}
  const E={type:'FeatureCollection',features:[]};st.sources.tours={type:'geojson',data:E};st.sources.draft={type:'geojson',data:E};
  st.layers.push({id:'tours-case',type:'line',source:'tours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':7}},{id:'tours-line',type:'line',source:'tours',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':cssVar('--c-tour')||'#17705c','line-width':3.5}},
    {id:'draft-case',type:'line',source:'draft',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#fff','line-width':8}},{id:'draft-line',type:'line',source:'draft',layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':cssVar('--draw')||'#d9480f','line-width':4}});
  return st}
function mapMsg(t,retry){$('#mapMsg').hidden=!t;$('#mapMsgTxt').textContent=t||'';$('#mapRetry').hidden=!retry}
async function initMap(){mapMsg('Karte wird geladen …');M.ready=false;if(M.map){try{M.map.remove()}catch(e){}M.map=null}M.markers=[];M.vx=[];M.towns=[];M.hov=null;
  try{if(!$('#mlcss')){const l=document.createElement('link');l.id='mlcss';l.rel='stylesheet';l.href=CFG.mapBase?CFG.mapBase+CFG.own.mlcss:CFG.cdn.mlcss;l.onerror=()=>{if(l.href!==CFG.cdn.mlcss)l.href=CFG.cdn.mlcss};document.head.appendChild(l)}
    await loadLib('ml',()=>!!window.maplibregl);M.server=false;
    if(CFG.mapBase){try{const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),6000);const hc=await fetch(CFG.mapBase+CFG.own.topo,{headers:{Range:'bytes=0-1'},signal:ctl.signal});clearTimeout(to);if(!(hc.ok||hc.status===206))throw new Error('Kartenserver liefert '+CFG.own.topo+' nicht (HTTP '+hc.status+')');await loadLib('pm',()=>!!window.pmtiles);await loadLib('bm',()=>!!window.basemaps);if(!M.proto){M.proto=new pmtiles.Protocol();maplibregl.addProtocol('pmtiles',M.proto.tile)}M.server=true;await DEM.init()}catch(e){console.warn(e);M.server=false;toast('Kartenserver nicht erreichbar oder Dateien fehlen – Orientierungsraster wird verwendet.')}}
    const map=M.map=new maplibregl.Map({container:'map',style:buildStyle(),bounds:[[GR.w-.1,GR.s-.05],[GR.e+.1,GR.n+.05]],fitBoundsOptions:{padding:30},attributionControl:false,dragRotate:false,pitchWithRotate:false,maxPitch:0});
    map.touchZoomRotate&&map.touchZoomRotate.disableRotation();
    let tileErr=false;map.on('error',e=>{console.warn('Karte:',e&&e.error&&e.error.message);if(M.server&&!tileErr){tileErr=true;toast('Kartenhintergrund nicht verfügbar – Inhalte werden auf neutralem Hintergrund gezeigt.');setSrv()}});
    map.on('load',()=>{M.ready=true;mapMsg('');if(!M.server)TOWNS.forEach(t=>{const e=document.createElement('div');e.className='town';e.textContent=t[0];M.towns.push(new maplibregl.Marker({element:e,anchor:'left'}).setLngLat([t[1],t[2]]).addTo(map))});syncMap()});
    map.on('click',e=>{if(S.pick){setGeo(e.lngLat.lng,e.lngLat.lat);setMode()}else if(S.drawing&&S.draft&&S.draft.type==='tour'){S.draft.track.push({x:+e.lngLat.lng.toFixed(6),y:+e.lngLat.lat.toFixed(6),z:null});trackChanged()}});
    map.on('click','tours-line',e=>{if(S.pick||S.drawing)return;const id=e.features&&e.features[0]&&e.features[0].properties.id;if(id)openEditor(id)});
    map.on('mouseenter','tours-line',()=>{if(!S.pick&&!S.drawing)map.getCanvas().style.cursor='pointer'});map.on('mouseleave','tours-line',()=>{if(!S.pick&&!S.drawing)map.getCanvas().style.cursor=''});
    map.on('moveend',mapInfo);
    $('#satBtn').hidden=!M.server;setSrv()}
  catch(e){console.warn(e);mapMsg(/webgl/i.test(String(e&&e.message))?'Dieser Browser unterstützt die Kartendarstellung (WebGL) nicht. Die Tabellenansicht und alle Formulare funktionieren weiterhin; Touren lassen sich über die Wegpunkt-Tabelle oder per GPX-Import erfassen.':'Die Karte konnte nicht geladen werden. Die Tabellenansicht und alle Formulare funktionieren weiterhin.',true)}}
function setSrv(){const ok=M.server;$('#srvPill').classList.toggle('ok',ok);$('#srvTxt').textContent=ok?'Kartenserver verbunden'+(DEM.ok?' · Höhenmodell aktiv':''):'Kartenserver nicht verbunden';
  $('#attr').textContent=ok?'© OpenStreetMap · Luftbild: © swisstopo, basemap.at, Provinz Bozen · Gelände: © swisstopo, BEV, INGV':'Orientierungsraster (0.25°) mit genäherten Ortspunkten – Basiskarte folgt mit Kartenserver'}
function mapInfo(){if(!M.ready)return;const b=M.map.getBounds(),list=filtered(),vis=list.filter(it=>{const p=pointOf(it);return p&&b.contains(p)}).length,noGeo=list.filter(it=>!pointOf(it)).length;
  $('#mapInfo').textContent=list.length?`${vis} von ${list.length} sichtbar`+(noGeo?` · ${noGeo} ohne Standort`:''):'Keine Einträge';$('#mapInfo').hidden=!S.items.length}
function mkEl(it,sel){const b=document.createElement('button');b.type='button';b.className='mk'+(sel?' sel':'')+(it.status!=='published'?' draft':'');b.style.setProperty('--c',`var(--c-${it.type})`);b.innerHTML=svg(it.type);b.title=nm(it);b.setAttribute('aria-label',`${nm(it)}, ${TYPES[it.type].label}`);return b}
function syncMap(){if(!M.ready)return;const map=M.map,D=S.draft;M.markers.forEach(m=>m.remove());M.markers=[];
  const list=filtered().filter(it=>!D||it.id!==D.id);
  map.getSource('tours').setData({type:'FeatureCollection',features:list.filter(it=>it.type==='tour'&&it.track.length>1).map(it=>({type:'Feature',properties:{id:it.id},geometry:{type:'LineString',coordinates:it.track.map(p=>[p.x,p.y])}}))});
  list.forEach(it=>{const p=pointOf(it);if(!p)return;const el=mkEl(it);el.addEventListener('click',e=>{e.stopPropagation();if(S.pick||S.drawing)return;openEditor(it.id)});M.markers.push(new maplibregl.Marker({element:el}).setLngLat(p).addTo(map))});
  if(D&&D.type!=='tour'){const p=pointOf(D);if(p){const el=mkEl(D,true);el.addEventListener('click',e=>e.stopPropagation());const m=new maplibregl.Marker({element:el,draggable:true}).setLngLat(p).addTo(map);m.on('dragend',()=>{const l=m.getLngLat();setGeo(l.lng,l.lat,true)});M.markers.push(m)}}
  syncDraft();mapInfo()}
function syncDraft(){if(!M.ready)return;const D=S.draft,tk=D&&D.type==='tour'?D.track:[];
  M.map.getSource('draft').setData({type:'FeatureCollection',features:tk.length>1?[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:tk.map(p=>[p.x,p.y])}}]:[]});
  M.vx.forEach(m=>m.remove());M.vx=[];if(!tk.length)return;
  const idx=tk.length<=150?tk.map((p,i)=>i):[0,tk.length-1];
  idx.forEach(i=>{const el=document.createElement('div');el.className='vx'+(i===0?' a':i===tk.length-1?' z':'');el.title=i===0?'Start':i===tk.length-1?'Ziel':'Punkt '+(i+1);el.addEventListener('click',e=>e.stopPropagation());
    const m=new maplibregl.Marker({element:el,draggable:tk.length<=150}).setLngLat([tk[i].x,tk[i].y]).addTo(M.map);
    m.on('drag',()=>{const l=m.getLngLat();tk[i].x=+l.lng.toFixed(6);tk[i].y=+l.lat.toFixed(6);M.map.getSource('draft').setData({type:'FeatureCollection',features:[{type:'Feature',properties:{},geometry:{type:'LineString',coordinates:tk.map(p=>[p.x,p.y])}}]})});
    m.on('dragend',()=>{tk[i].z=null;delete tk[i].s;trackChanged(true)});M.vx.push(m)})}
function fitTo(coords){if(!M.ready||!coords.length)return;if(coords.length===1){M.map.jumpTo({center:coords[0],zoom:Math.max(M.map.getZoom(),13)});return}
  let w=180,s=90,e=-180,n=-90;coords.forEach(c=>{w=Math.min(w,c[0]);e=Math.max(e,c[0]);s=Math.min(s,c[1]);n=Math.max(n,c[1])});
  const dr=!$('#drawer').hidden&&window.innerWidth>900?500:40;M.map.fitBounds([[w,s],[e,n]],{padding:{top:60,bottom:90,left:40,right:dr},maxZoom:15,animate:!reduced()})}
function setMode(){const pick=S.pick,dr=S.drawing&&S.draft&&S.draft.type==='tour',h=$('#modeHint');h.hidden=!(pick||dr);h.textContent=pick?'In die Karte klicken, um den Standort zu setzen (Esc bricht ab)':'Zeichnen aktiv: Klick setzt den nächsten Routenpunkt · Punkte lassen sich ziehen (Esc beendet)';
  if(M.ready)M.map.getCanvas().style.cursor=pick||dr?'crosshair':'';const b=$('[data-act="draw"]');if(b){b.setAttribute('aria-pressed',String(!!dr));b.textContent=dr?'Zeichnen beenden':'Route zeichnen'}
  if((pick||dr)&&window.innerWidth<=900)$('#drawer').classList.add('min')}
async function setGeo(lon,lat,keepPick){const D=S.draft;if(!D)return;D.geo.lon=+lon.toFixed(6);D.geo.lat=+lat.toFixed(6);if(!keepPick)S.pick=false;S.dirty=true;
  const a=$('[data-k="geo.lat"]'),b=$('[data-k="geo.lon"]');if(a)a.value=D.geo.lat;if(b)b.value=D.geo.lon;syncMap();
  if(DEM.ok){const z=await DEM.at(lon,lat);if(z!=null&&S.draft===D){D.geo.ele=Math.round(z);const c=$('[data-k="geo.ele"]');if(c)c.value=D.geo.ele}}updQual()}

/* ===================== Editor ===================== */
const mlk=k=>k+'.'+S.lang;
const F={
 sec:(t,inner,hint)=>`<fieldset class="sec"><legend>${t}</legend>${hint?`<p class="hint">${hint}</p>`:''}${inner}</fieldset>`,
 g:inner=>`<div class="g">${inner}</div>`,
 inp(k,l,o={}){const v=get(S.draft,k);return`<label class="f ${o.w||''}"><span>${l}${o.req?' <i class="req" aria-hidden="true">*</i>':''}</span><input data-k="${k}" type="${o.type||'text'}" value="${esc(v??'')}" ${o.req?'aria-required="true"':''} ${o.ph?`placeholder="${esc(o.ph)}"`:''} ${o.attr||''} ${o.on?`data-on="${o.on}"`:''} ${o.type==='number'?'inputmode="decimal"':''}></label>`},
 ml(k,l,o={}){return F.inp(mlk(k),l+` <small>(${S.lang.toUpperCase()})</small>`,o)},
 area(k,l,o={}){return`<label class="f"><span>${l} <small>(${S.lang.toUpperCase()})</small></span><textarea data-k="${mlk(k)}" ${o.rows?`rows="${o.rows}"`:''} ${o.ph?`placeholder="${esc(o.ph)}"`:''}>${esc(get(S.draft,mlk(k))??'')}</textarea></label>`},
 sel(k,l,opts,o={}){const v=get(S.draft,k)??'';return`<label class="f ${o.w||''}"><span>${l}</span><select data-k="${k}" ${o.re?'data-re="1"':''} ${o.on?`data-on="${o.on}"`:''} ${o.num?'data-num="1"':''}>${opts.map(x=>`<option value="${esc(x[0])}" ${String(v)===String(x[0])?'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>`},
 chk(k,l,o={}){return`<label class="chk"><input type="checkbox" data-k="${k}" ${get(S.draft,k)?'checked':''} ${o.re?'data-re="1"':''}>${l}</label>`},
 attr(g,l,o={}){const d=ODTA[g],v=S.draft.attrs[g];if(d[1]==='N')return F.sel('attrs.'+g,l,[['','– nicht gesetzt –'],...d[2]],o);
   return`<div class="lbl" id="l-${g.replace('/','-')}">${l}</div><div class="chips" role="group" aria-labelledby="l-${g.replace('/','-')}">${d[2].map(x=>`<button type="button" class="chip" data-act="chip" data-g="${g}" data-v="${x[0]}" aria-pressed="${(v||[]).includes(x[0])}">${esc(x[1])}</button>`).join('')}</div>`}};
function typeSelect(){const D=S.draft;if(D.type==='poi'){const grp=[['Place','Natur & Orte'],['CivicStructure','Kultur, Anlagen & Infrastruktur'],['LocalBusiness','Freizeit & Dienstleistung']];
    return`<label class="f"><span>Kategorie (discover.swiss Typ)</span><select data-k="additionalType">${grp.map(([c,l])=>`<optgroup label="${l}">${CLS[c].map(x=>`<option value="${c}:${x[0]}" ${D.additionalType===c+':'+x[0]?'selected':''}>${esc(x[1])}</option>`).join('')}</optgroup>`).join('')}</select></label>`}
  return F.sel('additionalType','Kategorie (discover.swiss Typ)',CLS[TYPES[D.type].cls].map(x=>[x[0]==='_'?'':x[0],x[1]]),{re:D.type==='tour',on:D.type==='tour'?'tour':''})}
function secBase(){return F.sec('Basis',F.g(F.ml('name','Name',{req:S.lang==='de'})+typeSelect()+F.ml('short','Kurztext',{ph:'1–2 Sätze für Listen und Karten-Popup (max. ca. 300 Zeichen)',attr:'maxlength="300"'})+F.area('description','Beschreibung',{rows:5})))}
function secGeo(opt){const D=S.draft;return F.sec('Standort'+(opt?' (optional)':''),`<div class="tools"><button type="button" class="btn sm" data-act="pick">Standort auf Karte setzen</button>${pointOf(D)?'<button type="button" class="btn sm" data-act="showgeo">Auf Karte zeigen</button>':''}</div>`+
  F.g(F.inp('geo.lat','Breite (lat)',{type:'number',w:'t',attr:'step="0.000001" min="45.8" max="47.9"',on:'geo',ph:'46.8499'})+F.inp('geo.lon','Länge (lon)',{type:'number',w:'t',attr:'step="0.000001" min="5.9" max="10.6"',on:'geo',ph:'9.5329'})+F.inp('geo.ele','Höhe m ü. M.',{type:'number',w:'t',attr:'step="1"'})+
  (D.type==='event'?F.inp('location','Veranstaltungsort (Name)',{ph:'z. B. Theater, Dorfplatz'}):'')+F.inp('address.street','Strasse, Nr.')+F.inp('address.zip','PLZ',{w:'t',attr:'inputmode="numeric" maxlength="4"'})+F.inp('address.city','Ort',{w:'q4'})),
  'WGS84. Der Marker lässt sich auf der Karte ziehen.'+(DEM.ok?' Die Höhe wird aus dem Höhenmodell ergänzt.':''))}
function secContact(){return F.sec('Kontakt & Web',F.g(F.inp('contact.url','Website',{type:'url',ph:'https://'})+F.inp('contact.phone','Telefon',{type:'tel',w:'h'})+F.inp('contact.email','E-Mail',{type:'email',w:'h'})))}
function secImage(){return F.sec('Bild',F.g(F.inp('image.url','Bild-URL',{type:'url',ph:'https://'})+F.inp('image.alt','Bildbeschreibung (Alt-Text)',{ph:'Was ist auf dem Bild zu sehen?'})+F.inp('image.credit','Urheber / Copyright',{w:'h'})+F.attr('metadata/CopyrightLicence','Lizenz',{w:'h'})))}
function secHours(){const D=S.draft;return F.sec('Öffnungszeiten',D.hours.map((h,i)=>`<div class="card"><div class="hd"><b>Zeitfenster ${i+1}</b><button type="button" class="btn sm dan" data-act="hdel" data-i="${i}">Entfernen</button></div>
  <div class="chips" role="group" aria-label="Wochentage">${DAYS.map(d=>`<button type="button" class="chip d" data-act="hday" data-i="${i}" data-d="${d[0]}" aria-pressed="${h.days.includes(d[0])}">${d[0]}</button>`).join('')}</div>
  ${F.g(F.inp(`hours.${i}.opens`,'von',{type:'time',w:'h'})+F.inp(`hours.${i}.closes`,'bis',{type:'time',w:'h'}))}</div>`).join('')+
  `<div class="tools"><button type="button" class="btn sm" data-act="hadd">+ Zeitfenster hinzufügen</button></div>`+F.g(F.ml('hoursNote','Hinweis zu Öffnungszeiten',{ph:'z. B. Betriebsferien, saisonale Abweichungen'})))}
function schedSummary(){const d=eventDates(S.draft);return d.all.length?`<b>${d.all.length} Termin${d.all.length>1?'e':''}</b> aus ${S.draft.schedule.filter(s=>s.startDate).length} Spielzeit(en) · erster ${fmtD(d.all[0])} · letzter ${fmtD(d.all[d.all.length-1])}`+(d.next?` · nächster ${fmtD(d.next)}${d.next.slice(10)}`:' · alle Termine liegen in der Vergangenheit'):'Noch keine Termine erfasst.'}
function secSchedule(){const D=S.draft;return F.sec('Spielzeiten / Termine',`<div class="note ok" id="schedSum">${schedSummary()}</div>`+D.schedule.map((s,i)=>{const n=occurrences(s).length;return`<div class="card"><div class="hd"><b>Spielzeit ${i+1}${s.repeat!=='none'&&n?` · ${n} Termine`:''}</b><button type="button" class="btn sm" data-act="sdup" data-i="${i}">Duplizieren</button>${D.schedule.length>1?`<button type="button" class="btn sm dan" data-act="sdel" data-i="${i}">Entfernen</button>`:''}</div>
  ${F.g(F.inp(`schedule.${i}.startDate`,'Datum',{type:'date',w:'h',on:'sched',req:i===0})+(s.repeat==='none'?F.inp(`schedule.${i}.endDate`,'Enddatum (mehrtägig)',{type:'date',w:'h',on:'sched'}):F.inp(`schedule.${i}.until`,'Wiederholen bis',{type:'date',w:'h',on:'sched'}))+
   F.inp(`schedule.${i}.startTime`,'Beginn',{type:'time',w:'h',on:'sched'})+F.inp(`schedule.${i}.endTime`,'Ende',{type:'time',w:'h'})+
   F.sel(`schedule.${i}.repeat`,'Wiederholung',[['none','Einmalig'],['daily','Täglich'],['weekly','Wöchentlich']],{w:'h',re:1})+F.sel(`schedule.${i}.status`,'Status',[['scheduled','Findet statt'],['cancelled','Abgesagt'],['postponed','Verschoben'],['soldout','Ausverkauft']],{w:'h',on:'sched'}))}
  ${s.repeat==='weekly'?`<div class="lbl" style="margin-top:8px">Wochentage</div><div class="chips" role="group" aria-label="Wochentage">${DAYS.map(d=>`<button type="button" class="chip d" data-act="sday" data-i="${i}" data-d="${d[2]}" aria-pressed="${s.byDay.includes(d[2])}">${d[0]}</button>`).join('')}</div>`:''}
  ${F.g(F.inp(`schedule.${i}.note`,'Hinweis zu dieser Spielzeit',{ph:'z. B. Premiere, Zusatzvorstellung, anderer Saal'}))}</div>`}).join('')+
  `<div class="tools"><button type="button" class="btn sm" data-act="sadd">+ Spielzeit hinzufügen</button></div>`,
  'Eine Veranstaltung kann beliebig viele Spielzeiten haben: einzelne Termine, mehrtägige Blöcke oder Serien (täglich / wöchentlich).')}
function secTour(){const D=S.draft,dg=(TOURMAP[D.additionalType||'']||[])[1],r=[['','–'],[1,1],[2,2],[3,3],[4,4],[5,5],[6,6]];
  return F.sec('Route',`<div class="tools"><button type="button" class="btn sm" data-act="draw" aria-pressed="false">Route zeichnen</button><button type="button" class="btn sm" data-act="tundo">Letzten Punkt entfernen</button><button type="button" class="btn sm" data-act="trev">Richtung umkehren</button><button type="button" class="btn sm" data-act="tloop">Zum Start schliessen</button><button type="button" class="btn sm dan" data-act="tclr">Route leeren</button></div>
  <div class="tools"><label class="btn sm fileb">GPX / GeoJSON importieren<input type="file" class="vh" data-file="track" accept=".gpx,.geojson,.json,application/gpx+xml,application/geo+json"></label><button type="button" class="btn sm" data-act="xgeo">GeoJSON exportieren</button><button type="button" class="btn sm" data-act="xgpx">GPX exportieren</button></div>
  <div id="tourStats"></div><div id="wpBox"></div>`,'Die Route wird als GeoJSON-LineString gespeichert (WGS84, [lon, lat, Höhe]). Länge, Höhenmeter, höchster/tiefster Punkt und Dauer werden daraus berechnet.')+
  F.sec('Schwierigkeit & Bewertung',`<div id="fitSug"></div>`+F.g((dg?F.attr('difficulty/'+dg,'Technische Skala (ODTA '+dg+')'):'')+F.attr('difficulty/OverallDifficulty','Gesamtschwierigkeit',{w:'h'})+F.attr('difficulty/FitnessLevel','Kondition',{w:'h'})+
   F.sel('rating.condition','Kondition (1–6)',r,{w:'h',num:1})+F.sel('rating.technique','Technik (1–6)',r,{w:'h',num:1})+F.sel('rating.landscape','Landschaft (1–6)',r,{w:'h',num:1})+F.sel('rating.experience','Erlebnis (1–6)',r,{w:'h',num:1})))+
  F.sec('Saison',F.attr('availability/Month','Beste Monate')+F.attr('logistics/Season','Jahreszeit'))+
  F.sec('Tourenbeschrieb',F.g(F.area('texts.startingPoint','Ausgangspunkt',{rows:2})+F.area('texts.destination','Zielpunkt',{rows:2})+F.area('texts.directions','Wegbeschreibung',{rows:5})+F.area('texts.safety','Sicherheitshinweise',{rows:3})+F.area('texts.equipment','Ausrüstung',{rows:2})+F.area('texts.publicTransport','Anreise mit ÖV',{rows:2})+F.area('texts.parking','Parkieren',{rows:2})+F.area('texts.tip','Tipp',{rows:2})))}
function renderTourStats(){const D=S.draft,box=$('#tourStats');if(!box||!D||D.type!=='tour')return;const c=D.computed||{},n=D.track.length,time=D.timeOverride??c.time,ti=(l,v,calc,x)=>`<div class="tile"><small>${l}</small><b>${v}</b>${calc?'<em>berechnet</em>':x?`<em style="color:var(--warn)">${x}</em>`:''}</div>`;
  let h='';if(n<2)h=`<div class="note">${n?'1 Punkt gesetzt – weiter in die Karte klicken.':'Noch keine Route. «Route zeichnen» wählen und in die Karte klicken, eine GPX-/GeoJSON-Datei importieren oder Wegpunkte unten als Koordinaten erfassen.'}</div>`;
  else{h=`<div class="tiles">${ti('Länge',nf(c.length/1000,2)+' km',1)}${ti('Aufstieg',c.ascent!=null?nf(c.ascent)+' m':'–',c.ascent!=null)}${ti('Abstieg',c.descent!=null?nf(c.descent)+' m':'–',c.descent!=null)}${ti('Tiefster Punkt',c.minAltitude!=null?nf(c.minAltitude)+' m':'–',c.minAltitude!=null)}${ti('Höchster Punkt',c.maxAltitude!=null?nf(c.maxAltitude)+' m':'–',c.maxAltitude!=null)}${ti('Dauer',fmtMin(time),D.timeOverride==null&&c.time!=null,D.timeOverride!=null?'manuell':'')}</div>`;
    h+=c.ascent==null?`<div class="note"><b>Höhendaten fehlen.</b> Länge und Verlauf sind berechnet; für Höhenmeter und Dauer braucht es Höhen. Möglichkeiten: Kartenserver mit Höhenmodell verbinden (automatisch), GPX mit Höhen importieren oder Höhen in der Wegpunkt-Tabelle eintragen (schon Start- und Zielhöhe ergeben eine erste Näherung).</div>`
      :`<div class="prof"><svg id="profSvg" viewBox="0 0 400 120" preserveAspectRatio="none" tabindex="0" role="img" aria-label="Höhenprofil: ${nf(c.minAltitude)} bis ${nf(c.maxAltitude)} m ü. M. auf ${nf(c.length/1000,1)} km. Mit Pfeiltasten abfahren."></svg></div><div class="profinfo" id="profInfo" aria-live="polite">${c.roundTrip?'Rundtour':'Streckentour'} · Höhenquelle: ${esc(c.eleSource||'')}</div>`;
    h+=F.g(`<label class="f h"><span>Dauer überschreiben (Minuten)</span><input type="number" min="0" step="5" data-k="timeOverride" data-on="tourtime" value="${D.timeOverride??''}" placeholder="${c.time??''}"></label><div class="f h"><span>Berechnungsregel</span><div class="hint" style="margin:0">${c.timeRule?esc(c.timeRule)+' · grösserer Anteil + ½ kleinerer Anteil':'Für diesen Tourtyp wird keine Dauer berechnet – bitte manuell erfassen.'}</div></div>`)}
  box.innerHTML=h;drawProfile();
  const fs=$('#fitSug');if(fs){const s=fitnessSuggestion(c),cur=D.attrs['difficulty/FitnessLevel'];fs.innerHTML=s&&c.ascent!=null&&cur!==s?`<div class="note">Vorschlag aus Länge, Höhenmetern und Dauer: <b>${esc(ODTA['difficulty/FitnessLevel'][2].find(x=>x[0]===s)[1])}</b> <button type="button" class="btn sm" data-act="fitapply" data-v="${s}">Übernehmen</button></div>`:''}}
function drawProfile(){const el=$('#profSvg'),c=S.draft&&S.draft.computed;if(!el||!c||!c.profile||!c.profile.length)return;const P=c.profile,len=P[P.length-1].d||1,lo=c.minAltitude,hi=Math.max(c.maxAltitude,lo+20),pad=(hi-lo)*.08,X=d=>d/len*400,Y=z=>112-(z-lo+pad)/(hi-lo+2*pad)*104;
  const line=P.map((p,i)=>(i?'L':'M')+X(p.d).toFixed(1)+' '+Y(p.z).toFixed(1)).join('');
  el.innerHTML=`<path d="${line}L400 120L0 120Z" fill="rgba(23,112,92,.16)"/><path d="${line}" fill="none" stroke="#17705c" stroke-width="2" vector-effect="non-scaling-stroke"/><line id="profCur" x1="0" x2="0" y1="0" y2="120" stroke="#17201d" stroke-width="1" vector-effect="non-scaling-stroke" visibility="hidden"/>`;
  let ci=0;const show=i=>{ci=Math.max(0,Math.min(P.length-1,i));const p=P[ci],cur=$('#profCur');cur.setAttribute('x1',X(p.d));cur.setAttribute('x2',X(p.d));cur.setAttribute('visibility','visible');$('#profInfo').textContent=`km ${nf(p.d/1000,2)} · ${nf(p.z)} m ü. M.`;
    if(M.ready){if(!M.hov){const e=document.createElement('div');e.className='hov';M.hov=new maplibregl.Marker({element:e})}M.hov.setLngLat([p.x,p.y]).addTo(M.map)}};
  const at=e=>{const r=el.getBoundingClientRect(),d=(e.clientX-r.left)/r.width*len;let b=0;for(let i=1;i<P.length;i++)if(Math.abs(P[i].d-d)<Math.abs(P[b].d-d))b=i;show(b)};
  el.onmousemove=at;el.onclick=at;el.onmouseleave=()=>{$('#profCur').setAttribute('visibility','hidden');if(M.hov)M.hov.remove()};
  el.onkeydown=e=>{const st=Math.max(1,Math.round(P.length/40));if(e.key==='ArrowRight'){show(ci+st);e.preventDefault()}if(e.key==='ArrowLeft'){show(ci-st);e.preventDefault()}}}
function renderWp(){const D=S.draft,box=$('#wpBox');if(!box||!D||D.type!=='tour')return;const tk=D.track;
  let h='<details '+(tk.length&&tk.length<=12?'open':'')+'><summary class="lbl" style="cursor:pointer;margin-bottom:8px">Wegpunkte ('+tk.length+') – Koordinaten und Höhen bearbeiten</summary>';
  if(tk.length>150)h+=`<div class="note">Importierter Track mit ${tk.length} Punkten. Einzelpunkte werden ab 150 Punkten nicht mehr einzeln angezeigt. <button type="button" class="btn sm" data-act="tsimp">Stärker vereinfachen (20 m)</button></div>`;
  else if(tk.length)h+=`<div class="wp"><table><thead><tr><th>#</th><th>Breite</th><th>Länge</th><th>Höhe m</th><th><span class="vh">Aktion</span></th></tr></thead><tbody>${tk.map((p,i)=>`<tr><td class="num">${i+1}</td><td><input type="number" step="0.000001" data-wp="${i}" data-f="y" value="${p.y}" aria-label="Breite Punkt ${i+1}"></td><td><input type="number" step="0.000001" data-wp="${i}" data-f="x" value="${p.x}" aria-label="Länge Punkt ${i+1}"></td><td><input type="number" step="1" data-wp="${i}" data-f="z" value="${p.z??''}" placeholder="–" aria-label="Höhe Punkt ${i+1}"></td><td><button type="button" class="x" style="width:28px;height:28px" data-act="wpdel" data-i="${i}" aria-label="Punkt ${i+1} löschen">×</button></td></tr>`).join('')}</tbody></table></div>`;
  h+=`<div class="g" style="align-items:end"><label class="f t"><span>Breite</span><input type="number" step="0.000001" id="wpLat" placeholder="46.5886"></label><label class="f t"><span>Länge</span><input type="number" step="0.000001" id="wpLon" placeholder="9.7767"></label><label class="f t"><span>Höhe m</span><input type="number" step="1" id="wpEle"></label></div><div class="tools" style="margin-top:8px"><button type="button" class="btn sm" data-act="wpadd">Wegpunkt per Koordinaten anfügen</button></div></details>`;
  box.innerHTML=h}
let tourTok=0;
async function recalcTour(){const D=S.draft;if(!D||D.type!=='tour')return;const tok=++tourTok,tk=D.track;D.computed=tourStats(D);renderTourStats();updQual();
  if(!DEM.ok||tk.length<1)return;const miss=tk.filter(p=>p.z==null);for(const p of miss){const z=await DEM.at(p.x,p.y);if(tok!==tourTok)return;if(z!=null){p.z=z;p.s='dem'}}
  let prof=null;if(tk.length>1&&!tk.some(p=>p.s==='import'||p.s==='manual'))prof=await DEM.profile(tk);if(tok!==tourTok||S.draft!==D)return;
  D.computed=tourStats(D,prof);renderTourStats();if(miss.length)renderWp();updQual()}
function trackChanged(keepWp){S.dirty=true;syncDraft();if(!keepWp||true)renderWp();recalcTour()}

function secEventExtra(){return F.sec('Veranstalter & Preise',F.g(F.inp('organizer','Veranstalter')+F.chk('price.free','Eintritt frei',{re:1})+(S.draft.price.free?'':F.inp('price.min','Preis ab',{type:'number',w:'t',attr:'min="0" step="0.5"'})+F.inp('price.max','Preis bis',{type:'number',w:'t',attr:'min="0" step="0.5"'})+F.sel('price.currency','Währung',[['CHF','CHF'],['EUR','EUR']],{w:'t'})+F.inp('price.url','Ticket-Link',{type:'url',ph:'https://'}))))+
  F.sec('Merkmale (ODTA)',F.attr('atmosphere/Format','Format')+F.attr('audience/AgeGroup','Altersgruppen')+F.attr('audience/Lifestyle','Zielgruppen')+F.attr('metadata/InLanguage','Sprache der Veranstaltung')+F.attr('atmosphere/MusicStyle','Musikstil')+F.g(F.attr('atmosphere/Occasion','Anlass')))}
function secPoiExtra(){return F.sec('Merkmale (ODTA)',F.g(F.chk('price.free','Kostenlos zugänglich'))+'<div style="height:10px"></div>'+F.attr('logistics/Season','Saison')+F.attr('logistics/TravelMobility','Erreichbarkeit')+F.attr('audience/Lifestyle','Zielgruppen')+F.attr('logistics/Guidance','Führung')+F.attr('certification/Unesco','UNESCO')+F.attr('access/AcceptedProgram','Akzeptierte Karten')+F.g(F.attr('logistics/WeatherDependency','Wetterabhängigkeit',{w:'h'})+F.attr('certification/Swisstainable','Swisstainable',{w:'h'})))}
function secFoodExtra(){return F.sec('Küche & Angebot',F.attr('culinary/CuisineType','Küche')+F.attr('culinary/MealType','Mahlzeiten')+F.attr('culinary/DietaryOptions','Ernährungsformen')+F.g(F.attr('access/BudgetLevel','Preisniveau',{w:'h'})+F.inp('menuUrl','Link zur Speisekarte',{type:'url',w:'h',ph:'https://'})+F.chk('reservations','Reservation möglich')))+
  F.sec('Zahlung, Auszeichnungen',F.attr('access/PaymentOptions','Zahlungsmittel')+F.attr('access/BookingPolicy','Buchung')+F.g(F.inp('gm','GaultMillau-Punkte (10–20)',{type:'number',w:'h',attr:'min="10" max="20"'})+F.inp('michelin','Michelin-Sterne (1–3)',{type:'number',w:'h',attr:'min="1" max="3"'})+F.attr('certification/Swisstainable','Swisstainable')))}
function secOffer(){const D=S.draft,others=S.items.filter(i=>i.id!==D.id&&i.type!=='offer');return F.sec('Preis & Gültigkeit',F.g(F.chk('offer.free','Kostenloses Angebot',{re:1})+(D.offer.free?'':F.inp('offer.price','Preis',{type:'number',w:'t',attr:'min="0" step="0.05"',req:1})+F.sel('offer.currency','Währung',[['CHF','CHF'],['EUR','EUR']],{w:'t'})+F.sel('offer.unit','Einheit',[['pro Person','pro Person'],['pro Gruppe','pro Gruppe'],['pro Tag','pro Tag'],['pro Nacht','pro Nacht'],['pauschal','pauschal']],{w:'t'}))+
   F.inp('offer.validFrom','Gültig ab',{type:'date',w:'h'})+F.inp('offer.validThrough','Gültig bis',{type:'date',w:'h'})+F.inp('offer.provider','Anbieter')+F.inp('offer.bookingUrl','Buchungslink',{type:'url',ph:'https://'})+F.area('offer.includes','Inbegriffene Leistungen',{rows:3,ph:'Eine Leistung pro Zeile'})))+
  F.sec('Verknüpfte Inhalte',others.length?`<div class="rel">${others.map(o=>`<label><input type="checkbox" data-rel="${o.id}" ${D.related.includes(o.id)?'checked':''}><span class="dot" style="--c:var(--c-${o.type})">${svg(o.type)}</span>${esc(nm(o))}</label>`).join('')}</div>`:'<p class="hint">Noch keine anderen Einträge vorhanden.</p>','Ausflugsziele, Touren, Restaurants oder Veranstaltungen, die Teil des Angebots sind.')+
  F.sec('Merkmale (ODTA)',F.attr('access/BookingPolicy','Buchung')+F.attr('access/PaymentOptions','Zahlungsmittel')+F.attr('audience/Lifestyle','Zielgruppen')+F.attr('logistics/Season','Saison'))}
function secWebcam(){const c=S.draft.cam;return F.sec('Webcam',F.g(F.inp('cam.contentUrl','Bild-URL (Standbild)',{type:'url',ph:'https://…/aktuell.jpg'})+F.inp('cam.embedUrl','Stream- / Einbettungs-URL',{type:'url',ph:'https://'})+F.inp('cam.refresh','Aktualisierung (Sekunden)',{type:'number',w:'h',attr:'min="1"'})+F.inp('cam.heading','Blickrichtung (0–359°, 0 = Nord)',{type:'number',w:'h',attr:'min="0" max="359"'})+F.inp('cam.provider','Betreiber / Quelle'))+
  `<div class="camprev" id="camPrev" style="margin-top:10px">${c.contentUrl&&isUrl(c.contentUrl)?'Vorschau wird aus Datenschutzgründen erst auf Klick vom Anbieter geladen.<br><button type="button" class="btn sm" data-act="camload" style="margin-top:6px">Vorschau laden</button>':'Bild-URL erfassen, um eine Vorschau laden zu können.'}</div>`)}
function renderEditor(keep){const D=S.draft,ed=$('#ed');if(!D)return;const st=keep?ed.scrollTop:0,T=TYPES[D.type];
  $('#dIcon').innerHTML=`<span class="dot" style="--c:var(--c-${D.type});width:26px;height:26px">${svg(D.type)}</span>`;$('#dTitle').textContent=T.label+(S.isNew?' erfassen':' bearbeiten');
  $('#langs').innerHTML=LANGS.map(l=>`<button type="button" data-act="lang" data-l="${l}" aria-pressed="${S.lang===l}" title="Texte in ${l.toUpperCase()} erfassen">${l}${D.name[l]?'':'<span aria-hidden="true">·</span>'}</button>`).join('');
  $('#delBtn').hidden=S.isNew;
  let h=`<div id="edErr"></div>`+(D.demo?'<div class="note">Demo-Eintrag: Koordinaten und Angaben sind genähert bzw. fiktiv und dienen nur zur Veranschaulichung. Demo-Einträge werden nicht in der Datenbank gespeichert.</div>':'')+secBase();
  if(D.type==='event')h+=secSchedule()+secGeo()+secEventExtra()+secContact()+secImage();
  if(D.type==='poi')h+=secGeo()+secHours()+secPoiExtra()+secContact()+secImage();
  if(D.type==='food')h+=secGeo()+secHours()+secFoodExtra()+secContact()+secImage();
  if(D.type==='tour')h+=secTour()+secContact()+secImage();
  if(D.type==='offer')h+=secOffer()+secGeo(true)+secContact()+secImage();
  if(D.type==='webcam')h+=secWebcam()+secGeo();
  h+=F.sec('Publikation',F.g(F.sel('status','Status',[['draft','Entwurf'],['published','Publiziert']],{w:'h'})+`<div class="f h"><span>ID</span><div class="num" style="padding:8px 0">${esc(D.id)}</div></div>`)+`<details><summary class="lbl" style="cursor:pointer">Vorschau discover.swiss-Datensatz (JSON)</summary><div class="tools" style="margin-top:8px"><button type="button" class="btn sm" data-act="jsonprev">Aktualisieren</button></div><textarea class="code" id="jsonPrev" readonly style="width:100%;height:200px;font:12px var(--mono)" aria-label="JSON-Vorschau"></textarea></details>`);
  ed.innerHTML=h;ed.scrollTop=st;if(D.type==='tour'){renderTourStats();renderWp()}showErrs();updQual();setMode()}
function updQual(){const D=S.draft;if(!D)return;const v=validate(D),miss=v.rec.filter(r=>!r[1]).map(r=>r[0]);$('#dQual').innerHTML=`<span class="qb"><i style="width:${v.score}%"></i></span>Qualität ${v.score}%`;$('#dQual').title=miss.length?'Noch offen: '+miss.join(', '):'Alle empfohlenen Angaben erfasst'}
function showErrs(){const box=$('#edErr');if(!box)return;$$('#ed [aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));if(!S.errs.length){box.innerHTML='';return}
  box.innerHTML=`<div class="note err" role="alert"><b>Bitte prüfen:</b><ul>${S.errs.map(e=>`<li>${esc(e[1])}</li>`).join('')}</ul></div>`;
  S.errs.forEach(e=>{const k=e[0]==='name.de'&&S.lang!=='de'?null:e[0],el=k&&$(`#ed [data-k="${k}"]`);if(el)el.setAttribute('aria-invalid','true')})}
function openEditor(idOrItem,isNew){if(S.draft&&S.dirty&&!(typeof idOrItem==='string'&&idOrItem===S.draft.id)){toast('Ungespeicherte Änderungen – bitte zuerst speichern oder verwerfen.');return}
  const src=typeof idOrItem==='string'?S.items.find(i=>i.id===idOrItem):idOrItem;if(!src)return;S.draft=clone(src);S.isNew=!!isNew;S.dirty=!!isNew;S.errs=[];S.pick=false;S.drawing=false;S.lang='de';
  if(S.draft.type==='tour'){S.draft.computed=tourStats(S.draft)}
  $('#drawer').hidden=false;$('#drawer').classList.remove('min');renderEditor();renderList();
  if(S.draft.type==='tour'){if(S.draft.track.length)fitTo(S.draft.track.map(p=>[p.x,p.y]));recalcTour()}else{const p=pointOf(S.draft);if(p&&!isNew)fitTo([p])}
  const f=$('#ed input');if(f&&isNew)f.focus()}
function closeEditor(){S.draft=null;S.dirty=false;S.pick=false;S.drawing=false;S.errs=[];$('#drawer').hidden=true;if(M.hov)M.hov.remove();setMode();renderAll()}
async function save(){const D=S.draft;if(!D)return;const v=validate(D),nameErr=v.errs.find(e=>e[0]==='name.de');
  if(nameErr||D.status==='published'&&v.errs.length){S.errs=nameErr&&D.status!=='published'?[nameErr]:v.errs;if(S.lang!=='de'&&nameErr){S.lang='de';renderEditor(true)}showErrs();$('#ed').scrollTop=0;toast(D.status==='published'?'Publizieren nicht möglich – Pflichtangaben fehlen. Als Entwurf speichern oder ergänzen.':'Name fehlt.');return}
  D.modified=new Date().toISOString();const c=clone(D);if(c.computed)delete c.computed.profile;const i=S.items.findIndex(x=>x.id===D.id);if(i>=0)S.items[i]=c;else S.items.push(c);
  S.isNew=false;S.dirty=false;S.errs=v.errs;renderEditor(true);renderAll();const ok=await persist([c]);if(ok)toast(v.errs.length?`Als Entwurf gespeichert – ${v.errs.length} Pflichtangabe(n) noch offen.`:'In der Datenbank gespeichert.')}

/* ===================== Dialoge ===================== */
function dialog(title,body){const host=$('#dlgHost');host.innerHTML=`<div class="ov" data-act="ovclose"><div class="dlg" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button class="x" data-act="dlgclose" aria-label="Schliessen">×</button></header><div class="bd">${body}</div></div></div>`;dialog.ret=document.activeElement;const f=$('.dlg input,.dlg textarea,.dlg button.btn',host);(f||$('.dlg .x',host)).focus()}
function closeDialog(){$('#dlgHost').innerHTML='';if(dialog.ret&&dialog.ret.focus)try{dialog.ret.focus()}catch(e){}}
let expMode='ds';
function exportText(){const list=S.items;if(expMode==='hub')return JSON.stringify({hub:'gr-contenthub',version:1,exported:new Date().toISOString(),items:list},null,1);
  if(expMode==='geo')return JSON.stringify({type:'FeatureCollection',features:list.flatMap(toFeatures)},null,1);
  return JSON.stringify({data:list.map(toDS)},null,1)}
function exportDialog(){const tabs=[['ds','discover.swiss-Schema (JSON)'],['geo','GeoJSON für <gr-map>'],['hub','Hub-Backup']];
  dialog('Exportieren',`<div class="tabs">${tabs.map(t=>`<button class="btn sm" data-act="exptab" data-m="${t[0]}" aria-pressed="${expMode===t[0]}">${esc(t[1])}</button>`).join('')}</div><p class="hint">${{ds:'Alle Einträge im Feldschema des discover.swiss Infocenters (Typ/AdditionalType, mehrsprachige Texte, eventSchedule, Tour-Kennzahlen, ODTA-Merkmale als additionalProperty).',geo:'FeatureCollection gemäss Datenvertrag der Kartenkomponente (title, markerType, Routen mit lengthKm/ascentM/descentM).',hub:'Vollständige Sicherung zum späteren Wiedereinlesen.'}[expMode]}</p><textarea class="code" id="expTxt" readonly aria-label="Exportdaten">${esc(exportText())}</textarea><div class="tools" style="margin-top:10px"><button class="btn pri" data-act="expdl">Datei herunterladen</button><button class="btn" data-act="expcopy">In Zwischenablage kopieren</button></div>`)}
function importDialog(){dialog('Importieren',`<p class="hint">Hub-Backup oder eine Antwort des discover.swiss Infocenters (<code>{"data":[…]}</code> bzw. ein einzelner Datensatz) einlesen. Importierte discover.swiss-Daten werden als Entwurf angelegt.</p><div class="tools"><label class="btn fileb">Datei wählen<input type="file" class="vh" data-file="import" accept=".json,application/json"></label></div><label class="f"><span>oder JSON einfügen</span><textarea class="code" id="impTxt" spellcheck="false"></textarea></label><div class="tools" style="margin-top:10px"><button class="btn pri" data-act="impgo">Importieren</button></div><div id="impMsg" aria-live="polite"></div>`)}
async function doImport(text){const msg=$('#impMsg');try{const j=JSON.parse(text);let add=[],skipped=0;
    if(j&&j.hub==='gr-contenthub'&&Array.isArray(j.items))add=j.items.map(it=>Object.assign(newItem(it.type),it));
    else{const arr=Array.isArray(j)?j:Array.isArray(j.data)?j.data:[j];arr.forEach(o=>{const it=o&&fromDS(o);if(it&&nm(it)!=='(ohne Namen)')add.push(it);else skipped++})}
    if(!add.length)throw new Error('Keine importierbaren Datensätze gefunden.');
    let upd=0;add.forEach(it=>{const i=S.items.findIndex(x=>x.id===it.id||it.sourceId&&x.sourceId===it.sourceId);if(i>=0){it.id=S.items[i].id;S.items[i]=it;upd++}else S.items.push(it)});
    closeDialog();renderAll();fitAll();const ok=await persist(add,'Import');toast(`${add.length-upd} neu, ${upd} aktualisiert`+(skipped?`, ${skipped} übersprungen (Typ nicht unterstützt)`:'')+(ok?' – in der Datenbank gespeichert.':'.'))}
  catch(e){if(msg)msg.innerHTML=`<div class="note err" role="alert">Import fehlgeschlagen: ${esc(e.message)}</div>`}}
function settingsDialog(){dialog('Kartenserver',`<p class="hint">Basis-URL des eigenen Kartenservers (PMTiles: Topokarte, Luftbild, Höhenmodell). Ist er verbunden, erscheint die Basiskarte, und Höhen werden beim Zeichnen automatisch aus dem Höhenmodell gelesen. Ist der Server nicht erreichbar oder fehlen die Dateien, zeigt der Hub ein Orientierungsraster. Hinweis: Eine https-Seite (GitHub Pages) darf keinen http-Server laden – dafür braucht der Server ein Zertifikat.</p><label class="f"><span>Kartenserver-URL</span><input id="setMap" type="url" placeholder="https://map.example.ch" value="${esc(CFG.mapBase)}"></label><p class="hint" style="margin-top:10px">Erwartete Pfade: <code>${esc(Object.values(CFG.own).join(' · '))}</code></p><div class="tools"><button class="btn pri" data-act="setsave">Übernehmen und Karte neu laden</button></div><div id="setMsg" aria-live="polite"></div>`)}
function fitAll(){const c=filtered().flatMap(it=>it.type==='tour'?it.track.map(p=>[p.x,p.y]):pointOf(it)?[pointOf(it)]:[]);if(c.length>1)fitTo(c)}

/* ===================== Supabase (REST, ohne Fremdbibliothek) =====================
   Tabelle public.items (id, type, status, name, data jsonb). RLS: Angemeldete lesen/schreiben alles,
   anonym nur publizierte Einträge lesen. Der publishable Key ist öffentlich vorgesehen. */
const DB={sess:null,online:false,
  load(){try{const s=JSON.parse(localStorage.getItem('gr-hub-sess')||'null');if(s&&s.access_token)this.sess=s}catch(e){}},
  keep(){try{this.sess?localStorage.setItem('gr-hub-sess',JSON.stringify(this.sess)):localStorage.removeItem('gr-hub-sess')}catch(e){}},
  async auth(path,body){const r=await fetch(CFG.sb.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:CFG.sb.key,'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error_description||j.msg||j.message||('Anmeldung fehlgeschlagen ('+r.status+')'));return j},
  async login(email,pw){const j=await this.auth('token?grant_type=password',{email,password:pw});this.sess={access_token:j.access_token,refresh_token:j.refresh_token,email:j.user&&j.user.email||email,exp:Date.now()+(j.expires_in||3600)*1000};this.keep()},
  async refresh(){if(!this.sess||!this.sess.refresh_token)throw new Error('Sitzung abgelaufen');const j=await this.auth('token?grant_type=refresh_token',{refresh_token:this.sess.refresh_token});this.sess={access_token:j.access_token,refresh_token:j.refresh_token,email:this.sess.email,exp:Date.now()+(j.expires_in||3600)*1000};this.keep()},
  logout(){this.sess=null;this.keep()},
  async req(path,o={}){if(this.sess&&this.sess.exp-Date.now()<60000){try{await this.refresh()}catch(e){this.logout();userUI();throw new Error('Sitzung abgelaufen – bitte erneut anmelden.')}}
    const go=()=>fetch(CFG.sb.url+'/rest/v1/'+path,{method:o.method||'GET',headers:Object.assign({apikey:CFG.sb.key,Authorization:'Bearer '+(this.sess?this.sess.access_token:CFG.sb.key),'Content-Type':'application/json'},o.headers||{}),body:o.body});
    let r=await go();if(r.status===401&&this.sess){try{await this.refresh();r=await go()}catch(e){this.logout();userUI();throw new Error('Sitzung abgelaufen – bitte erneut anmelden.')}}
    if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.message||('Datenbankfehler '+r.status))}
    return r.status===204?null:r.json().catch(()=>null)},
  row(it){const c=clone(it);if(c.computed)delete c.computed.profile;return{id:it.id,type:it.type,status:it.status,name:nm(it),data:c,updated_at:it.modified||new Date().toISOString()}},
  async fetchAll(){const out=[];for(let off=0;off<20000;off+=1000){const rows=await this.req('items?select=data&order=updated_at.desc&limit=1000&offset='+off);out.push(...rows.map(r=>r.data));if(rows.length<1000)break}return out},
  async upsert(items){const rows=items.filter(i=>!i.demo).map(i=>this.row(i));if(!rows.length)return;
    for(let i=0;i<rows.length;i+=100)await this.req('items?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(rows.slice(i,i+100))})},
  async remove(id){await this.req('items?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{Prefer:'return=minimal'}})}};
function userUI(){const p=$('#userPill');p.classList.toggle('ok',!!DB.sess);$('#userTxt').textContent=DB.sess?DB.sess.email+' · Abmelden':'Nicht angemeldet – anmelden'}
async function pull(){try{const rows=await DB.fetchAll(),local=S.items.filter(i=>i.demo);S.items=rows.map(d=>Object.assign(newItem(d.type),d)).concat(local);DB.online=true;renderAll();fitAll()}catch(e){DB.online=false;toast('Daten konnten nicht geladen werden: '+e.message)}}
async function persist(items,what){if(!DB.sess){toast('Nur lokal gespeichert – bitte anmelden, damit die Daten in der Datenbank landen.');return false}
  try{await DB.upsert(items);return true}catch(e){toast((what||'Speichern')+' in der Datenbank fehlgeschlagen: '+e.message);return false}}
function loginDialog(msg){if(DB.sess){DB.logout();userUI();S.items=S.items.filter(i=>i.demo);renderAll();toast('Abgemeldet.');return}
  dialog('Anmelden',`<p class="hint">Der Hub speichert in Supabase. Zugang nur für angelegte Benutzer (Supabase → Authentication → Users).</p><form id="loginForm" class="g" style="gap:12px"><label class="f"><span>E-Mail</span><input id="lgMail" type="email" autocomplete="username" required></label><label class="f"><span>Passwort</span><input id="lgPw" type="password" autocomplete="current-password" required></label><div class="f"><button class="btn pri" type="submit" id="lgGo">Anmelden</button></div></form><div id="lgMsg" aria-live="polite">${msg?`<div class="note err" role="alert">${esc(msg)}</div>`:''}</div>`);
  $('#loginForm').addEventListener('submit',async e=>{e.preventDefault();const b=$('#lgGo');b.disabled=true;b.textContent='Anmelden …';try{await DB.login($('#lgMail').value.trim(),$('#lgPw').value);closeDialog();userUI();await pull();toast('Angemeldet.')}catch(err){b.disabled=false;b.textContent='Anmelden';$('#lgMsg').innerHTML=`<div class="note err" role="alert">${esc(err.message)}</div>`}})}

/* ===================== Demo-Daten (klar gekennzeichnet) ===================== */
function loadDemo(){const mk=(type,o)=>{const it=newItem(type);it.demo=true;const merge=(a,b)=>{for(const k in b){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k])&&a[k]&&typeof a[k]==='object')merge(a[k],b[k]);else a[k]=b[k]}};merge(it,o);return it};
  const y=new Date().getFullYear()+1;
  const a=mk('poi',{name:{de:'Landwasserviadukt'},additionalType:'CivicStructure:Bridge',geo:{lat:46.6809,lon:9.6753},address:{city:'Filisur',zip:'7477'},attrs:{'certification/Unesco':['UnescoWorldCulturalHeritage'],'logistics/Season':['Spring','Summer','Autumn','Winter']}});
  const b=mk('poi',{name:{de:'Bündner Kunstmuseum'},additionalType:'CivicStructure:Museum',geo:{lat:46.8512,lon:9.5343},address:{city:'Chur',zip:'7000'}});
  const c=mk('food',{name:{de:'Demo-Bergrestaurant'},additionalType:'MountainRestaurant',geo:{lat:46.4110,lon:9.9680},address:{city:'Pontresina'},hours:[{days:['Mo','Di','Mi','Do','Fr','Sa','So'],opens:'09:00',closes:'16:30'}],attrs:{'culinary/CuisineType':['SwissCuisine'],'access/BudgetLevel':'PriceModerate'}});
  const d=mk('event',{name:{de:'Demo-Freilichttheater'},additionalType:'TheaterEvent',location:'Altstadt Chur',geo:{lat:46.8480,lon:9.5325},address:{city:'Chur',zip:'7000'},
    schedule:[Object.assign(newSched(),{startDate:`${y}-07-03`,startTime:'20:30',endTime:'22:15',note:'Premiere'}),Object.assign(newSched(),{startDate:`${y}-07-05`,startTime:'20:30',endTime:'22:15',repeat:'weekly',byDay:[3,5,6],until:`${y}-08-01`}),Object.assign(newSched(),{startDate:`${y}-08-02`,startTime:'17:00',endTime:'18:45',note:'Dernière'})]});
  const e=mk('tour',{name:{de:'Demo-Tour Preda – Bergün'},additionalType:'HikingTrail',track:[{x:9.7767,y:46.5886,z:1789,s:'manual'},{x:9.7705,y:46.5962,z:null},{x:9.7618,y:46.6046,z:null},{x:9.7560,y:46.6140,z:null},{x:9.7502,y:46.6232,z:null},{x:9.7465,y:46.6312,z:1367,s:'manual'}]});
  e.computed=tourStats(e);delete e.computed.profile;
  const f=mk('webcam',{name:{de:'Demo-Webcam Arosa'},additionalType:'StaticWebcam',geo:{lat:46.7790,lon:9.6803},address:{city:'Arosa'},cam:{heading:180}});
  const g=mk('offer',{name:{de:'Demo-Package Albula-Erlebnis'},additionalType:'Package',geo:{lat:46.6290,lon:9.7460},address:{city:'Bergün'},offer:{price:89,validFrom:`${y}-06-01`,validThrough:`${y}-10-20`},related:[a.id,e.id]});
  S.items.push(a,b,c,d,e,f,g);renderAll();fitAll();toast('7 Demo-Einträge geladen (Koordinaten genähert, Inhalte teils fiktiv, nicht in der Datenbank).')}

/* ===================== Aktionen ===================== */
const tk=()=>S.draft.track;
const ACT={
 login(){loginDialog()},
 burger(){$('#side').classList.toggle('open')},
 newmenu(){const m=$('#newMenu');m.hidden=!m.hidden;$('#newBtn').setAttribute('aria-expanded',String(!m.hidden));if(!m.hidden)$('button',m).focus()},
 new(b){$('#newMenu').hidden=true;if(S.draft&&S.dirty){toast('Ungespeicherte Änderungen – bitte zuerst speichern oder verwerfen.');return}S.draft=null;if(S.view==='table'&&b.dataset.t==='tour'){S.view='map';renderAll();M.map&&M.map.resize()}openEditor(newItem(b.dataset.t),true)},
 ftype(b){S.types=new Set(b.dataset.t?[b.dataset.t]:[]);$('#side').classList.remove('open');renderAll()},
 ttoggle(b){const t=b.dataset.t;S.types.has(t)?S.types.delete(t):S.types.add(t);renderAll()},
 view(b){S.view=b.dataset.v;renderAll();if(S.view==='map'){if(!M.map)initMap();else setTimeout(()=>M.map.resize(),0)}},
 sort(b){const k=b.dataset.k;S.sort=S.sort[0]===k?[k,-S.sort[1]]:[k,k==='modified'||k==='q'?-1:1];renderList()},
 demo(){loadDemo()},import(){importDialog()},export(){if(!S.items.length){toast('Noch keine Einträge zum Exportieren.');return}exportDialog()},settings(){settingsDialog()},
 dlgclose(){closeDialog()},ovclose(b,e){if(e.target===b)closeDialog()},
 exptab(b){expMode=b.dataset.m;exportDialog()},
 expdl(){dl({ds:'contenthub-discover-swiss.json',geo:'contenthub.geojson',hub:'contenthub-backup.json'}[expMode],exportText(),expMode==='geo'?'application/geo+json':'application/json')},
 expcopy(){const t=$('#expTxt');t.select();(navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>toast('Kopiert.')).catch(()=>toast('Text ist markiert – mit Ctrl/Cmd + C kopieren.'))},
 impgo(){doImport($('#impTxt').value)},
 setsave(){const v=$('#setMap').value.trim().replace(/\/+$/,'');if(v&&!/^https?:\/\/[^\s<>]+$/i.test(v)){$('#setMsg').innerHTML='<div class="note err" role="alert">Bitte eine gültige URL angeben (https://… bzw. http://…).</div>';return}CFG.mapBase=v;const l=$('#mlcss');if(l)l.remove();closeDialog();initMap()},
 mapretry(){initMap()},zin(){M.ready&&M.map.zoomIn({animate:!reduced()})},zout(){M.ready&&M.map.zoomOut({animate:!reduced()})},
 fitgr(){M.ready&&M.map.fitBounds([[GR.w,GR.s],[GR.e,GR.n]],{padding:30,animate:!reduced()})},
 sat(b){if(!M.ready||!M.server)return;M.sat=!M.sat;M.map.setLayoutProperty('sat','visibility',M.sat?'visible':'none');b.setAttribute('aria-pressed',String(M.sat))},
 close(){closeEditor()},save(){save()},min(){$('#drawer').classList.toggle('min')},
 del(){const D=S.draft;if(!D)return;if(!ACT.del.armed){ACT.del.armed=true;$('#delBtn').textContent='Wirklich löschen?';setTimeout(()=>{ACT.del.armed=false;const b=$('#delBtn');if(b)b.textContent='Löschen'},4000);return}ACT.del.armed=false;$('#delBtn').textContent='Löschen';
   const aff=S.items.filter(i=>i.related&&i.related.includes(D.id));S.items=S.items.filter(i=>i.id!==D.id);aff.forEach(i=>{i.related=i.related.filter(r=>r!==D.id)});closeEditor();
   (async()=>{if(!DB.sess){toast('Lokal gelöscht – bitte anmelden, um in der Datenbank zu löschen.');return}try{if(!D.demo)await DB.remove(D.id);if(aff.length)await DB.upsert(aff);toast('Eintrag gelöscht.')}catch(e){toast('Löschen in der Datenbank fehlgeschlagen: '+e.message)}})()},
 lang(b){S.lang=b.dataset.l;renderEditor(true)},
 chip(b){const g=b.dataset.g,a=S.draft.attrs[g]||(S.draft.attrs[g]=[]),v=b.dataset.v,i=a.indexOf(v);i>=0?a.splice(i,1):a.push(v);b.setAttribute('aria-pressed',String(i<0));S.dirty=true;updQual()},
 pick(){if(S.view!=='map'){toast('Bitte zur Kartenansicht wechseln.');return}S.pick=!S.pick;S.drawing=false;setMode()},
 showgeo(){const p=pointOf(S.draft);if(p)fitTo([p])},
 hadd(){S.draft.hours.push({days:['Mo','Di','Mi','Do','Fr'],opens:'09:00',closes:'17:00'});S.dirty=true;renderEditor(true)},
 hdel(b){S.draft.hours.splice(+b.dataset.i,1);S.dirty=true;renderEditor(true)},
 hday(b){const h=S.draft.hours[+b.dataset.i],d=b.dataset.d,i=h.days.indexOf(d);i>=0?h.days.splice(i,1):h.days.push(d);b.setAttribute('aria-pressed',String(i<0));S.dirty=true},
 sadd(){const l=S.draft.schedule[S.draft.schedule.length-1],n=newSched();if(l){n.startTime=l.startTime;n.endTime=l.endTime}S.draft.schedule.push(n);S.dirty=true;renderEditor(true);const e=$(`[data-k="schedule.${S.draft.schedule.length-1}.startDate"]`);if(e)e.focus()},
 sdup(b){S.draft.schedule.splice(+b.dataset.i+1,0,clone(S.draft.schedule[+b.dataset.i]));S.dirty=true;renderEditor(true)},
 sdel(b){S.draft.schedule.splice(+b.dataset.i,1);S.dirty=true;renderEditor(true)},
 sday(b){const s=S.draft.schedule[+b.dataset.i],d=+b.dataset.d,i=s.byDay.indexOf(d);i>=0?s.byDay.splice(i,1):s.byDay.push(d);S.dirty=true;renderEditor(true)},
 draw(){if(S.view!=='map'){toast('Bitte zur Kartenansicht wechseln.');return}if(!M.ready){toast('Karte nicht verfügbar – Wegpunkte bitte als Koordinaten erfassen oder GPX importieren.');return}S.drawing=!S.drawing;S.pick=false;setMode()},
 tundo(){tk().pop();trackChanged()},trev(){tk().reverse();trackChanged()},
 tloop(){const t=tk();if(t.length>2&&hav(t[0],t[t.length-1])>5){t.push({...t[0]});trackChanged()}},
 tclr(b){if(!tk().length)return;if(b.dataset.arm!=='1'){b.dataset.arm='1';b.textContent='Wirklich leeren?';setTimeout(()=>{b.dataset.arm='';b.textContent='Route leeren'},3500);return}b.dataset.arm='';b.textContent='Route leeren';S.draft.track=[];trackChanged()},
 tsimp(){S.draft.track=simplify(tk(),20);trackChanged();toast(`Vereinfacht auf ${tk().length} Punkte.`)},
 wpdel(b){tk().splice(+b.dataset.i,1);trackChanged()},
 wpadd(){const la=parseFloat($('#wpLat').value),lo=parseFloat($('#wpLon').value),ez=$('#wpEle').value;if(!(la>45.8&&la<47.9&&lo>5.9&&lo<10.6)){toast('Koordinaten prüfen: Breite ≈ 45.8–47.8, Länge ≈ 5.9–10.5 (WGS84).');return}tk().push({x:lo,y:la,z:ez===''?null:+ez,s:ez===''?undefined:'manual'});trackChanged();fitTo(tk().map(p=>[p.x,p.y]))},
 xgeo(){const D=S.draft;if(D.track.length<2){toast('Noch keine Route vorhanden.');return}dl((nm(D)||'tour').replace(/[^\wäöüÄÖÜ-]+/g,'_')+'.geojson',JSON.stringify({type:'FeatureCollection',features:toFeatures(D)},null,1),'application/geo+json')},
 xgpx(){const D=S.draft;if(D.track.length<2){toast('Noch keine Route vorhanden.');return}dl((nm(D)||'tour').replace(/[^\wäöüÄÖÜ-]+/g,'_')+'.gpx',toGPX(D),'application/gpx+xml')},
 fitapply(b){S.draft.attrs['difficulty/FitnessLevel']=b.dataset.v;S.dirty=true;renderEditor(true)},
 jsonprev(){$('#jsonPrev').value=JSON.stringify(toDS(S.draft),null,1)},
 camload(){const u=S.draft.cam.contentUrl,box=$('#camPrev');if(!isUrl(u))return;const img=new Image();img.alt='Aktuelles Webcam-Bild: '+nm(S.draft);img.onload=()=>{box.innerHTML='';box.appendChild(img);box.insertAdjacentHTML('beforeend','Bild vom Anbieter geladen.')};img.onerror=()=>{box.textContent='Bild konnte nicht geladen werden (URL prüfen; in dieser Vorschau sind externe Bilder ggf. blockiert).'};box.textContent='Lädt …';img.src=u}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!e.target.closest('.menuwrap'))$('#newMenu').hidden=true;
  if(b){const f=ACT[b.dataset.act];if(f)f(b,e);return}const tr=e.target.closest('tr[data-id]');if(tr)openEditor(tr.dataset.id)});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches&&e.target.matches('tr[data-id]'))openEditor(e.target.dataset.id);
  if(e.key==='Escape'){if($('#dlgHost').firstChild)closeDialog();else if(!$('#newMenu').hidden){$('#newMenu').hidden=true;$('#newBtn').focus()}else if(S.pick||S.drawing){S.pick=false;S.drawing=false;setMode()}else if(S.draft&&!S.dirty)closeEditor()}});
const HOOK={geo(){syncMap()},sched(){const s=$('#schedSum');if(s)s.innerHTML=schedSummary()},tour(){recalcTour()},tourtime(){const D=S.draft;if(D.timeOverride!=null&&D.timeOverride<=0)D.timeOverride=null}};
$('#ed').addEventListener('input',e=>{const t=e.target,k=t.dataset.k;if(!k||!S.draft)return;let v=t.type==='checkbox'?t.checked:t.value;if(t.type==='number'||t.dataset.num)v=v===''?null:Number(v);set(S.draft,k,v);S.dirty=true;
  if(t.dataset.on&&t.tagName!=='SELECT'&&HOOK[t.dataset.on])HOOK[t.dataset.on]();if(S.errs.length&&t.hasAttribute('aria-invalid'))t.removeAttribute('aria-invalid');updQual()});
$('#ed').addEventListener('change',e=>{const t=e.target;if(!S.draft)return;
  if(t.dataset.wp!=null){const p=tk()[+t.dataset.wp],f=t.dataset.f,v=t.value===''?null:Number(t.value);if(f==='z'){p.z=v;if(v==null)delete p.s;else p.s='manual'}else if(v!=null&&isFinite(v)){p[f]=v;p.z=p.s==='manual'?p.z:null}S.dirty=true;syncDraft();recalcTour();return}
  if(t.dataset.rel){const r=S.draft.related,i=r.indexOf(t.dataset.rel);t.checked?i<0&&r.push(t.dataset.rel):i>=0&&r.splice(i,1);S.dirty=true;updQual();return}
  if(t.dataset.file==='track'){const f=t.files&&t.files[0];if(!f)return;f.text().then(txt=>{const pts=parseTrack(txt),n0=pts.length;S.draft.track=simplify(pts,5);S.drawing=false;trackChanged();setMode();fitTo(tk().map(p=>[p.x,p.y]));toast(`Track importiert: ${n0} Punkte, vereinfacht auf ${tk().length} (Toleranz 5 m).`)}).catch(err=>toast('Import fehlgeschlagen: '+err.message));t.value='';return}
  if(t.dataset.k&&t.tagName==='SELECT'&&t.dataset.on&&HOOK[t.dataset.on])HOOK[t.dataset.on]();
  if(t.dataset.k==='cam.contentUrl'||t.dataset.re)renderEditor(true)});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.file==='import'){const f=t.files&&t.files[0];if(f)f.text().then(doImport)}});
$('#q').addEventListener('input',e=>{S.q=e.target.value;renderList()});
$('#fStatus').addEventListener('change',e=>{S.status=e.target.value;renderList()});
window.addEventListener('online',()=>{if(!M.ready)initMap()});

DB.load();userUI();renderAll();initMap();
if(DB.sess)pull().then(()=>{if(!DB.online&&!DB.sess)loginDialog()});else loginDialog('Bitte anmelden, um Inhalte zu laden und zu speichern.');
