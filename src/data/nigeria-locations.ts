// Nigeria states with major cities and LGAs (concise but practical coverage)
export type LocationData = Record<string, Record<string, string[]>>;

export const NIGERIA_LOCATIONS: LocationData = {
  "FCT - Abuja": {
    "Abuja Municipal": ["Maitama", "Asokoro", "Wuse", "Garki", "Central Area", "Jabi", "Utako", "Gwarinpa", "Mabushi", "Katampe"],
    "Bwari": ["Bwari Town", "Dutse", "Kubwa", "Ushafa"],
    "Gwagwalada": ["Gwagwalada Town", "Dobi", "Paikon Kore"],
    "Kuje": ["Kuje Town", "Chibiri", "Gudun Karya"],
    "Abaji": ["Abaji Town", "Yaba", "Nuku"],
    "Kwali": ["Kwali Town", "Yangoji", "Pai"],
  },
  "Lagos": {
    "Eti-Osa": ["Lekki", "Victoria Island", "Ikoyi", "Ajah", "Oniru", "Banana Island"],
    "Ikeja": ["Ikeja GRA", "Allen", "Opebi", "Maryland", "Ogba"],
    "Lekki": ["Lekki Phase 1", "Lekki Phase 2", "Chevron", "Ikate", "Osapa London"],
    "Surulere": ["Surulere", "Aguda", "Itire"],
    "Ajeromi-Ifelodun": ["Ajegunle", "Amukoko", "Tolu"],
    "Alimosho": ["Egbeda", "Ikotun", "Igando", "Akowonjo"],
    "Kosofe": ["Magodo", "Ketu", "Ojota", "Ogudu"],
    "Ibeju-Lekki": ["Ibeju", "Awoyaya", "Sangotedo", "Abijo"],
    "Eko (Lagos Island)": ["Lagos Island", "Marina", "Obalende"],
  },
  "Rivers": {
    "Port Harcourt": ["Old GRA", "New GRA", "D-Line", "Trans Amadi", "Rumuola"],
    "Obio-Akpor": ["Rumuokoro", "Eliozu", "Woji", "Ada George"],
    "Eleme": ["Onne", "Alesa", "Aleto"],
    "Okrika": ["Okrika Town", "Ogoloma"],
  },
  "Kano": {
    "Kano Municipal": ["Sabon Gari", "Fagge", "Bompai", "Nassarawa GRA"],
    "Tarauni": ["Tarauni", "Hotoro"],
    "Nasarawa": ["Nasarawa GRA", "Kawo"],
  },
  "Oyo": {
    "Ibadan North": ["Bodija", "Agbowo", "Sango", "Mokola", "UI"],
    "Ibadan South-West": ["Ring Road", "Challenge", "Apata"],
    "Ibadan North-West": ["Onireke", "Jericho", "Eleyele"],
    "Egbeda": ["Egbeda", "Olodo"],
    "Oluyole": ["Oluyole Estate", "New Garage"],
  },
  "Kaduna": {
    "Kaduna North": ["Kawo", "Ungwan Rimi GRA", "Malali"],
    "Kaduna South": ["Barnawa", "Sabon Tasha", "Kakuri"],
    "Chikun": ["Narayi", "Sabon Tasha", "Kujama"],
    "Zaria": ["Sabon Gari", "Tudun Wada", "Samaru"],
  },
  "Enugu": {
    "Enugu North": ["GRA", "Ogui", "New Haven", "Independence Layout"],
    "Enugu South": ["Achara Layout", "Uwani", "Maryland"],
    "Enugu East": ["Abakpa", "Trans Ekulu", "Emene"],
    "Nsukka": ["Nsukka Town", "UNN"],
  },
  "Anambra": {
    "Awka South": ["Awka", "Amawbia", "Nibo"],
    "Onitsha North": ["Onitsha GRA", "Inland Town"],
    "Onitsha South": ["Fegge", "Odoakpu"],
    "Nnewi North": ["Nnewi Town", "Otolo"],
  },
  "Delta": {
    "Warri South": ["Warri GRA", "Effurun", "Airport Road"],
    "Uvwie": ["Effurun", "Ekpan"],
    "Oshimili South": ["Asaba", "Cable Point", "Okwe"],
  },
  "Edo": {
    "Oredo": ["GRA", "Ikpoba Hill", "Ring Road", "Sapele Road"],
    "Ikpoba Okha": ["Ugbowo", "Aduwawa"],
    "Egor": ["Uselu", "Ugbowo"],
  },
  "Ogun": {
    "Abeokuta South": ["Ibara GRA", "Onikolobo", "Ake"],
    "Abeokuta North": ["Iberekodo", "Lafenwa"],
    "Ado-Odo/Ota": ["Ota", "Sango Ota", "Iju"],
    "Ifo": ["Ifo Town", "Akute", "Ojodu Berger"],
    "Obafemi Owode": ["Mowe", "Ibafo", "Magboro"],
  },
  "Akwa Ibom": {
    "Uyo": ["Uyo GRA", "Ewet Housing", "Aka Road"],
    "Eket": ["Eket Town", "Esit Eket"],
  },
  "Cross River": {
    "Calabar Municipal": ["State Housing", "Diamond Hill", "Ikot Ansa"],
    "Calabar South": ["Anantigha", "Henshaw Town"],
  },
  "Plateau": {
    "Jos North": ["Rayfield", "Jenta", "Old Airport"],
    "Jos South": ["Bukuru", "Vom"],
  },
  "Nasarawa": {
    "Karu": ["Mararaba", "Ado", "New Karu"],
    "Lafia": ["Lafia Town", "Bukan Sidi"],
  },
  "Niger": {
    "Chanchaga": ["Minna Central", "Tunga"],
    "Bosso": ["Bosso Town", "Maitumbi"],
  },
  "Imo": {
    "Owerri Municipal": ["Owerri GRA", "New Owerri", "Aladinma"],
    "Owerri North": ["Egbu", "Naze"],
  },
  "Abia": {
    "Aba North": ["GRA", "Ariaria"],
    "Umuahia North": ["Umuahia GRA", "World Bank"],
  },
  "Kwara": {
    "Ilorin West": ["GRA", "Tanke", "Asa Dam"],
    "Ilorin East": ["Oke Oyi", "Gambari"],
  },
  "Osun": {
    "Osogbo": ["Osogbo GRA", "Oke Fia"],
    "Ife Central": ["Ile Ife", "OAU"],
  },
  "Ondo": {
    "Akure South": ["Akure GRA", "Alagbaka", "Ijapo"],
    "Ondo West": ["Ondo Town", "Yaba"],
  },
  "Ekiti": {
    "Ado Ekiti": ["Ado GRA", "Adebayo", "Basiri"],
  },
  "Bayelsa": {
    "Yenagoa": ["Yenagoa Town", "Amarata", "Opolo"],
  },
  "Benue": {
    "Makurdi": ["High Level", "Wadata", "Wurukum"],
  },
  "Borno": {
    "Maiduguri": ["GRA", "Bulumkutu"],
  },
  "Sokoto": {
    "Sokoto North": ["Sokoto Central", "Mabera"],
  },
  "Bauchi": {
    "Bauchi": ["Bauchi GRA", "Wunti"],
  },
  "Kebbi": {
    "Birnin Kebbi": ["Birnin Kebbi", "Gesse"],
  },
  "Adamawa": {
    "Yola North": ["Jimeta", "Yola Town"],
  },
  "Taraba": {
    "Jalingo": ["Jalingo Town", "Magami"],
  },
  "Gombe": {
    "Gombe": ["GRA", "Tudun Wada"],
  },
  "Yobe": {
    "Damaturu": ["Damaturu Town"],
  },
  "Katsina": {
    "Katsina": ["Katsina GRA", "Kofar Kaura"],
  },
  "Jigawa": {
    "Dutse": ["Dutse Town"],
  },
  "Zamfara": {
    "Gusau": ["Gusau Central"],
  },
  "Kogi": {
    "Lokoja": ["Lokoja GRA", "Felele"],
  },
  "Ebonyi": {
    "Abakaliki": ["Abakaliki Town", "Kpiri Kpiri"],
  },
};

export const NIGERIA_STATES = Object.keys(NIGERIA_LOCATIONS).sort();

export const HIGH_END_AREAS = ["Maitama", "Asokoro", "Lekki", "Victoria Island", "Ikoyi", "Banana Island", "Old GRA"];

export const STRUCTURE_CATEGORIES = ["Detached", "Semi-detached", "Terrace"];
export const BUILDING_CATEGORIES = ["Duplex", "Bungalow", "Apartment / Block of Flat"];
export const PURCHASE_NATURES = ["Rent", "Purchase", "Mortgage"];
