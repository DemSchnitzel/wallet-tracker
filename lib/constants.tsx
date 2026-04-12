import { 
  ShoppingCart01Icon, PartyIcon, Ticket01Icon, ShoppingBag01Icon, Car01Icon, Package01Icon, 
  RestaurantIcon, Medicine01Icon, GiftIcon, Dumbbell01Icon, Luggage01Icon, Home01Icon
} from '@hugeicons/core-free-icons';
import { Category } from '@/types';

export const CATEGORY_META: Record<Category, { icon: any, tags: string[] }> = {
  'Supermarkt & Drogerie': { icon: ShoppingCart01Icon, tags: ['lebensmittel', 'essen', 'trinken', 'einkauf', 'rewe', 'aldi', 'edeka', 'lidl', 'kaufland', 'dm', 'rossmann', 'müller', 'getränke', 'snacks', 'putzmittel', 'wochenmarkt', 'kiosk', 'bäcker'] },
  'Restaurant & Café': { icon: RestaurantIcon, tags: ['essen', 'trinken', 'auswärts', 'mittagessen', 'abendessen', 'kaffee', 'kuchen', 'bäcker', 'mcdonalds', 'burger king', 'subway', 'lieferando', 'fast food', 'döner', 'sushi', 'pizza', 'kantine', 'eisdiele', 'trinkgeld'] },
  'Ausgehen & Party': { icon: PartyIcon, tags: ['club', 'bar', 'bier', 'cocktail', 'feiern', 'alkohol', 'wein', 'kneipe', 'eintritt', 'garderobe', 'späti', 'katerfrühstück'] },
  'Kultur & Events': { icon: Ticket01Icon, tags: ['kino', 'theater', 'konzert', 'museum', 'ausstellung', 'ticket', 'eintritt', 'festival', 'comedy', 'popcorn', 'eventim'] },
  'Shopping': { icon: ShoppingBag01Icon, tags: ['kleidung', 'schuhe', 'elektronik', 'amazon', 'zalando', 'klamotten', 'h&m', 'zara', 'media markt', 'saturn', 'bücher', 'accessoires', 'schmuck', 'schreibwaren', 'apps', 'software'] },
  'Mobilität': { icon: Car01Icon, tags: ['auto', 'tanken', 'benzin', 'mvg', 'bvg', 'bahn', 'zug', 'bus', 'ticket', 'db', 'öpnv', 'fahrrad', 'taxi', 'uber', 'parken', 'e-scooter', 'carsharing', 'miles', 'maut'] },
  'Gesundheit & Pflege': { icon: Medicine01Icon, tags: ['apotheke', 'arzt', 'medikamente', 'friseur', 'kosmetik', 'massage', 'therapie', 'kontaktlinsen', 'kosmetikstudio', 'zuzahlung', 'pflaster', 'drogerieartikel'] },
  'Geschenke & Mitbringsel': { icon: GiftIcon, tags: ['geburtstag', 'weihnachten', 'präsent', 'blumen', 'spende', 'hochzeit', 'wein', 'gutschein', 'grußkarte', 'aufmerksamkeit'] },
  'Hobbys & Sport': { icon: Dumbbell01Icon, tags: ['schwimmen', 'fahrrad', 'ausrüstung', 'spiele', 'gaming', 'steam', 'ps', 'playstation', 'nintendo', 'schwimmbad', 'klettern', 'bouldern', 'fitness', 'videospiele', 'basteln', 'wolle', 'sportbekleidung', 'brettspiele'] },
  'Urlaub & Ausflüge': { icon: Luggage01Icon, tags: ['reise', 'hotel', 'flug', 'zug', 'airbnb', 'ferien', 'booking', 'ausland', 'verpflegung', 'ausflug', 'souvenirs', 'mietwagen', 'sightseeing', 'kurtaxe', 'hostel', 'reiseverpflegung'] },
  'Wohnen & Haushalt': { icon: Home01Icon, tags: ['möbel', 'baumarkt', 'ikea', 'dekoration', 'putzmittel', 'obi', 'pflanzen', 'deko', 'batterien', 'werkzeug', 'geschirr', 'haushaltsgeräte', 'reparatur'] },
  'Sonstiges': { icon: Package01Icon, tags: ['strafe', 'spende', 'porto', 'post', 'gebühren', 'blitzer', 'verlust', 'spontan','behörden', 'sonstiges'] }
};

export const currencyFormatter = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
export const formatCurrency = (value: number) => currencyFormatter.format(value);