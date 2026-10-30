/**
 * Daftar kota pilihan, dikelompokkan per negara: setiap negara anggota PBB (plus beberapa
 * wilayah) minimal punya ibu kotanya, ditambah kota besar atau yang sering dicari user Indonesia.
 *
 * Format: `country(nama, zona bawaan, alias negara, kota[])`. Kota berupa nama saja (memakai zona
 * bawaan), atau `[nama, zona, alias]` dengan zona "" bila sama dengan bawaan. Alias dipisah spasi
 * dan ikut dicari (nama Inggris, ejaan lain, singkatan).
 *
 * Urutan penting: kota pertama dengan suatu zona adalah wakilnya (judul kartu "Lokal" dan satu-
 * satunya yang cocok bila user mencari nama zona). Taruh kota baru setelah wakil zonanya.
 */

export interface City {
  id: string;
  name: string;
  country: string;
  zone: string;
  aliases: string;
}

type CityRow = string | [name: string, zone: string, aliases?: string];

const rows: City[] = [];

function country(name: string, zone: string, aliases: string, cities: CityRow[]) {
  for (const row of cities) {
    const [cityName, cityZone = "", cityAliases = ""] = typeof row === "string" ? [row] : row;
    rows.push({ id: "", name: cityName, country: name, zone: cityZone || zone, aliases: `${cityAliases} ${aliases}`.trim() });
  }
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// ---------- Indonesia & Asia Tenggara ----------

country("Indonesia", "Asia/Jakarta", "", [
  ["Jakarta", "", "wib waktu indonesia barat dki"],
  "Bandung",
  "Surabaya",
  "Semarang",
  ["Yogyakarta", "", "jogja jogjakarta diy"],
  ["Solo", "", "surakarta"],
  "Malang",
  "Bogor",
  "Depok",
  "Tangerang",
  "Bekasi",
  ["Serang", "", "banten"],
  "Cirebon",
  ["Medan", "", "sumatera utara"],
  ["Banda Aceh", "", "aceh"],
  ["Padang", "", "sumatera barat"],
  ["Pekanbaru", "", "riau"],
  ["Batam", "", "kepulauan riau kepri"],
  ["Tanjung Pinang", "", "kepulauan riau kepri"],
  "Jambi",
  "Bengkulu",
  "Palembang",
  ["Pangkal Pinang", "", "bangka belitung"],
  ["Bandar Lampung", "", "lampung"],
  ["Pontianak", "Asia/Pontianak", "kalimantan barat"],
  ["Palangka Raya", "Asia/Pontianak", "kalimantan tengah"],
  ["Makassar", "Asia/Makassar", "wita waktu indonesia tengah sulawesi selatan ujung pandang"],
  ["Denpasar", "Asia/Makassar", "wita bali"],
  ["Kuta", "Asia/Makassar", "wita bali"],
  ["Mataram", "Asia/Makassar", "wita lombok ntb"],
  ["Kupang", "Asia/Makassar", "wita ntt"],
  ["Labuan Bajo", "Asia/Makassar", "wita flores komodo ntt"],
  ["Balikpapan", "Asia/Makassar", "wita kalimantan timur ikn nusantara"],
  ["Samarinda", "Asia/Makassar", "wita kalimantan timur"],
  ["Banjarmasin", "Asia/Makassar", "wita kalimantan selatan"],
  ["Tarakan", "Asia/Makassar", "wita kalimantan utara"],
  ["Manado", "Asia/Makassar", "wita sulawesi utara"],
  ["Palu", "Asia/Makassar", "wita sulawesi tengah"],
  ["Kendari", "Asia/Makassar", "wita sulawesi tenggara"],
  ["Gorontalo", "Asia/Makassar", "wita"],
  ["Jayapura", "Asia/Jayapura", "wit waktu indonesia timur papua"],
  ["Ambon", "Asia/Jayapura", "wit maluku"],
  ["Ternate", "Asia/Jayapura", "wit maluku utara"],
  ["Sorong", "Asia/Jayapura", "wit papua barat daya"],
  ["Manokwari", "Asia/Jayapura", "wit papua barat"],
  ["Merauke", "Asia/Jayapura", "wit papua selatan"],
  ["Timika", "Asia/Jayapura", "wit papua tengah"],
]);
country("Singapura", "Asia/Singapore", "singapore", ["Singapura"]);
country("Malaysia", "Asia/Kuala_Lumpur", "", [
  "Kuala Lumpur",
  "Johor Bahru",
  ["Penang", "", "george town pulau pinang"],
  ["Melaka", "", "malacca"],
  "Ipoh",
  ["Kuching", "Asia/Kuching", "sarawak"],
  ["Kota Kinabalu", "Asia/Kuching", "sabah"],
]);
country("Brunei", "Asia/Brunei", "brunei darussalam", ["Bandar Seri Begawan"]);
country("Timor Leste", "Asia/Dili", "east timor", ["Dili"]);
country("Filipina", "Asia/Manila", "philippines", ["Manila", "Quezon City", "Cebu", "Davao"]);
country("Thailand", "Asia/Bangkok", "", ["Bangkok", "Chiang Mai", "Phuket", "Pattaya"]);
country("Vietnam", "Asia/Ho_Chi_Minh", "viet nam", [["Ho Chi Minh", "", "saigon"], "Hanoi", "Da Nang"]);
country("Kamboja", "Asia/Phnom_Penh", "cambodia", ["Phnom Penh", "Siem Reap"]);
country("Laos", "Asia/Vientiane", "", ["Vientiane"]);
country("Myanmar", "Asia/Yangon", "burma", [["Yangon", "", "rangoon"], "Naypyidaw", "Mandalay"]);

// ---------- Asia Timur ----------

country("Tiongkok", "Asia/Shanghai", "china cina rrt", [
  ["Beijing", "", "peking"],
  "Shanghai",
  "Guangzhou",
  "Shenzhen",
  "Chengdu",
  "Chongqing",
  "Wuhan",
  ["Xi'an", "", "xian"],
  "Hangzhou",
  "Nanjing",
  "Tianjin",
  ["Urumqi", "Asia/Urumqi", "xinjiang"],
]);
country("Hong Kong", "Asia/Hong_Kong", "hongkong", ["Hong Kong"]);
country("Makau", "Asia/Macau", "macau macao", ["Makau"]);
country("Taiwan", "Asia/Taipei", "", ["Taipei", "Kaohsiung", "Taichung"]);
country("Korea Selatan", "Asia/Seoul", "south korea", ["Seoul", "Busan", "Incheon"]);
country("Korea Utara", "Asia/Pyongyang", "north korea", ["Pyongyang"]);
country("Jepang", "Asia/Tokyo", "japan", ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya", "Sapporo", "Fukuoka", ["Naha", "", "okinawa"]]);
country("Mongolia", "Asia/Ulaanbaatar", "", [["Ulaanbaatar", "", "ulan bator"]]);

// ---------- Asia Selatan & Tengah ----------

country("India", "Asia/Kolkata", "ist", [
  "New Delhi",
  ["Mumbai", "", "bombay"],
  ["Kolkata", "", "calcutta"],
  ["Bengaluru", "", "bangalore"],
  ["Chennai", "", "madras"],
  "Hyderabad",
  "Ahmedabad",
  "Pune",
  "Jaipur",
  "Goa",
]);
country("Pakistan", "Asia/Karachi", "", ["Islamabad", "Karachi", "Lahore"]);
country("Bangladesh", "Asia/Dhaka", "", ["Dhaka", ["Chittagong", "", "chattogram"]]);
country("Sri Lanka", "Asia/Colombo", "", [["Kolombo", "", "colombo"]]);
country("Nepal", "Asia/Kathmandu", "", ["Kathmandu"]);
country("Bhutan", "Asia/Thimphu", "", ["Thimphu"]);
country("Maladewa", "Indian/Maldives", "maldives", ["Male"]);
country("Afganistan", "Asia/Kabul", "afghanistan", ["Kabul"]);
country("Kazakhstan", "Asia/Almaty", "", ["Almaty", "Astana"]);
country("Uzbekistan", "Asia/Tashkent", "", ["Tashkent", "Samarkand"]);
country("Kirgizstan", "Asia/Bishkek", "kyrgyzstan", ["Bishkek"]);
country("Tajikistan", "Asia/Dushanbe", "", ["Dushanbe"]);
country("Turkmenistan", "Asia/Ashgabat", "", ["Ashgabat"]);

// ---------- Timur Tengah ----------

country("Arab Saudi", "Asia/Riyadh", "saudi arabia ksa", [
  "Riyadh",
  ["Mekah", "", "makkah mecca umrah haji"],
  ["Madinah", "", "medina umrah haji"],
  ["Jeddah", "", "jedah jiddah"],
  "Dammam",
]);
country("Uni Emirat Arab", "Asia/Dubai", "uae united arab emirates", ["Dubai", "Abu Dhabi", "Sharjah"]);
country("Qatar", "Asia/Qatar", "", ["Doha"]);
country("Bahrain", "Asia/Bahrain", "", ["Manama"]);
country("Kuwait", "Asia/Kuwait", "", ["Kuwait City"]);
country("Oman", "Asia/Muscat", "", [["Muskat", "", "muscat"]]);
country("Yaman", "Asia/Aden", "yemen", [["Sana'a", "", "sanaa"], "Aden"]);
country("Yordania", "Asia/Amman", "jordan", ["Amman"]);
country("Lebanon", "Asia/Beirut", "libanon", ["Beirut"]);
country("Suriah", "Asia/Damascus", "syria", [["Damaskus", "", "damascus"], "Aleppo"]);
country("Irak", "Asia/Baghdad", "iraq", [["Bagdad", "", "baghdad"], "Erbil", "Basra"]);
country("Iran", "Asia/Tehran", "", [["Teheran", "", "tehran"], "Mashhad", "Isfahan"]);
country("Palestina", "Asia/Jerusalem", "palestine", [["Yerusalem", "", "jerusalem al quds"], ["Gaza", "Asia/Gaza"], ["Ramallah", "Asia/Hebron"]]);
country("Israel", "Asia/Jerusalem", "", ["Tel Aviv"]);
country("Turki", "Europe/Istanbul", "turkey turkiye", ["Istanbul", "Ankara", "Izmir", "Antalya"]);
country("Siprus", "Asia/Nicosia", "cyprus", [["Nikosia", "", "nicosia"]]);
country("Georgia", "Asia/Tbilisi", "", ["Tbilisi"]);
country("Armenia", "Asia/Yerevan", "", ["Yerevan"]);
country("Azerbaijan", "Asia/Baku", "", ["Baku"]);

// ---------- Eropa Barat & Utara ----------

country("Inggris", "Europe/London", "uk united kingdom britania raya england", [
  "London",
  "Manchester",
  "Birmingham",
  "Liverpool",
  "Leeds",
  "Newcastle",
  "Nottingham",
  "Bristol",
  "Oxford",
  "Cambridge",
  ["Edinburgh", "", "skotlandia scotland"],
  ["Glasgow", "", "skotlandia scotland"],
  ["Cardiff", "", "wales"],
  ["Belfast", "", "irlandia utara northern ireland"],
]);
country("Irlandia", "Europe/Dublin", "ireland", ["Dublin"]);
country("Portugal", "Europe/Lisbon", "", [["Lisbon", "", "lisboa"], "Porto", ["Funchal", "Atlantic/Madeira", "madeira"], ["Ponta Delgada", "Atlantic/Azores", "azores"]]);
country("Spanyol", "Europe/Madrid", "spain espana", [
  "Madrid",
  "Barcelona",
  "Valencia",
  ["Sevilla", "", "seville"],
  "Malaga",
  "Bilbao",
  ["Las Palmas", "Atlantic/Canary", "kepulauan canary gran canaria"],
  ["Tenerife", "Atlantic/Canary", "kepulauan canary"],
]);
country("Prancis", "Europe/Paris", "france perancis", ["Paris", "Marseille", "Lyon", "Nice", "Toulouse", "Bordeaux", "Strasbourg"]);
country("Belgia", "Europe/Brussels", "belgium", [["Brussel", "", "brussels bruxelles"], ["Antwerpen", "", "antwerp"], ["Gent", "", "ghent"], "Leuven"]);
country("Belanda", "Europe/Amsterdam", "netherlands holland", [
  "Amsterdam",
  "Rotterdam",
  ["Den Haag", "", "the hague"],
  "Utrecht",
  ["Eindhoven", "", "brabant"],
  ["Den Bosch", "", "s-hertogenbosch brabant"],
  ["Tilburg", "", "brabant"],
  ["Breda", "", "brabant"],
  ["Veghel", "", "brabant meierijstad"],
  "Leiden",
  "Delft",
  "Groningen",
  "Nijmegen",
  "Wageningen",
  "Enschede",
  "Maastricht",
]);
country("Luksemburg", "Europe/Luxembourg", "luxembourg", ["Luksemburg"]);
country("Jerman", "Europe/Berlin", "germany deutschland", [
  "Berlin",
  ["Munchen", "", "munich muenchen"],
  "Frankfurt",
  "Hamburg",
  ["Koln", "", "cologne koeln"],
  "Stuttgart",
  ["Dusseldorf", "", "duesseldorf"],
  "Aachen",
  "Bremen",
  "Leipzig",
  "Dresden",
]);
country("Swiss", "Europe/Zurich", "switzerland swiss", ["Zurich", ["Jenewa", "", "geneva geneve"], "Bern", "Basel", "Lausanne"]);
country("Austria", "Europe/Vienna", "", [["Wina", "", "vienna wien"], "Salzburg", "Innsbruck"]);
country("Italia", "Europe/Rome", "italy", [["Roma", "", "rome"], ["Milan", "", "milano"], ["Venesia", "", "venice venezia"], ["Firenze", "", "florence"], ["Napoli", "", "naples"], ["Turin", "", "torino"], "Bologna"]);
country("Vatikan", "Europe/Vatican", "vatican", ["Vatikan"]);
country("San Marino", "Europe/San_Marino", "", ["San Marino"]);
country("Malta", "Europe/Malta", "", ["Valletta"]);
country("Monako", "Europe/Monaco", "monaco", ["Monako"]);
country("Andorra", "Europe/Andorra", "", ["Andorra la Vella"]);
country("Liechtenstein", "Europe/Vaduz", "", ["Vaduz"]);
country("Denmark", "Europe/Copenhagen", "", [["Kopenhagen", "", "copenhagen kobenhavn"], "Aarhus"]);
country("Norwegia", "Europe/Oslo", "norway", ["Oslo", "Bergen"]);
country("Swedia", "Europe/Stockholm", "sweden", ["Stockholm", ["Gothenburg", "", "goteborg"]]);
country("Finlandia", "Europe/Helsinki", "finland", ["Helsinki"]);
country("Islandia", "Atlantic/Reykjavik", "iceland", ["Reykjavik"]);

// ---------- Eropa Tengah, Timur & Selatan ----------

country("Polandia", "Europe/Warsaw", "poland", [["Warsawa", "", "warsaw"], ["Krakow", "", "cracow"]]);
country("Ceko", "Europe/Prague", "czech czechia", [["Praha", "", "prague"], "Brno"]);
country("Slowakia", "Europe/Bratislava", "slovakia", ["Bratislava"]);
country("Hungaria", "Europe/Budapest", "hungary", ["Budapest"]);
country("Slovenia", "Europe/Ljubljana", "", ["Ljubljana"]);
country("Kroasia", "Europe/Zagreb", "croatia", ["Zagreb", "Split", "Dubrovnik"]);
country("Bosnia dan Herzegovina", "Europe/Sarajevo", "bosnia herzegovina", ["Sarajevo"]);
country("Serbia", "Europe/Belgrade", "", [["Beograd", "", "belgrade"]]);
country("Kosovo", "Europe/Belgrade", "", ["Pristina"]);
country("Montenegro", "Europe/Podgorica", "", ["Podgorica"]);
country("Makedonia Utara", "Europe/Skopje", "north macedonia", ["Skopje"]);
country("Albania", "Europe/Tirane", "", ["Tirana"]);
country("Yunani", "Europe/Athens", "greece", [["Athena", "", "athens"], "Thessaloniki"]);
country("Bulgaria", "Europe/Sofia", "", ["Sofia"]);
country("Rumania", "Europe/Bucharest", "romania", [["Bukares", "", "bucharest bucuresti"]]);
country("Moldova", "Europe/Chisinau", "", ["Chisinau"]);
country("Ukraina", "Europe/Kyiv", "ukraine", [["Kyiv", "", "kiev"], "Kharkiv", "Lviv", "Odesa"]);
country("Belarus", "Europe/Minsk", "", ["Minsk"]);
country("Estonia", "Europe/Tallinn", "", ["Tallinn"]);
country("Latvia", "Europe/Riga", "", ["Riga"]);
country("Lituania", "Europe/Vilnius", "lithuania", ["Vilnius"]);
country("Rusia", "Europe/Moscow", "russia", [
  ["Moskow", "", "moscow moskva"],
  ["Saint Petersburg", "", "st petersburg sankt peterburg"],
  "Kazan",
  ["Kaliningrad", "Europe/Kaliningrad"],
  ["Samara", "Europe/Samara"],
  ["Yekaterinburg", "Asia/Yekaterinburg"],
  ["Omsk", "Asia/Omsk"],
  ["Novosibirsk", "Asia/Novosibirsk"],
  ["Krasnoyarsk", "Asia/Krasnoyarsk"],
  ["Irkutsk", "Asia/Irkutsk"],
  ["Yakutsk", "Asia/Yakutsk"],
  ["Vladivostok", "Asia/Vladivostok"],
  ["Magadan", "Asia/Magadan"],
  ["Petropavlovsk-Kamchatsky", "Asia/Kamchatka", "kamchatka"],
]);

// ---------- Afrika ----------

country("Mesir", "Africa/Cairo", "egypt", [["Kairo", "", "cairo"], ["Aleksandria", "", "alexandria"]]);
country("Libya", "Africa/Tripoli", "", ["Tripoli"]);
country("Tunisia", "Africa/Tunis", "", ["Tunis"]);
country("Aljazair", "Africa/Algiers", "algeria", [["Aljir", "", "algiers"]]);
country("Maroko", "Africa/Casablanca", "morocco", ["Casablanca", "Rabat", ["Marrakesh", "", "marrakech"]]);
country("Sudan", "Africa/Khartoum", "", ["Khartoum"]);
country("Sudan Selatan", "Africa/Juba", "south sudan", ["Juba"]);
country("Etiopia", "Africa/Addis_Ababa", "ethiopia", ["Addis Ababa"]);
country("Eritrea", "Africa/Asmara", "", ["Asmara"]);
country("Djibouti", "Africa/Djibouti", "", ["Djibouti"]);
country("Somalia", "Africa/Mogadishu", "", ["Mogadishu"]);
country("Kenya", "Africa/Nairobi", "", ["Nairobi", "Mombasa"]);
country("Uganda", "Africa/Kampala", "", ["Kampala"]);
country("Tanzania", "Africa/Dar_es_Salaam", "", ["Dar es Salaam", "Dodoma", "Zanzibar"]);
country("Rwanda", "Africa/Kigali", "", ["Kigali"]);
country("Burundi", "Africa/Bujumbura", "", ["Bujumbura", "Gitega"]);
country("Republik Demokratik Kongo", "Africa/Kinshasa", "dr congo drc", ["Kinshasa", ["Lubumbashi", "Africa/Lubumbashi"]]);
country("Republik Kongo", "Africa/Brazzaville", "congo", ["Brazzaville"]);
country("Angola", "Africa/Luanda", "", ["Luanda"]);
country("Zambia", "Africa/Lusaka", "", ["Lusaka"]);
country("Zimbabwe", "Africa/Harare", "", ["Harare"]);
country("Malawi", "Africa/Blantyre", "", ["Blantyre", "Lilongwe"]);
country("Mozambik", "Africa/Maputo", "mozambique", ["Maputo"]);
country("Afrika Selatan", "Africa/Johannesburg", "south africa", ["Johannesburg", ["Cape Town", "", "kaapstad"], "Pretoria", "Durban"]);
country("Namibia", "Africa/Windhoek", "", ["Windhoek"]);
country("Botswana", "Africa/Gaborone", "", ["Gaborone"]);
country("Lesotho", "Africa/Maseru", "", ["Maseru"]);
country("Eswatini", "Africa/Mbabane", "swaziland", ["Mbabane"]);
country("Madagaskar", "Indian/Antananarivo", "madagascar", ["Antananarivo"]);
country("Mauritius", "Indian/Mauritius", "", ["Port Louis"]);
country("Seychelles", "Indian/Mahe", "", ["Victoria"]);
country("Komoro", "Indian/Comoro", "comoros", ["Moroni"]);
country("Nigeria", "Africa/Lagos", "", ["Lagos", "Abuja"]);
country("Ghana", "Africa/Accra", "", ["Accra"]);
country("Pantai Gading", "Africa/Abidjan", "ivory coast cote d ivoire", ["Abidjan", "Yamoussoukro"]);
country("Senegal", "Africa/Dakar", "", ["Dakar"]);
country("Mali", "Africa/Bamako", "", ["Bamako"]);
country("Burkina Faso", "Africa/Ouagadougou", "", ["Ouagadougou"]);
country("Niger", "Africa/Niamey", "", ["Niamey"]);
country("Chad", "Africa/Ndjamena", "", [["N'Djamena", "", "ndjamena"]]);
country("Kamerun", "Africa/Douala", "cameroon", [["Yaounde", "", "yaoundé"], "Douala"]);
country("Gabon", "Africa/Libreville", "", ["Libreville"]);
country("Guinea Khatulistiwa", "Africa/Malabo", "equatorial guinea", ["Malabo"]);
country("Republik Afrika Tengah", "Africa/Bangui", "central african republic", ["Bangui"]);
country("Togo", "Africa/Lome", "", [["Lome", "", "lomé"]]);
country("Benin", "Africa/Porto-Novo", "", ["Porto-Novo", "Cotonou"]);
country("Sierra Leone", "Africa/Freetown", "", ["Freetown"]);
country("Liberia", "Africa/Monrovia", "", ["Monrovia"]);
country("Guinea", "Africa/Conakry", "", ["Conakry"]);
country("Guinea-Bissau", "Africa/Bissau", "", ["Bissau"]);
country("Gambia", "Africa/Banjul", "", ["Banjul"]);
country("Mauritania", "Africa/Nouakchott", "", ["Nouakchott"]);
country("Tanjung Verde", "Atlantic/Cape_Verde", "cape verde cabo verde", ["Praia"]);
country("Sao Tome dan Principe", "Africa/Sao_Tome", "sao tome principe", ["Sao Tome"]);

// ---------- Amerika Utara & Tengah ----------

country("Amerika Serikat", "America/New_York", "usa us united states america", [
  ["New York", "", "nyc"],
  ["Washington DC", "", "washington d.c."],
  "Boston",
  "Philadelphia",
  "Miami",
  "Orlando",
  "Atlanta",
  ["Detroit", "America/Detroit", "michigan"],
  ["Chicago", "America/Chicago"],
  ["Houston", "America/Chicago", "texas"],
  ["Dallas", "America/Chicago", "texas"],
  ["Austin", "America/Chicago", "texas"],
  ["New Orleans", "America/Chicago"],
  ["Minneapolis", "America/Chicago"],
  ["Denver", "America/Denver", "colorado"],
  ["Salt Lake City", "America/Denver", "utah"],
  ["Phoenix", "America/Phoenix", "arizona"],
  ["Los Angeles", "America/Los_Angeles", "la california"],
  ["San Francisco", "America/Los_Angeles", "silicon valley california"],
  ["San Diego", "America/Los_Angeles", "california"],
  ["Seattle", "America/Los_Angeles", "washington"],
  ["Las Vegas", "America/Los_Angeles", "nevada"],
  ["Portland", "America/Los_Angeles", "oregon"],
  ["Anchorage", "America/Anchorage", "alaska"],
  ["Honolulu", "Pacific/Honolulu", "hawaii"],
]);
country("Kanada", "America/Toronto", "canada", [
  "Toronto",
  "Ottawa",
  "Montreal",
  ["Vancouver", "America/Vancouver"],
  ["Edmonton", "America/Edmonton", "alberta"],
  ["Calgary", "America/Edmonton", "alberta"],
  ["Winnipeg", "America/Winnipeg"],
  ["Regina", "America/Regina", "saskatchewan"],
  ["Halifax", "America/Halifax", "nova scotia"],
  ["St. John's", "America/St_Johns", "newfoundland"],
]);
country("Meksiko", "America/Mexico_City", "mexico", [
  "Mexico City",
  "Guadalajara",
  ["Monterrey", "America/Monterrey"],
  ["Cancun", "America/Cancun"],
  ["Tijuana", "America/Tijuana"],
]);
country("Guatemala", "America/Guatemala", "", ["Guatemala City"]);
country("Belize", "America/Belize", "", ["Belmopan"]);
country("El Salvador", "America/El_Salvador", "", ["San Salvador"]);
country("Honduras", "America/Tegucigalpa", "", ["Tegucigalpa"]);
country("Nikaragua", "America/Managua", "nicaragua", ["Managua"]);
country("Kosta Rika", "America/Costa_Rica", "costa rica", ["San Jose"]);
country("Panama", "America/Panama", "", ["Panama City"]);
country("Kuba", "America/Havana", "cuba", [["Havana", "", "la habana"]]);
country("Jamaika", "America/Jamaica", "jamaica", ["Kingston"]);
country("Haiti", "America/Port-au-Prince", "", ["Port-au-Prince"]);
country("Republik Dominika", "America/Santo_Domingo", "dominican republic", ["Santo Domingo"]);
country("Puerto Riko", "America/Puerto_Rico", "puerto rico", ["San Juan"]);
country("Bahama", "America/Nassau", "bahamas", ["Nassau"]);
country("Barbados", "America/Barbados", "", ["Bridgetown"]);
country("Trinidad dan Tobago", "America/Port_of_Spain", "trinidad tobago", ["Port of Spain"]);
country("Greenland", "America/Nuuk", "", ["Nuuk"]);

// ---------- Amerika Selatan ----------

country("Kolombia", "America/Bogota", "colombia", ["Bogota", "Medellin"]);
country("Venezuela", "America/Caracas", "", ["Caracas"]);
country("Ekuador", "America/Guayaquil", "ecuador", ["Quito", "Guayaquil", ["Galapagos", "Pacific/Galapagos"]]);
country("Peru", "America/Lima", "", ["Lima", "Cusco"]);
country("Bolivia", "America/La_Paz", "", ["La Paz", "Santa Cruz", "Sucre"]);
country("Chili", "America/Santiago", "chile", ["Santiago", ["Pulau Paskah", "Pacific/Easter", "easter island rapa nui"]]);
country("Argentina", "America/Argentina/Buenos_Aires", "", ["Buenos Aires", ["Cordoba", "America/Argentina/Cordoba"]]);
country("Uruguay", "America/Montevideo", "", ["Montevideo"]);
country("Paraguay", "America/Asuncion", "", ["Asuncion"]);
country("Brasil", "America/Sao_Paulo", "brazil", [
  "Sao Paulo",
  "Brasilia",
  "Rio de Janeiro",
  "Belo Horizonte",
  ["Salvador", "America/Bahia", "bahia"],
  ["Recife", "America/Recife"],
  ["Fortaleza", "America/Fortaleza"],
  ["Manaus", "America/Manaus", "amazon"],
]);
country("Guyana", "America/Guyana", "", ["Georgetown"]);
country("Suriname", "America/Paramaribo", "", ["Paramaribo"]);
country("Guyana Prancis", "America/Cayenne", "french guiana", ["Cayenne"]);

// ---------- Oseania ----------

country("Australia", "Australia/Sydney", "", [
  "Sydney",
  "Canberra",
  ["Melbourne", "Australia/Melbourne"],
  ["Brisbane", "Australia/Brisbane"],
  ["Gold Coast", "Australia/Brisbane"],
  ["Adelaide", "Australia/Adelaide"],
  ["Darwin", "Australia/Darwin"],
  ["Perth", "Australia/Perth"],
  ["Hobart", "Australia/Hobart", "tasmania"],
]);
country("Selandia Baru", "Pacific/Auckland", "new zealand", ["Auckland", "Wellington", "Christchurch"]);
country("Papua Nugini", "Pacific/Port_Moresby", "papua new guinea png", ["Port Moresby"]);
country("Fiji", "Pacific/Fiji", "", ["Suva"]);
country("Samoa", "Pacific/Apia", "", ["Apia"]);
country("Tonga", "Pacific/Tongatapu", "", [["Nuku'alofa", "", "nukualofa"]]);
country("Vanuatu", "Pacific/Efate", "", ["Port Vila"]);
country("Kepulauan Solomon", "Pacific/Guadalcanal", "solomon islands", ["Honiara"]);
country("Kaledonia Baru", "Pacific/Noumea", "new caledonia", ["Noumea"]);
country("Polinesia Prancis", "Pacific/Tahiti", "french polynesia tahiti", ["Papeete"]);
country("Kiribati", "Pacific/Tarawa", "", ["Tarawa", ["Kiritimati", "Pacific/Kiritimati", "christmas island"]]);
country("Guam", "Pacific/Guam", "", ["Hagatna"]);
country("Palau", "Pacific/Palau", "", ["Koror"]);
country("Mikronesia", "Pacific/Pohnpei", "micronesia", ["Palikir"]);
country("Kepulauan Marshall", "Pacific/Majuro", "marshall islands", ["Majuro"]);
country("Nauru", "Pacific/Nauru", "", ["Yaren"]);
country("Tuvalu", "Pacific/Funafuti", "", ["Funafuti"]);

country("Waktu universal", "UTC", "gmt zulu coordinated universal time", ["UTC"]);

// Id = slug nama; bila nama sama di negara lain, ditambah slug negara.
const used = new Set<string>();
for (const row of rows) {
  let id = slug(row.name);
  if (used.has(id)) id = `${id}-${slug(row.country)}`;
  used.add(id);
  row.id = id;
}

export const CITIES: readonly City[] = rows;
