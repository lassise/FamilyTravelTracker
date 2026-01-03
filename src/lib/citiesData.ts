// Expanded cities database for each country - includes major cities, tourist destinations, and popular towns
// This list covers popular travel destinations worldwide

const citiesByCountry: Record<string, string[]> = {
  US: [
    "New York City", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
    "Fort Worth", "Columbus", "San Francisco", "Charlotte", "Indianapolis", "Seattle",
    "Denver", "Washington D.C.", "Boston", "Nashville", "Baltimore", "Oklahoma City",
    "Louisville", "Portland", "Las Vegas", "Milwaukee", "Albuquerque", "Tucson",
    "Fresno", "Sacramento", "Mesa", "Kansas City", "Atlanta", "Miami", "Omaha",
    "Raleigh", "Minneapolis", "Cleveland", "New Orleans", "Honolulu", "Orlando",
    "Tampa", "Pittsburgh", "Cincinnati", "St. Louis", "Detroit", "Buffalo", "Salt Lake City",
    "Anchorage", "Sedona", "Santa Fe", "Savannah", "Charleston", "Key West", "Maui",
    "Aspen", "Park City", "Napa Valley", "Palm Springs", "Scottsdale", "Branson",
    "Myrtle Beach", "Virginia Beach", "Ocean City", "Lake Tahoe", "Yellowstone",
    "Grand Canyon Village", "Moab", "Jackson Hole", "Telluride", "Carmel-by-the-Sea",
    "Monterey", "Santa Barbara", "San Luis Obispo", "Paso Robles", "Solvang",
    "Newport Beach", "Laguna Beach", "Huntington Beach", "Long Beach", "Pasadena",
    "Palm Desert", "Joshua Tree", "Big Sur", "Yosemite Valley", "Mammoth Lakes",
    "Lake Placid", "Cape Cod", "Martha's Vineyard", "Nantucket", "Bar Harbor",
    "Newport", "Providence", "Burlington", "Portland (Maine)", "Kennebunkport"
  ],
  GB: [
    "London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Bristol",
    "Edinburgh", "Leeds", "Sheffield", "Newcastle", "Nottingham", "Southampton",
    "Brighton", "Oxford", "Cambridge", "York", "Bath", "Cardiff", "Belfast",
    "Stratford-upon-Avon", "Canterbury", "Windsor", "Salisbury", "Chester",
    "Durham", "St Andrews", "Inverness", "Aberdeen", "Fort William", "Stirling",
    "Lake District", "Cotswolds", "Peak District", "Cornwall", "Devon", "Bournemouth",
    "Blackpool", "Scarborough", "Whitby", "Harrogate", "St Ives", "Torquay",
    "Plymouth", "Exeter", "Worcester", "Warwick", "Coventry", "Leicester",
    "Norwich", "Ipswich", "Lincoln", "Hull", "Swansea", "Snowdonia"
  ],
  FR: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg",
    "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Saint-Étienne",
    "Le Havre", "Grenoble", "Dijon", "Cannes", "Avignon", "Aix-en-Provence",
    "Saint-Tropez", "Monaco", "Menton", "Antibes", "Biarritz", "Bayonne",
    "Carcassonne", "Arles", "Nîmes", "Perpignan", "Toulouse", "Lourdes",
    "Chamonix", "Annecy", "Colmar", "Rouen", "Tours", "Amboise", "Blois",
    "Orléans", "Chartres", "Giverny", "Versailles", "Fontainebleau", "Honfleur",
    "Deauville", "Étretat", "Mont Saint-Michel", "Saint-Malo", "Quimper", "Carnac",
    "La Rochelle", "Poitiers", "Limoges", "Clermont-Ferrand", "Vichy"
  ],
  DE: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf",
    "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hanover", "Nuremberg",
    "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Heidelberg",
    "Rothenburg ob der Tauber", "Bamberg", "Würzburg", "Regensburg", "Augsburg",
    "Freiburg", "Baden-Baden", "Konstanz", "Trier", "Koblenz", "Aachen",
    "Münster", "Lübeck", "Rostock", "Potsdam", "Weimar", "Erfurt", "Jena",
    "Garmisch-Partenkirchen", "Oberammergau", "Füssen", "Berchtesgaden",
    "Black Forest", "Rhine Valley", "Mosel Valley", "Bavarian Alps"
  ],
  IT: [
    "Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence",
    "Venice", "Verona", "Catania", "Bari", "Padua", "Trieste", "Brescia", "Parma",
    "Modena", "Pisa", "Siena", "Amalfi", "Positano", "Ravello", "Sorrento",
    "Capri", "Ischia", "Cinque Terre", "Portofino", "San Gimignano", "Lucca",
    "Orvieto", "Assisi", "Perugia", "Spoleto", "Matera", "Lecce", "Gallipoli",
    "Taormina", "Syracuse", "Agrigento", "Cefalù", "Trapani", "Sardinia",
    "Alghero", "Cagliari", "Costa Smeralda", "Lake Como", "Lake Garda", "Lake Maggiore",
    "Bellagio", "Varenna", "Stresa", "Bergamo", "Mantua", "Cremona", "Ferrara",
    "Rimini", "San Marino", "Cortina d'Ampezzo", "Dolomites", "Merano", "Bolzano"
  ],
  ES: [
    "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia",
    "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Granada",
    "Toledo", "San Sebastián", "Salamanca", "Ibiza", "Marbella", "Ronda",
    "Cádiz", "Jerez de la Frontera", "Tarifa", "Gibraltar", "Costa Brava",
    "Sitges", "Girona", "Figueres", "Montserrat", "Tarragona", "Tossa de Mar",
    "Pamplona", "Burgos", "León", "Santiago de Compostela", "A Coruña", "Vigo",
    "Oviedo", "Santander", "San Juan de Gaztelugatxe", "Formentera", "Menorca",
    "Tenerife", "Gran Canaria", "Lanzarote", "Fuerteventura", "La Palma",
    "Costa del Sol", "Nerja", "Frigiliana", "Antequera", "Cuenca", "Segovia", "Ávila"
  ],
  PT: [
    "Lisbon", "Porto", "Amadora", "Braga", "Coimbra", "Funchal", "Setúbal",
    "Almada", "Faro", "Sintra", "Lagos", "Cascais", "Évora", "Óbidos",
    "Nazaré", "Batalha", "Fátima", "Tomar", "Aveiro", "Guimarães", "Viana do Castelo",
    "Ponta Delgada", "Angra do Heroísmo", "Tavira", "Albufeira", "Portimão",
    "Sagres", "Vila Nova de Gaia", "Estoril", "Mafra", "Queluz", "Monsaraz",
    "Marvão", "Belmonte", "Serra da Estrela", "Douro Valley", "Alentejo"
  ],
  NL: [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen",
    "Tilburg", "Almere", "Breda", "Nijmegen", "Haarlem", "Maastricht", "Delft",
    "Leiden", "Gouda", "Alkmaar", "Volendam", "Marken", "Zaanse Schans",
    "Keukenhof", "Giethoorn", "Kinderdijk", "Scheveningen", "Texel", "Valkenburg"
  ],
  BE: [
    "Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur",
    "Leuven", "Mons", "Mechelen", "Hasselt", "Ostend", "Spa", "Dinant",
    "Bastogne", "Tournai", "Ypres", "Waterloo", "Knokke-Heist", "Durbuy"
  ],
  CH: [
    "Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne", "St. Gallen",
    "Lugano", "Winterthur", "Zermatt", "Interlaken", "Grindelwald", "Lauterbrunnen",
    "Mürren", "Wengen", "Montreux", "Vevey", "Locarno", "Ascona", "St. Moritz",
    "Davos", "Verbier", "Crans-Montana", "Arosa", "Saas-Fee", "Appenzell",
    "Stein am Rhein", "Schaffhausen", "Rhine Falls", "Brienz", "Thun", "Spiez"
  ],
  AT: [
    "Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach",
    "Wels", "St. Pölten", "Hallstatt", "Bad Ischl", "St. Wolfgang", "Zell am See",
    "Kitzbühel", "St. Anton", "Lech", "Seefeld", "Mayrhofen", "Bad Gastein",
    "Melk", "Dürnstein", "Krems", "Wachau Valley", "Eisenstadt", "Bregenz"
  ],
  JP: [
    "Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto",
    "Kawasaki", "Saitama", "Hiroshima", "Sendai", "Nara", "Okinawa", "Nikko",
    "Kamakura", "Hakone", "Takayama", "Kanazawa", "Matsumoto", "Nagano",
    "Naoshima", "Miyajima", "Himeji", "Koyasan", "Ise", "Shirakawa-go",
    "Nozawa Onsen", "Niseko", "Furano", "Biei", "Hakodate", "Kagoshima",
    "Kumamoto", "Nagasaki", "Beppu", "Yufuin", "Atami", "Izu", "Shizuoka"
  ],
  CN: [
    "Shanghai", "Beijing", "Shenzhen", "Guangzhou", "Chengdu", "Tianjin", "Xi'an",
    "Hangzhou", "Wuhan", "Chongqing", "Hong Kong", "Suzhou", "Nanjing", "Guilin",
    "Yangshuo", "Lijiang", "Dali", "Kunming", "Zhangjiajie", "Huangshan",
    "Macau", "Harbin", "Qingdao", "Xiamen", "Sanya", "Lhasa", "Dunhuang",
    "Luoyang", "Pingyao", "Datong", "Chongqing", "Jiuzhaigou", "Emeishan"
  ],
  KR: [
    "Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan",
    "Jeju", "Gyeongju", "Jeonju", "Sokcho", "Gangneung", "Andong", "Suncheon",
    "Yeosu", "Tongyeong", "Geoje", "Namhae", "Boseong", "Damyang"
  ],
  TH: [
    "Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Krabi", "Koh Samui", "Hua Hin",
    "Ayutthaya", "Chiang Rai", "Pai", "Koh Phi Phi", "Koh Lanta", "Koh Tao",
    "Koh Phangan", "Railay Beach", "Ao Nang", "Khao Lak", "Kanchanaburi",
    "Sukhothai", "Lopburi", "Mae Hong Son", "Nan", "Khao Sok", "Koh Chang",
    "Trat", "Koh Samet", "Udon Thani", "Nakhon Ratchasima", "Khon Kaen"
  ],
  VN: [
    "Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong", "Can Tho", "Nha Trang",
    "Hue", "Hoi An", "Sa Pa", "Da Lat", "Ha Long Bay", "Ninh Binh", "Phong Nha",
    "Mui Ne", "Phu Quoc", "Cat Ba", "Quy Nhon", "Buon Ma Thuot", "Vinh",
    "Con Dao", "Mekong Delta", "My Son", "Tam Coc", "Mai Chau"
  ],
  ID: [
    "Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Bali",
    "Yogyakarta", "Palembang", "Ubud", "Seminyak", "Kuta", "Sanur", "Canggu",
    "Nusa Dua", "Uluwatu", "Nusa Penida", "Nusa Lembongan", "Gili Islands",
    "Lombok", "Komodo", "Labuan Bajo", "Flores", "Lake Toba", "Sumatra",
    "Raja Ampat", "Sulawesi", "Bunaken", "Toraja", "Borobudur", "Solo"
  ],
  MY: [
    "Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Shah Alam", "Malacca",
    "Kota Kinabalu", "Kuching", "Langkawi", "Cameron Highlands", "Penang Hill",
    "Tioman Island", "Perhentian Islands", "Redang Island", "Sabah", "Sarawak",
    "Taman Negara", "Kinabalu Park", "Semporna", "Sipadan", "Mabul"
  ],
  SG: ["Singapore", "Sentosa Island", "Changi", "Jurong", "Marina Bay"],
  PH: [
    "Manila", "Quezon City", "Davao", "Caloocan", "Cebu City", "Zamboanga",
    "Antipolo", "Boracay", "Palawan", "Baguio", "El Nido", "Coron", "Siargao",
    "Bohol", "Panglao", "Dumaguete", "Siquijor", "Vigan", "Sagada", "Batanes",
    "Puerto Princesa", "Port Barton", "Malapascua", "Apo Island", "Bantayan"
  ],
  IN: [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad",
    "Pune", "Jaipur", "Agra", "Goa", "Varanasi", "Udaipur", "Kerala", "Darjeeling",
    "Jodhpur", "Jaisalmer", "Pushkar", "Rishikesh", "Haridwar", "Amritsar",
    "Shimla", "Manali", "Leh", "Ladakh", "Munnar", "Alleppey", "Kochi", "Hampi",
    "Mysore", "Ooty", "Kodaikanal", "Pondicherry", "Mahabalipuram", "Khajuraho",
    "Orchha", "Bhopal", "Ajanta", "Ellora", "Aurangabad", "Ranthambore"
  ],
  AU: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra",
    "Newcastle", "Hobart", "Darwin", "Cairns", "Alice Springs", "Uluru",
    "Great Barrier Reef", "Byron Bay", "Port Douglas", "Noosa", "Sunshine Coast",
    "Whitsundays", "Fraser Island", "Kangaroo Island", "Barossa Valley",
    "Margaret River", "Broome", "Kakadu", "Blue Mountains", "Hunter Valley",
    "Phillip Island", "Great Ocean Road", "Tasmania", "Launceston", "Cradle Mountain"
  ],
  NZ: [
    "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Dunedin",
    "Queenstown", "Rotorua", "Napier", "Nelson", "Wanaka", "Milford Sound",
    "Fiordland", "Te Anau", "Fox Glacier", "Franz Josef Glacier", "Kaikoura",
    "Abel Tasman", "Tongariro", "Taupo", "Hobbiton", "Waitomo", "Bay of Islands",
    "Coromandel", "Akaroa", "Oamaru", "Stewart Island", "Punakaiki"
  ],
  CA: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg",
    "Quebec City", "Hamilton", "Victoria", "Halifax", "Niagara Falls", "Banff",
    "Jasper", "Lake Louise", "Whistler", "Tofino", "Kelowna", "Kamloops",
    "Prince Edward Island", "St. John's", "Yellowknife", "Whitehorse", "Churchill",
    "Muskoka", "Thousand Islands", "Mont-Tremblant", "Charlottetown"
  ],
  MX: [
    "Mexico City", "Guadalajara", "Monterrey", "Puebla", "Cancún", "Tijuana",
    "León", "Mérida", "Playa del Carmen", "Oaxaca", "San Miguel de Allende",
    "Guanajuato", "Tulum", "Puerto Vallarta", "Los Cabos", "Cabo San Lucas",
    "San José del Cabo", "Cozumel", "Isla Mujeres", "Holbox", "Bacalar",
    "Palenque", "San Cristóbal de las Casas", "Campeche", "Valladolid",
    "Chichén Itzá", "Taxco", "Querétaro", "Morelia", "Sayulita", "Mazatlán"
  ],
  BR: [
    "São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte",
    "Manaus", "Curitiba", "Recife", "Florianópolis", "Iguazu Falls", "Paraty",
    "Búzios", "Ilhabela", "Trancoso", "Porto de Galinhas", "Fernando de Noronha",
    "Jericoacoara", "Lençóis Maranhenses", "Pantanal", "Bonito", "Chapada Diamantina",
    "Ouro Preto", "Olinda", "Porto Alegre", "Gramado", "Campos do Jordão"
  ],
  AR: [
    "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "San Miguel de Tucumán",
    "Mar del Plata", "Salta", "Bariloche", "Ushuaia", "El Calafate", "El Chaltén",
    "Iguazú", "Purmamarca", "Tilcara", "Cafayate", "Villa La Angostura",
    "San Martín de los Andes", "Puerto Madryn", "Península Valdés", "Colonia del Sacramento"
  ],
  CL: [
    "Santiago", "Valparaíso", "Concepción", "Viña del Mar", "La Serena", "Antofagasta",
    "Punta Arenas", "Puerto Varas", "San Pedro de Atacama", "Torres del Paine",
    "Easter Island", "Chiloé", "Puerto Natales", "Pucón", "Valdivia", "Arica",
    "Iquique", "Elqui Valley", "Carretera Austral", "Puerto Montt"
  ],
  CO: [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta", "Bucaramanga",
    "Santa Marta", "Pereira", "Villa de Leyva", "Salento", "Guatapé", "Tayrona",
    "San Andrés", "Providencia", "Leticia", "Barichara", "Mompox", "Popayán",
    "Tatacoa Desert", "Cocora Valley", "Palomino", "Capurganá", "Manizales"
  ],
  PE: [
    "Lima", "Arequipa", "Trujillo", "Cusco", "Chiclayo", "Piura", "Iquitos",
    "Huancayo", "Machu Picchu", "Sacred Valley", "Ollantaytambo", "Pisac",
    "Aguas Calientes", "Puno", "Lake Titicaca", "Uros Islands", "Colca Canyon",
    "Nazca", "Paracas", "Huacachina", "Máncora", "Huaraz", "Chachapoyas",
    "Kuelap", "Puerto Maldonado", "Manu", "Tambopata"
  ],
  CR: [
    "San José", "Limón", "Alajuela", "Heredia", "Cartago", "Monteverde",
    "Manuel Antonio", "La Fortuna", "Arenal", "Tamarindo", "Puerto Viejo",
    "Cahuita", "Tortuguero", "Drake Bay", "Corcovado", "Osa Peninsula",
    "Santa Teresa", "Nosara", "Samara", "Jacó", "Papagayo", "Guanacaste",
    "Rincón de la Vieja", "Tenorio", "Sarapiquí", "Turrialba", "Playa Conchal",
    "Playa Flamingo", "Playa Hermosa", "Montezuma", "Mal País", "Quepos"
  ],
  ZA: [
    "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein",
    "East London", "Stellenbosch", "Kruger National Park", "Garden Route",
    "Franschhoek", "Paarl", "Knysna", "Plettenberg Bay", "Hermanus", "Oudtshoorn",
    "Addo Elephant Park", "Drakensberg", "Pilanesberg", "Sun City", "Hluhluwe",
    "St. Lucia", "Swaziland", "Lesotho", "Robben Island", "Camps Bay"
  ],
  EG: [
    "Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Luxor", "Aswan", "Hurghada",
    "Port Said", "Dahab", "Marsa Alam", "Siwa Oasis", "Abu Simbel", "Edfu",
    "Kom Ombo", "Valley of the Kings", "Karnak", "El Gouna", "Nuweiba", "Taba"
  ],
  MA: [
    "Casablanca", "Marrakech", "Fes", "Tangier", "Agadir", "Rabat", "Meknes",
    "Ouarzazate", "Chefchaouen", "Essaouira", "Aït Benhaddou", "Merzouga",
    "Sahara Desert", "Todra Gorge", "Dades Valley", "High Atlas", "Imlil",
    "Taghazout", "Tétouan", "Moulay Idriss", "Volubilis", "Tafraout"
  ],
  KE: [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Masai Mara", "Lamu",
    "Amboseli", "Tsavo", "Lake Nakuru", "Lake Naivasha", "Samburu", "Diani Beach",
    "Malindi", "Watamu", "Mount Kenya", "Hell's Gate", "Ol Pejeta"
  ],
  TZ: [
    "Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar", "Kilimanjaro",
    "Serengeti", "Ngorongoro", "Tarangire", "Lake Manyara", "Stone Town",
    "Jambiani", "Paje", "Nungwi", "Pemba Island", "Mafia Island", "Selous"
  ],
  AE: [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah",
    "Al Ain", "Palm Jumeirah", "Dubai Marina", "Liwa Oasis", "Hatta"
  ],
  SA: [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Abha",
    "Al Ula", "Neom", "Diriyah", "Al Ahsa", "Taif", "Tabuk"
  ],
  TR: [
    "Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Adana", "Konya",
    "Gaziantep", "Cappadocia", "Ephesus", "Bodrum", "Fethiye", "Marmaris",
    "Pamukkale", "Ölüdeniz", "Kaş", "Kalkan", "Side", "Alanya", "Dalyan",
    "Selçuk", "Kuşadası", "Çeşme", "Alaçatı", "Göreme", "Ürgüp", "Troy",
    "Gallipoli", "Pergamon", "Safranbolu", "Trabzon", "Mardin", "Şanlıurfa"
  ],
  GR: [
    "Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos",
    "Santorini", "Mykonos", "Rhodes", "Corfu", "Crete", "Oia", "Fira",
    "Nafplio", "Delphi", "Meteora", "Olympia", "Zakynthos", "Kefalonia",
    "Naxos", "Paros", "Ios", "Milos", "Hydra", "Aegina", "Skiathos", "Skopelos",
    "Samos", "Kos", "Lefkada", "Parga", "Monemvasia", "Mani", "Chania", "Rethymno"
  ],
  HR: [
    "Zagreb", "Split", "Rijeka", "Dubrovnik", "Osijek", "Zadar", "Pula",
    "Šibenik", "Hvar", "Korčula", "Brač", "Vis", "Rovinj", "Poreč", "Opatija",
    "Trogir", "Makarska", "Bol", "Mljet", "Krka", "Plitvice Lakes", "Istria"
  ],
  CZ: [
    "Prague", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice",
    "Karlovy Vary", "Český Krumlov", "Kutná Hora", "Telč", "Mariánské Lázně",
    "Františkovy Lázně", "Lednice", "Kroměříž", "Litomyšl", "Třeboň"
  ],
  PL: [
    "Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin",
    "Bydgoszcz", "Lublin", "Zakopane", "Malbork", "Toruń", "Sopot", "Gdynia",
    "Wieliczka", "Auschwitz", "Częstochowa", "Białowieża", "Masurian Lakes"
  ],
  HU: [
    "Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr", "Eger",
    "Szentendre", "Visegrád", "Esztergom", "Hollókő", "Tokaj", "Lake Balaton",
    "Tihany", "Hévíz", "Sopron", "Villány"
  ],
  RO: [
    "Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Brașov", "Sibiu",
    "Sighișoara", "Bran", "Sinaia", "Peleș Castle", "Maramureș", "Transfăgărășan",
    "Transylvania", "Bucovina", "Danube Delta", "Biertan", "Viscri"
  ],
  SE: [
    "Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Kiruna",
    "Visby", "Lund", "Helsingborg", "Kalmar", "Åre", "Abisko", "Lapland",
    "Dalarna", "Marstrand", "Ystad", "Sigtuna"
  ],
  NO: [
    "Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Tromsø",
    "Ålesund", "Lofoten", "Geiranger", "Flåm", "Sognefjord", "Hardangerfjord",
    "Preikestolen", "Trolltunga", "Svalbard", "Nordkapp", "Hammerfest",
    "Bodø", "Røros", "Lillehammer", "Kristiansand"
  ],
  DK: [
    "Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers",
    "Helsingør", "Roskilde", "Skagen", "Ribe", "Legoland", "Bornholm", "Fanø"
  ],
  FI: [
    "Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Rovaniemi",
    "Lapland", "Saariselkä", "Levi", "Porvoo", "Savonlinna", "Naantali",
    "Lake District", "Åland Islands", "Kuopio", "Jyväskylä"
  ],
  IE: [
    "Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Killarney",
    "Ring of Kerry", "Cliffs of Moher", "Dingle", "Kilkenny", "Wicklow",
    "Connemara", "Aran Islands", "Blarney", "Kinsale", "Cobh", "Sligo",
    "Westport", "Doolin", "Belfast", "Giant's Causeway"
  ],
  IS: [
    "Reykjavik", "Akureyri", "Keflavík", "Selfoss", "Vik", "Húsavík",
    "Blue Lagoon", "Golden Circle", "Gullfoss", "Geysir", "Thingvellir",
    "Jökulsárlón", "Skógafoss", "Seljalandsfoss", "Snæfellsnes", "Myvatn",
    "Westfjords", "Landmannalaugar", "Höfn"
  ],
  RU: [
    "Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan",
    "Nizhny Novgorod", "Sochi", "Vladivostok", "Kaliningrad", "Golden Ring",
    "Suzdal", "Vladimir", "Sergiev Posad", "Lake Baikal", "Irkutsk"
  ],
  IL: [
    "Jerusalem", "Tel Aviv", "Haifa", "Rishon LeZion", "Petah Tikva", "Eilat",
    "Be'er Sheva", "Nazareth", "Dead Sea", "Masada", "Acre", "Jaffa", "Tiberias",
    "Sea of Galilee", "Caesarea", "Golan Heights", "Negev Desert"
  ],
  JO: [
    "Amman", "Irbid", "Zarqa", "Aqaba", "Petra", "Wadi Rum", "Dead Sea",
    "Jerash", "Madaba", "Mount Nebo", "Ajloun", "Kerak", "Dana"
  ],
  LK: [
    "Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Ella", "Sigiriya",
    "Anuradhapura", "Polonnaruwa", "Dambulla", "Nuwara Eliya", "Adam's Peak",
    "Yala", "Mirissa", "Unawatuna", "Hikkaduwa", "Trincomalee", "Arugam Bay"
  ],
  NP: [
    "Kathmandu", "Pokhara", "Lalitpur", "Bharatpur", "Biratnagar", "Chitwan",
    "Bhaktapur", "Patan", "Lumbini", "Everest Base Camp", "Annapurna",
    "Nagarkot", "Bandipur", "Tansen", "Janakpur"
  ],
  MM: [
    "Yangon", "Mandalay", "Naypyidaw", "Bagan", "Inle Lake", "Ngapali",
    "Kalaw", "Hsipaw", "Mrauk U", "Golden Rock", "Hpa-An"
  ],
  KH: [
    "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang", "Kampot",
    "Angkor Wat", "Koh Rong", "Koh Rong Samloem", "Kep", "Kratie"
  ],
  LA: [
    "Vientiane", "Luang Prabang", "Pakse", "Savannakhet", "Vang Vieng",
    "4000 Islands", "Bolaven Plateau", "Plain of Jars", "Nong Khiaw"
  ],
  CU: [
    "Havana", "Santiago de Cuba", "Camagüey", "Holguín", "Santa Clara", "Trinidad",
    "Varadero", "Viñales", "Cienfuegos", "Baracoa", "Remedios", "Cayo Coco",
    "Cayo Largo", "Playa Girón", "Guardalavaca"
  ],
  JM: [
    "Kingston", "Montego Bay", "Spanish Town", "Portmore", "Ocho Rios", "Negril",
    "Port Antonio", "Blue Mountains", "Treasure Beach", "Falmouth", "Runaway Bay"
  ],
  DO: [
    "Santo Domingo", "Santiago de los Caballeros", "Punta Cana", "La Romana",
    "Puerto Plata", "Samaná", "Las Terrenas", "Bayahibe", "Cabarete", "Jarabacoa",
    "Constanza", "Barahona"
  ],
  PA: [
    "Panama City", "Colón", "David", "Bocas del Toro", "Boquete",
    "San Blas Islands", "Pearl Islands", "Santa Catalina", "El Valle de Antón"
  ],
  EC: [
    "Quito", "Guayaquil", "Cuenca", "Santo Domingo", "Machala", "Galápagos Islands",
    "Baños", "Otavalo", "Montañita", "Mindo", "Cotopaxi", "Quilotoa",
    "Amazon Rainforest", "Puerto López", "Tena"
  ],
  BO: [
    "La Paz", "Santa Cruz", "Cochabamba", "Sucre", "Oruro", "Uyuni",
    "Salar de Uyuni", "Lake Titicaca", "Copacabana", "Potosí", "Rurrenabaque",
    "Death Road", "Tiwanaku"
  ],
  UY: [
    "Montevideo", "Salto", "Ciudad de la Costa", "Paysandú", "Punta del Este",
    "Colonia del Sacramento", "Cabo Polonio", "La Paloma", "Carmelo"
  ],
  PY: [
    "Asunción", "Ciudad del Este", "San Lorenzo", "Luque", "Encarnación",
    "Areguá", "San Bernardino", "Trinidad", "Yguazú"
  ],
  GT: [
    "Guatemala City", "Mixco", "Villa Nueva", "Quetzaltenango", "Antigua Guatemala",
    "Flores", "Tikal", "Lake Atitlán", "Panajachel", "Chichicastenango",
    "Semuc Champey", "Livingston", "Cobán"
  ],
  HN: [
    "Tegucigalpa", "San Pedro Sula", "La Ceiba", "Roatán", "Copán",
    "Utila", "Guanaja", "Tela", "Trujillo", "Comayagua"
  ],
  NI: [
    "Managua", "León", "Masaya", "Matagalpa", "Granada", "San Juan del Sur",
    "Ometepe Island", "Corn Islands", "Estelí", "Bluefields"
  ],
  SV: [
    "San Salvador", "Santa Ana", "San Miguel", "Mejicanos", "Suchitoto",
    "Ruta de las Flores", "El Tunco", "Juayúa", "Apaneca"
  ],
  BZ: [
    "Belize City", "San Ignacio", "Belmopan", "Orange Walk", "Placencia", "Ambergris Caye",
    "Caye Caulker", "Hopkins", "Dangriga", "Corozal", "Punta Gorda"
  ],
  QA: [
    "Doha", "Al Wakrah", "Al Khor", "Al Rayyan", "Souq Waqif", "The Pearl"
  ],
  BH: [
    "Manama", "Riffa", "Muharraq", "Isa Town", "Bahrain Fort"
  ],
  KW: [
    "Kuwait City", "Al Ahmadi", "Hawalli", "Salmiya", "Failaka Island"
  ],
  OM: [
    "Muscat", "Salalah", "Sohar", "Nizwa", "Sur", "Wahiba Sands", "Jebel Akhdar",
    "Musandam Peninsula", "Jebel Shams", "Masirah Island"
  ],
  LB: [
    "Beirut", "Tripoli", "Sidon", "Byblos", "Baalbek", "Jounieh", "Tyre",
    "Cedars of Lebanon", "Jeita Grotto", "Batroun"
  ],
  MT: [
    "Valletta", "Sliema", "Birkirkara", "Mosta", "Mdina", "Gozo", "Comino",
    "St. Julian's", "Marsaxlokk", "Blue Lagoon"
  ],
  CY: [
    "Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta", "Kyrenia",
    "Ayia Napa", "Protaras", "Troodos Mountains"
  ],
  LU: [
    "Luxembourg City", "Esch-sur-Alzette", "Differdange", "Dudelange",
    "Echternach", "Vianden", "Clervaux", "Mullerthal"
  ],
  MC: [
    "Monaco", "Monte Carlo", "La Condamine", "Fontvieille"
  ],
  AD: [
    "Andorra la Vella", "Escaldes-Engordany", "Encamp", "Grandvalira", "Vallnord"
  ],
  SM: [
    "San Marino", "Serravalle", "Borgo Maggiore", "Monte Titano"
  ],
  VA: [
    "Vatican City", "St. Peter's Basilica", "Vatican Museums"
  ],
  LI: [
    "Vaduz", "Schaan", "Balzers", "Triesenberg", "Malbun"
  ],
  MV: [
    "Malé", "Addu City", "Hulhumalé", "Maafushi", "Baa Atoll", "Ari Atoll"
  ],
  MU: [
    "Port Louis", "Beau Bassin-Rose Hill", "Vacoas-Phoenix", "Grand Baie",
    "Flic en Flac", "Le Morne", "Trou aux Biches", "Chamarel"
  ],
  SC: [
    "Victoria", "Anse Royale", "Beau Vallon", "Praslin", "La Digue", "Anse Lazio"
  ],
  FJ: [
    "Suva", "Nadi", "Lautoka", "Labasa", "Denarau", "Mamanuca Islands", "Yasawa Islands"
  ],
  PF: [
    "Papeete", "Faaa", "Bora Bora", "Moorea", "Tahiti", "Rangiroa", "Huahine"
  ],
  NC: [
    "Nouméa", "Mont-Dore", "Dumbéa", "Isle of Pines", "Lifou"
  ],
  WS: [
    "Apia", "Vaitele", "Faleula", "Lalomanu Beach", "To Sua Ocean Trench"
  ],
  TO: [
    "Nukuʻalofa", "Neiafu", "Haveluloto", "Vava'u", "Ha'apai"
  ],
  VU: [
    "Port Vila", "Luganville", "Tanna", "Espiritu Santo", "Efate"
  ],
  PG: [
    "Port Moresby", "Lae", "Mount Hagen", "Goroka", "Rabaul", "Tufi"
  ],
  // Additional countries with expanded city lists
  SI: [
    "Ljubljana", "Maribor", "Celje", "Kranj", "Bled", "Piran", "Portorož",
    "Postojna", "Koper", "Bovec", "Kranjska Gora"
  ],
  SK: [
    "Bratislava", "Košice", "Prešov", "Žilina", "Banská Bystrica",
    "High Tatras", "Levoča", "Spišský hrad"
  ],
  BG: [
    "Sofia", "Plovdiv", "Varna", "Burgas", "Ruse", "Veliko Tarnovo",
    "Bansko", "Sunny Beach", "Sozopol", "Rila Monastery"
  ],
  RS: [
    "Belgrade", "Novi Sad", "Niš", "Kragujevac", "Subotica", "Zlatibor", "Kopaonik"
  ],
  ME: [
    "Podgorica", "Budva", "Kotor", "Herceg Novi", "Tivat", "Ulcinj", "Cetinje"
  ],
  AL: [
    "Tirana", "Durrës", "Vlorë", "Shkodër", "Berat", "Gjirokastër", "Sarandë",
    "Ksamil", "Albanian Riviera", "Theth"
  ],
  MK: [
    "Skopje", "Bitola", "Kumanovo", "Ohrid", "Lake Ohrid", "Mavrovo"
  ],
  XK: [
    "Pristina", "Prizren", "Peja", "Gjakova", "Rugova Valley"
  ],
  BA: [
    "Sarajevo", "Banja Luka", "Tuzla", "Mostar", "Medjugorje", "Travnik", "Jajce"
  ],
  EE: [
    "Tallinn", "Tartu", "Narva", "Pärnu", "Kuressaare", "Lahemaa"
  ],
  LV: [
    "Riga", "Daugavpils", "Liepāja", "Jūrmala", "Sigulda", "Cēsis", "Rundale"
  ],
  LT: [
    "Vilnius", "Kaunas", "Klaipėda", "Šiauliai", "Trakai", "Nida", "Curonian Spit"
  ],
  UA: [
    "Kyiv", "Lviv", "Odessa", "Kharkiv", "Dnipro", "Chernobyl", "Carpathian Mountains"
  ],
  BY: [
    "Minsk", "Brest", "Grodno", "Gomel", "Vitebsk", "Mir Castle"
  ],
  MD: [
    "Chișinău", "Tiraspol", "Bălți", "Orheiul Vechi", "Cricova"
  ],
  GE: [
    "Tbilisi", "Batumi", "Kutaisi", "Mtskheta", "Kazbegi", "Svaneti", "Sighnaghi"
  ],
  AM: [
    "Yerevan", "Gyumri", "Vanadzor", "Dilijan", "Lake Sevan", "Tatev", "Noravank"
  ],
  AZ: [
    "Baku", "Ganja", "Sumqayit", "Sheki", "Quba", "Gobustan", "Gabala"
  ],
};

// Get cities for a country by country code
export const getCitiesForCountry = (countryCode: string): string[] => {
  return citiesByCountry[countryCode.toUpperCase()] || [];
};

// Search cities within a country
export const searchCitiesInCountry = (countryCode: string, query: string): string[] => {
  const cities = getCitiesForCountry(countryCode);
  if (!query) return cities;
  
  const lowercaseQuery = query.toLowerCase();
  return cities.filter(city => city.toLowerCase().includes(lowercaseQuery));
};

// Check if a country has cities data
export const hasCountryCities = (countryCode: string): boolean => {
  return countryCode.toUpperCase() in citiesByCountry;
};