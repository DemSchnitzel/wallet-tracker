import { 
  ShoppingCart01Icon, PartyIcon, Ticket01Icon, ShoppingBag01Icon, Car01Icon, Package01Icon, 
  RestaurantIcon, Medicine01Icon, GiftIcon, Dumbbell01Icon, Luggage01Icon, Home01Icon
} from '@hugeicons/core-free-icons';
import { Category } from '@/types';

export const CATEGORY_META: Record<Category, { icon: any, color: string, chartColor: string, tags: string[] }> = {
  'Supermarkt & Drogerie': { icon: ShoppingCart01Icon, color: '#F3FAF5', chartColor: '#CEE9DD', tags: ['lebensmittel', 'essen', 'trinken', 'einkauf', 'rewe', 'aldi', 'edeka', 'lidl', 'kaufland', 'dm', 'rossmann', 'müller', 'getränke', 'snacks', 'putzmittel', 'wochenmarkt', 'kiosk', 'bäcker'] },
  'Restaurant & Imbiss': { icon: RestaurantIcon, color: '#FFF7ED', chartColor: '#FFD8E9', tags: ['essen', 'trinken', 'auswärts', 'mittagessen', 'abendessen', 'kaffee', 'kuchen', 'bäcker', 'mcdonalds', 'burger king', 'subway', 'lieferando', 'fast food', 'döner', 'sushi', 'pizza', 'kantine', 'eisdiele', 'trinkgeld'] },
  'Ausgehen & Party': { icon: PartyIcon, color: '#FDF5FA', chartColor: '#F6D9FF', tags: ['club', 'bar', 'bier', 'cocktail', 'feiern', 'alkohol', 'wein', 'kneipe', 'eintritt', 'garderobe', 'späti', 'katerfrühstück'] },
  'Kultur & Events': { icon: Ticket01Icon, color: '#F2F5FF', chartColor: '#D4E3FF', tags: ['kino', 'theater', 'konzert', 'museum', 'ausstellung', 'ticket', 'eintritt', 'festival', 'comedy', 'popcorn', 'eventim'] },
  'Shopping': { icon: ShoppingBag01Icon, color: '#FFF7F8', chartColor: '#FFD8E9', tags: ['kleidung', 'schuhe', 'elektronik', 'amazon', 'zalando', 'klamotten', 'h&m', 'zara', 'media markt', 'saturn', 'bücher', 'accessoires', 'schmuck', 'schreibwaren', 'apps', 'software'] },
  'Mobilität': { icon: Car01Icon, color: '#F0F9FF', chartColor: '#BDE9FF', tags: ['auto', 'tanken', 'benzin', 'mvg', 'bvg', 'bahn', 'zug', 'bus', 'ticket', 'db', 'öpnv', 'fahrrad', 'taxi', 'uber', 'parken', 'e-scooter', 'carsharing', 'miles', 'maut'] },
  'Gesundheit & Pflege': { icon: Medicine01Icon, color: '#F3FDFB', chartColor: '#BAF1ED', tags: ['apotheke', 'arzt', 'medikamente', 'friseur', 'kosmetik', 'massage', 'therapie', 'kontaktlinsen', 'kosmetikstudio', 'zuzahlung', 'pflaster', 'drogerieartikel'] },
  'Geschenke & Mitbringsel': { icon: GiftIcon, color: '#F7F3FC', chartColor: '#E2DFFF', tags: ['geburtstag', 'weihnachten', 'präsent', 'blumen', 'spende', 'hochzeit', 'wein', 'gutschein', 'grußkarte', 'aufmerksamkeit'] },
  'Hobbys & Sport': { icon: Dumbbell01Icon, color: '#FFFBEB', chartColor: '#ECEAB3', tags: ['schwimmen', 'fahrrad', 'ausrüstung', 'spiele', 'gaming', 'steam', 'ps', 'playstation', 'nintendo', 'schwimmbad', 'klettern', 'bouldern', 'fitness', 'videospiele', 'basteln', 'wolle', 'sportbekleidung', 'brettspiele'] },
  'Urlaub & Ausflüge': { icon: Luggage01Icon, color: '#F0FDF4', chartColor: '#CDF6E4', tags: ['reise', 'hotel', 'flug', 'zug', 'airbnb', 'ferien', 'booking', 'ausland', 'verpflegung', 'ausflug', 'souvenirs', 'mietwagen', 'sightseeing', 'kurtaxe', 'hostel', 'reiseverpflegung'] },
  'Wohnen & Haushalt': { icon: Home01Icon, color: '#F5F5F4', chartColor: '#D6D6CF', tags: ['möbel', 'baumarkt', 'ikea', 'dekoration', 'putzmittel', 'obi', 'pflanzen', 'deko', 'batterien', 'werkzeug', 'geschirr', 'haushaltsgeräte', 'reparatur'] },
  'Sonstiges': { icon: Package01Icon, color: '#F4F4F5', chartColor: '#E1E1E5', tags: ['strafe', 'spende', 'porto', 'post', 'gebühren', 'blitzer', 'verlust', 'spontan','behörden', 'sonstiges'] }
};

export const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const formatCurrency = (value: number) => currencyFormatter.format(value);