// Major cities for each country - focusing on popular travel destinations
// This is a simplified list; you can expand it as needed

const citiesByCountry: Record<string, string[]> = {
  US: [
    "New York City", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
    "Fort Worth", "Columbus", "San Francisco", "Charlotte", "Indianapolis", "Seattle",
    "Denver", "Washington D.C.", "Boston", "Nashville", "Baltimore", "Oklahoma City",
    "Louisville", "Portland", "Las Vegas", "Milwaukee", "Albuquerque", "Tucson",
    "Fresno", "Sacramento", "Mesa", "Kansas City", "Atlanta", "Miami", "Omaha",
    "Raleigh", "Minneapolis", "Cleveland", "New Orleans", "Honolulu", "Orlando",
    "Tampa", "Pittsburgh", "Cincinnati", "St. Louis", "Detroit", "Buffalo", "Salt Lake City"
  ],
  GB: [
    "London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Bristol",
    "Edinburgh", "Leeds", "Sheffield", "Newcastle", "Nottingham", "Southampton",
    "Brighton", "Oxford", "Cambridge", "York", "Bath", "Cardiff", "Belfast"
  ],
  FR: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg",
    "Montpellier", "Bordeaux", "Lille", "Rennes", "Reims", "Saint-Étienne",
    "Le Havre", "Grenoble", "Dijon", "Cannes", "Avignon", "Aix-en-Provence"
  ],
  DE: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart", "Düsseldorf",
    "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden", "Hanover", "Nuremberg",
    "Duisburg", "Bochum", "Wuppertal", "Bielefeld", "Bonn", "Heidelberg"
  ],
  IT: [
    "Rome", "Milan", "Naples", "Turin", "Palermo", "Genoa", "Bologna", "Florence",
    "Venice", "Verona", "Catania", "Bari", "Padua", "Trieste", "Brescia", "Parma",
    "Modena", "Pisa", "Siena", "Amalfi"
  ],
  ES: [
    "Madrid", "Barcelona", "Valencia", "Seville", "Zaragoza", "Málaga", "Murcia",
    "Palma", "Las Palmas", "Bilbao", "Alicante", "Córdoba", "Valladolid", "Granada",
    "Toledo", "San Sebastián", "Salamanca", "Ibiza"
  ],
  PT: [
    "Lisbon", "Porto", "Amadora", "Braga", "Coimbra", "Funchal", "Setúbal",
    "Almada", "Faro", "Sintra", "Lagos", "Cascais", "Évora"
  ],
  NL: [
    "Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven", "Groningen",
    "Tilburg", "Almere", "Breda", "Nijmegen", "Haarlem", "Maastricht", "Delft"
  ],
  BE: [
    "Brussels", "Antwerp", "Ghent", "Charleroi", "Liège", "Bruges", "Namur",
    "Leuven", "Mons", "Mechelen"
  ],
  CH: [
    "Zurich", "Geneva", "Basel", "Bern", "Lausanne", "Lucerne", "St. Gallen",
    "Lugano", "Winterthur", "Zermatt", "Interlaken"
  ],
  AT: [
    "Vienna", "Graz", "Linz", "Salzburg", "Innsbruck", "Klagenfurt", "Villach",
    "Wels", "St. Pölten", "Hallstatt"
  ],
  JP: [
    "Tokyo", "Yokohama", "Osaka", "Nagoya", "Sapporo", "Fukuoka", "Kobe", "Kyoto",
    "Kawasaki", "Saitama", "Hiroshima", "Sendai", "Nara", "Okinawa", "Nikko"
  ],
  CN: [
    "Shanghai", "Beijing", "Shenzhen", "Guangzhou", "Chengdu", "Tianjin", "Xi'an",
    "Hangzhou", "Wuhan", "Chongqing", "Hong Kong", "Suzhou", "Nanjing", "Guilin"
  ],
  KR: [
    "Seoul", "Busan", "Incheon", "Daegu", "Daejeon", "Gwangju", "Suwon", "Ulsan",
    "Jeju", "Gyeongju"
  ],
  TH: [
    "Bangkok", "Chiang Mai", "Phuket", "Pattaya", "Krabi", "Koh Samui", "Hua Hin",
    "Ayutthaya", "Chiang Rai", "Pai"
  ],
  VN: [
    "Ho Chi Minh City", "Hanoi", "Da Nang", "Hai Phong", "Can Tho", "Nha Trang",
    "Hue", "Hoi An", "Sa Pa", "Da Lat"
  ],
  ID: [
    "Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Bali",
    "Yogyakarta", "Palembang", "Ubud"
  ],
  MY: [
    "Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Shah Alam", "Malacca",
    "Kota Kinabalu", "Kuching", "Langkawi", "Cameron Highlands"
  ],
  SG: ["Singapore"],
  PH: [
    "Manila", "Quezon City", "Davao", "Caloocan", "Cebu City", "Zamboanga",
    "Antipolo", "Boracay", "Palawan", "Baguio"
  ],
  IN: [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad",
    "Pune", "Jaipur", "Agra", "Goa", "Varanasi", "Udaipur", "Kerala", "Darjeeling"
  ],
  AU: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast", "Canberra",
    "Newcastle", "Hobart", "Darwin", "Cairns", "Alice Springs"
  ],
  NZ: [
    "Auckland", "Wellington", "Christchurch", "Hamilton", "Tauranga", "Dunedin",
    "Queenstown", "Rotorua", "Napier", "Nelson"
  ],
  CA: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa", "Winnipeg",
    "Quebec City", "Hamilton", "Victoria", "Halifax", "Niagara Falls", "Banff"
  ],
  MX: [
    "Mexico City", "Guadalajara", "Monterrey", "Puebla", "Cancún", "Tijuana",
    "León", "Mérida", "Playa del Carmen", "Oaxaca", "San Miguel de Allende"
  ],
  BR: [
    "São Paulo", "Rio de Janeiro", "Brasília", "Salvador", "Fortaleza", "Belo Horizonte",
    "Manaus", "Curitiba", "Recife", "Florianópolis", "Iguazu Falls"
  ],
  AR: [
    "Buenos Aires", "Córdoba", "Rosario", "Mendoza", "La Plata", "San Miguel de Tucumán",
    "Mar del Plata", "Salta", "Bariloche", "Ushuaia"
  ],
  CL: [
    "Santiago", "Valparaíso", "Concepción", "Viña del Mar", "La Serena", "Antofagasta",
    "Punta Arenas", "Puerto Varas", "San Pedro de Atacama"
  ],
  CO: [
    "Bogotá", "Medellín", "Cali", "Barranquilla", "Cartagena", "Cúcuta", "Bucaramanga",
    "Santa Marta", "Pereira"
  ],
  PE: [
    "Lima", "Arequipa", "Trujillo", "Cusco", "Chiclayo", "Piura", "Iquitos",
    "Huancayo", "Machu Picchu"
  ],
  ZA: [
    "Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein",
    "East London", "Stellenbosch", "Kruger National Park"
  ],
  EG: [
    "Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Luxor", "Aswan", "Hurghada",
    "Port Said"
  ],
  MA: [
    "Casablanca", "Marrakech", "Fes", "Tangier", "Agadir", "Rabat", "Meknes",
    "Ouarzazate", "Chefchaouen"
  ],
  KE: [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Masai Mara", "Lamu"
  ],
  TZ: [
    "Dar es Salaam", "Dodoma", "Arusha", "Mwanza", "Zanzibar", "Kilimanjaro"
  ],
  AE: [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah"
  ],
  SA: [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Abha"
  ],
  TR: [
    "Istanbul", "Ankara", "Izmir", "Antalya", "Bursa", "Adana", "Konya",
    "Gaziantep", "Cappadocia", "Ephesus", "Bodrum"
  ],
  GR: [
    "Athens", "Thessaloniki", "Patras", "Heraklion", "Larissa", "Volos",
    "Santorini", "Mykonos", "Rhodes", "Corfu", "Crete"
  ],
  HR: [
    "Zagreb", "Split", "Rijeka", "Dubrovnik", "Osijek", "Zadar", "Pula",
    "Šibenik", "Hvar"
  ],
  CZ: [
    "Prague", "Brno", "Ostrava", "Plzeň", "Liberec", "Olomouc", "České Budějovice",
    "Karlovy Vary", "Český Krumlov"
  ],
  PL: [
    "Warsaw", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin",
    "Bydgoszcz", "Lublin", "Zakopane"
  ],
  HU: [
    "Budapest", "Debrecen", "Szeged", "Miskolc", "Pécs", "Győr", "Eger"
  ],
  RO: [
    "Bucharest", "Cluj-Napoca", "Timișoara", "Iași", "Constanța", "Brașov", "Sibiu"
  ],
  SE: [
    "Stockholm", "Gothenburg", "Malmö", "Uppsala", "Västerås", "Örebro", "Kiruna"
  ],
  NO: [
    "Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Tromsø"
  ],
  DK: [
    "Copenhagen", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers"
  ],
  FI: [
    "Helsinki", "Espoo", "Tampere", "Vantaa", "Oulu", "Turku", "Rovaniemi"
  ],
  IE: [
    "Dublin", "Cork", "Limerick", "Galway", "Waterford", "Drogheda", "Killarney"
  ],
  IS: [
    "Reykjavik", "Akureyri", "Keflavík", "Selfoss", "Vik", "Húsavík"
  ],
  RU: [
    "Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan",
    "Nizhny Novgorod", "Sochi", "Vladivostok"
  ],
  IL: [
    "Jerusalem", "Tel Aviv", "Haifa", "Rishon LeZion", "Petah Tikva", "Eilat",
    "Be'er Sheva", "Nazareth"
  ],
  JO: [
    "Amman", "Irbid", "Zarqa", "Aqaba", "Petra", "Wadi Rum", "Dead Sea"
  ],
  LK: [
    "Colombo", "Kandy", "Galle", "Negombo", "Jaffna", "Ella", "Sigiriya",
    "Anuradhapura"
  ],
  NP: [
    "Kathmandu", "Pokhara", "Lalitpur", "Bharatpur", "Biratnagar", "Chitwan"
  ],
  MM: [
    "Yangon", "Mandalay", "Naypyidaw", "Bagan", "Inle Lake", "Ngapali"
  ],
  KH: [
    "Phnom Penh", "Siem Reap", "Sihanoukville", "Battambang", "Kampot"
  ],
  LA: [
    "Vientiane", "Luang Prabang", "Pakse", "Savannakhet", "Vang Vieng"
  ],
  CU: [
    "Havana", "Santiago de Cuba", "Camagüey", "Holguín", "Santa Clara", "Trinidad",
    "Varadero", "Viñales"
  ],
  JM: [
    "Kingston", "Montego Bay", "Spanish Town", "Portmore", "Ocho Rios", "Negril"
  ],
  DO: [
    "Santo Domingo", "Santiago de los Caballeros", "Punta Cana", "La Romana",
    "Puerto Plata"
  ],
  CR: [
    "San José", "Limón", "Alajuela", "Heredia", "Cartago", "Monteverde",
    "Manuel Antonio", "La Fortuna"
  ],
  PA: [
    "Panama City", "Colón", "David", "Bocas del Toro", "Boquete"
  ],
  EC: [
    "Quito", "Guayaquil", "Cuenca", "Santo Domingo", "Machala", "Galápagos Islands"
  ],
  BO: [
    "La Paz", "Santa Cruz", "Cochabamba", "Sucre", "Oruro", "Uyuni"
  ],
  UY: [
    "Montevideo", "Salto", "Ciudad de la Costa", "Paysandú", "Punta del Este",
    "Colonia del Sacramento"
  ],
  PY: [
    "Asunción", "Ciudad del Este", "San Lorenzo", "Luque", "Encarnación"
  ],
  GT: [
    "Guatemala City", "Mixco", "Villa Nueva", "Quetzaltenango", "Antigua Guatemala",
    "Flores"
  ],
  HN: [
    "Tegucigalpa", "San Pedro Sula", "La Ceiba", "Roatán", "Copán"
  ],
  NI: [
    "Managua", "León", "Masaya", "Matagalpa", "Granada"
  ],
  SV: [
    "San Salvador", "Santa Ana", "San Miguel", "Mejicanos"
  ],
  BZ: [
    "Belize City", "San Ignacio", "Belmopan", "Orange Walk", "Placencia", "Ambergris Caye"
  ],
  QA: [
    "Doha", "Al Wakrah", "Al Khor", "Al Rayyan"
  ],
  BH: [
    "Manama", "Riffa", "Muharraq"
  ],
  KW: [
    "Kuwait City", "Al Ahmadi", "Hawalli", "Salmiya"
  ],
  OM: [
    "Muscat", "Salalah", "Sohar", "Nizwa", "Sur"
  ],
  LB: [
    "Beirut", "Tripoli", "Sidon", "Byblos", "Baalbek"
  ],
  MT: [
    "Valletta", "Sliema", "Birkirkara", "Mosta", "Mdina", "Gozo"
  ],
  CY: [
    "Nicosia", "Limassol", "Larnaca", "Paphos", "Famagusta"
  ],
  LU: [
    "Luxembourg City", "Esch-sur-Alzette", "Differdange", "Dudelange"
  ],
  MC: [
    "Monaco", "Monte Carlo", "La Condamine"
  ],
  AD: [
    "Andorra la Vella", "Escaldes-Engordany", "Encamp"
  ],
  SM: [
    "San Marino", "Serravalle", "Borgo Maggiore"
  ],
  VA: [
    "Vatican City"
  ],
  LI: [
    "Vaduz", "Schaan", "Balzers"
  ],
  MV: [
    "Malé", "Addu City", "Hulhumalé"
  ],
  MU: [
    "Port Louis", "Beau Bassin-Rose Hill", "Vacoas-Phoenix", "Grand Baie"
  ],
  SC: [
    "Victoria", "Anse Royale", "Beau Vallon"
  ],
  FJ: [
    "Suva", "Nadi", "Lautoka", "Labasa"
  ],
  PF: [
    "Papeete", "Faaa", "Bora Bora", "Moorea"
  ],
  NC: [
    "Nouméa", "Mont-Dore", "Dumbéa"
  ],
  WS: [
    "Apia", "Vaitele", "Faleula"
  ],
  TO: [
    "Nukuʻalofa", "Neiafu", "Haveluloto"
  ],
  VU: [
    "Port Vila", "Luganville"
  ],
  PG: [
    "Port Moresby", "Lae", "Mount Hagen"
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