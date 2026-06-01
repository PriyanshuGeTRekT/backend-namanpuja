/**
 * Source data for seeding namanpuja.com.
 *
 * North India focus: major spiritual cities, their flagship temples, and the
 * core set of home/e-pujas. The SEO landing-page copy for every puja × city
 * combination is generated from this data by `generateContent.ts`, mirroring
 * the structure of the reference content document.
 */

export interface PujaSeed {
  name: string;
  subtitle: string;
  deity: string;
  category: string;
  serviceType: 'EPUJA' | 'HOME_VISIT' | 'BOTH';
  durationMin: number;
  basePrice: number;
  shortDesc: string;
  description: string;
  scripture?: string;
  benefits: string[];
  rituals: { name: string; description: string }[];
  samagri: { group: string; items: string[] }[];
  occasions: string[];
  isFeatured?: boolean;
}

export interface TempleSeed {
  name: string;
  deity: string;
  shortDesc: string;
  description: string;
  significance: string;
  timings: string;
  isFeatured?: boolean;
}

export interface CitySeed {
  name: string;
  state: string;
  geoRegion: string; // ISO 3166-2, e.g. "IN-UP"
  latitude: number;
  longitude: number;
  isPopular?: boolean;
  /** Nearby suburbs/areas served — used for the "Serving Families Across…" block. */
  serviceAreas: string[];
  temples: TempleSeed[];
}

export const COUNTRIES = [
  { name: 'India', slug: 'india', isoCode: 'IN', flagEmoji: '🇮🇳', sortOrder: 1, enabled: true },
  { name: 'United States', slug: 'united-states', isoCode: 'US', flagEmoji: '🇺🇸', sortOrder: 2, enabled: true },
  { name: 'United Kingdom', slug: 'united-kingdom', isoCode: 'GB', flagEmoji: '🇬🇧', sortOrder: 3, enabled: true },
  { name: 'Canada', slug: 'canada', isoCode: 'CA', flagEmoji: '🇨🇦', sortOrder: 4, enabled: true },
  { name: 'Australia', slug: 'australia', isoCode: 'AU', flagEmoji: '🇦🇺', sortOrder: 5, enabled: true },
];

export const PUJA_CATEGORIES = [
  { name: 'Home Pujas', slug: 'home-pujas', icon: 'home', sortOrder: 1, description: 'Sacred ceremonies performed at your residence by experienced Vedic priests.' },
  { name: 'Griha Pravesh', slug: 'griha-pravesh', icon: 'door-open', sortOrder: 2, description: 'Housewarming ceremonies to invite peace and prosperity into a new home.' },
  { name: 'Festival Pujas', slug: 'festival-pujas', icon: 'sparkles', sortOrder: 3, description: 'Celebrate Hindu festivals with authentic rituals and devotion.' },
  { name: 'Special Anushthan', slug: 'special-anushthan', icon: 'flame', sortOrder: 4, description: 'Specialised Vedic anushthans for specific blessings and remedies.' },
];

export const PUJAS: PujaSeed[] = [
  {
    name: 'Satyanarayan Puja',
    subtitle: 'Seek the blessings of Lord Vishnu for truth, prosperity and family well-being',
    deity: 'Lord Vishnu (Satyanarayan)',
    category: 'Home Pujas',
    serviceType: 'BOTH',
    durationMin: 150,
    basePrice: 5100,
    isFeatured: true,
    scripture: 'Skanda Purana',
    shortDesc:
      'A sacred ceremony dedicated to Lord Vishnu in his Satyanarayan form, performed for prosperity, family harmony and divine protection.',
    description:
      'Satyanarayan Puja is dedicated to Lord Vishnu in his Satyanarayan form, who symbolises truth, righteousness, prosperity and divine protection. Described in the Skanda Purana, it has been performed by devotees for centuries to seek blessings for prosperity, good health, professional success and the fulfilment of wishes. The word "Satya" means truth, while "Narayan" refers to Lord Vishnu — together making Satyanarayan the embodiment of eternal truth and divine guidance.',
    benefits: [
      'Attract positive energy and a spiritually uplifting atmosphere at home',
      'Invite prosperity, abundance and financial stability',
      'Remove obstacles and relief from challenges and difficulties',
      'Promote harmony, love and unity within the family',
      'Encourage spiritual growth and deeper connection with Lord Vishnu',
      'Receive divine protection for the entire family',
    ],
    rituals: [
      { name: 'Ganesh Puja', description: "Seeking Lord Ganesha's blessings before beginning the ceremony." },
      { name: 'Sankalp', description: 'A sacred declaration stating the purpose of the puja.' },
      { name: 'Kalash Sthapana', description: 'Installation of the holy Kalash representing divine energy.' },
      { name: 'Invocation of Lord Satyanarayan', description: 'Special Vedic mantras dedicated to Lord Vishnu.' },
      { name: 'Panchamrit Preparation', description: 'Preparation of the sacred offering of milk, yogurt, honey, sugar and ghee.' },
      { name: 'Satyanarayan Katha', description: 'Narration of the sacred story explaining the significance and blessings of the puja.' },
      { name: 'Aarti and Bhajans', description: 'Devotional prayers and hymns performed by family members and devotees.' },
      { name: 'Prasad Distribution', description: 'Sharing blessed offerings among all participants.' },
    ],
    samagri: [
      { group: 'Essential Puja Items', items: ['Kalash', 'Coconut', 'Mango Leaves', 'Rice', 'Kumkum', 'Turmeric', 'Sandalwood Paste', 'Sacred Thread', 'Betel Leaves', 'Betel Nuts', 'Incense Sticks', 'Camphor', 'Ghee Lamp'] },
      { group: 'Fruits and Offerings', items: ['Bananas', 'Apples', 'Oranges', 'Grapes', 'Seasonal Fruits'] },
      { group: 'Panchamrit Ingredients', items: ['Milk', 'Yogurt', 'Honey', 'Sugar', 'Ghee'] },
      { group: 'Prasad Ingredients', items: ['Suji (semolina)', 'Wheat Flour', 'Banana', 'Dry Fruits', 'Cardamom', 'Sugar'] },
      { group: 'Additional Items', items: ['Fresh Flowers', 'Garlands', 'Puja Plate', 'Holy Water', 'Bell', 'Vishnu Image or Idol'] },
    ],
    occasions: ['Housewarming (Griha Pravesh)', 'Birthdays', 'Wedding Anniversaries', 'Child Blessing Ceremonies', 'New Business Openings', 'Career Milestones', 'Thanksgiving Ceremonies', 'Family Gatherings'],
  },
  {
    name: 'Griha Pravesh Puja',
    subtitle: 'Invite peace, positivity and prosperity into your new home',
    deity: 'Lord Ganesha & Vastu Devata',
    category: 'Griha Pravesh',
    serviceType: 'HOME_VISIT',
    durationMin: 180,
    basePrice: 7100,
    isFeatured: true,
    shortDesc:
      'A traditional housewarming ceremony performed before moving into a new home to invite prosperity, positive energy and divine protection.',
    description:
      'Griha Pravesh is one of the most important Hindu ceremonies, performed before a family enters a newly constructed or newly purchased home. The rituals purify the space, balance its Vastu energies and invoke the blessings of Lord Ganesha, the Navagrahas and the Vastu Purush so that the household is filled with peace, health and prosperity.',
    benefits: [
      'Purify and energise the new home before moving in',
      'Balance Vastu energies for harmony and well-being',
      'Invite prosperity, happiness and positive energy',
      'Protect the family from negativity and obstacles',
      'Begin a new chapter with divine blessings',
    ],
    rituals: [
      { name: 'Ganesh Puja', description: 'Invoking Lord Ganesha to remove obstacles.' },
      { name: 'Kalash Sthapana', description: 'Establishing the sacred Kalash at the entrance.' },
      { name: 'Vastu Shanti', description: 'Pacifying the Vastu Purush and the directional deities.' },
      { name: 'Navagraha Puja', description: 'Honouring the nine planetary deities for favourable influences.' },
      { name: 'Havan', description: 'Sacred fire ritual to purify the home and surroundings.' },
      { name: 'Aarti and Prasad', description: 'Concluding prayers and distribution of blessed offerings.' },
    ],
    samagri: [
      { group: 'Essential Puja Items', items: ['Kalash', 'Coconut', 'Mango Leaves', 'Rice', 'Kumkum', 'Turmeric', 'Sacred Thread', 'Betel Leaves', 'Betel Nuts', 'Camphor', 'Ghee Lamp'] },
      { group: 'Havan Samagri', items: ['Havan Kund', 'Mango Wood', 'Havan Samagri Mix', 'Ghee', 'Camphor', 'Cow Dung Cakes'] },
      { group: 'Additional Items', items: ['Fresh Flowers', 'Garlands', 'Puja Plate', 'Holy Water', 'Bell', 'Navagraha Samagri'] },
    ],
    occasions: ['Moving into a new home', 'New apartment or flat', 'New office or shop', 'House renovation completion'],
  },
  {
    name: 'Ganesh Puja',
    subtitle: 'Begin every new venture with the blessings of Lord Ganesha',
    deity: 'Lord Ganesha',
    category: 'Home Pujas',
    serviceType: 'BOTH',
    durationMin: 90,
    basePrice: 3100,
    isFeatured: true,
    shortDesc:
      'Worship of Lord Ganesha, the remover of obstacles and the deity of beginnings, wisdom and success.',
    description:
      'Ganesh Puja invokes Lord Ganesha — the remover of obstacles (Vighnaharta) and the lord of new beginnings, wisdom and prosperity. Performed before any auspicious undertaking, the puja clears the path to success and fills the home with positivity and good fortune.',
    benefits: [
      'Remove obstacles from new ventures and endeavours',
      'Invite wisdom, knowledge and clarity of mind',
      'Attract success, prosperity and good fortune',
      'Create an auspicious start to any important undertaking',
      'Fill the home with positive energy',
    ],
    rituals: [
      { name: 'Sankalp', description: 'Stating the intention of the puja.' },
      { name: 'Ganesh Avahan', description: 'Inviting Lord Ganesha into the idol.' },
      { name: 'Shodashopachar Puja', description: 'Sixteen-step traditional worship of the deity.' },
      { name: 'Ganesh Atharvashirsha', description: 'Recitation of the sacred Ganesh hymn.' },
      { name: 'Aarti and Modak Bhog', description: "Devotional aarti and offering of Lord Ganesha's favourite modak." },
    ],
    samagri: [
      { group: 'Essential Puja Items', items: ['Ganesh Idol', 'Kalash', 'Coconut', 'Durva Grass', 'Red Flowers', 'Kumkum', 'Turmeric', 'Sandalwood Paste', 'Incense Sticks', 'Camphor', 'Ghee Lamp'] },
      { group: 'Bhog / Prasad', items: ['Modak', 'Laddu', 'Bananas', 'Jaggery', 'Seasonal Fruits'] },
      { group: 'Additional Items', items: ['Fresh Flowers', 'Garlands', 'Puja Plate', 'Holy Water', 'Bell'] },
    ],
    occasions: ['Ganesh Chaturthi', 'New business or venture', 'Before weddings and ceremonies', 'Vehicle or property purchase', 'Examinations and new beginnings'],
  },
  {
    name: 'Lakshmi Puja',
    subtitle: 'Welcome wealth, abundance and good fortune with Goddess Lakshmi',
    deity: 'Goddess Lakshmi',
    category: 'Festival Pujas',
    serviceType: 'BOTH',
    durationMin: 120,
    basePrice: 4100,
    shortDesc:
      'Worship of Goddess Lakshmi, the bestower of wealth, prosperity, abundance and well-being.',
    description:
      'Lakshmi Puja honours Goddess Lakshmi, the divine source of wealth, prosperity and abundance. Performed especially during Diwali and on auspicious days, the puja invites material and spiritual prosperity, financial stability and the grace of the Goddess into the home and business.',
    benefits: [
      'Attract wealth, abundance and financial stability',
      'Invite prosperity into home and business',
      'Remove financial obstacles and debts',
      'Encourage generosity, gratitude and contentment',
      'Receive the grace and blessings of Goddess Lakshmi',
    ],
    rituals: [
      { name: 'Kalash & Lakshmi Sthapana', description: 'Establishing the Kalash and the idol of Goddess Lakshmi.' },
      { name: 'Shodashopachar Puja', description: 'Sixteen-step traditional worship.' },
      { name: 'Shri Suktam Recitation', description: 'Chanting of the Vedic hymn to Goddess Lakshmi.' },
      { name: 'Kuber Puja', description: 'Worship of Lord Kuber, the treasurer of the gods.' },
      { name: 'Aarti and Prasad', description: 'Concluding aarti and distribution of prasad.' },
    ],
    samagri: [
      { group: 'Essential Puja Items', items: ['Lakshmi Idol or Image', 'Kalash', 'Coconut', 'Lotus Flowers', 'Kumkum', 'Turmeric', 'Cowrie Shells', 'Incense Sticks', 'Camphor', 'Ghee Lamp', 'Silver Coins'] },
      { group: 'Bhog / Prasad', items: ['Kheer', 'Batasha', 'Sweets', 'Seasonal Fruits', 'Dry Fruits'] },
      { group: 'Additional Items', items: ['Fresh Flowers', 'Garlands', 'Puja Plate', 'Holy Water', 'Bell', 'Rangoli Colours'] },
    ],
    occasions: ['Diwali', 'Dhanteras', 'New business openings', 'Akshaya Tritiya', 'Friday Lakshmi worship'],
  },
  {
    name: 'Rudrabhishek Puja',
    subtitle: 'Invoke the supreme blessings of Lord Shiva through sacred abhishekam',
    deity: 'Lord Shiva',
    category: 'Special Anushthan',
    serviceType: 'BOTH',
    durationMin: 150,
    basePrice: 6100,
    isFeatured: true,
    shortDesc:
      'A powerful Vedic ritual of bathing the Shiva Linga with sacred substances while chanting the Rudram, for health, peace and removal of negativity.',
    description:
      'Rudrabhishek is among the most powerful Vedic rituals, in which the Shiva Linga is bathed (abhishek) with sacred substances such as milk, honey, ghee and Gangajal while the Rudram is chanted. It is performed to invoke Lord Shiva for good health, peace, removal of negativity and fulfilment of sincere wishes.',
    benefits: [
      'Bestow good health and longevity',
      'Remove negativity, fear and malefic influences',
      'Bring peace of mind and inner strength',
      'Fulfil sincere wishes and remove obstacles',
      'Bless the devotee with spiritual elevation',
    ],
    rituals: [
      { name: 'Sankalp & Ganesh Puja', description: 'Setting the intention and invoking Lord Ganesha.' },
      { name: 'Kalash Sthapana', description: 'Establishing the sacred Kalash.' },
      { name: 'Rudrabhishek', description: 'Abhishek of the Shiva Linga with Panchamrit and Gangajal.' },
      { name: 'Rudram Chanting', description: 'Recitation of the sacred Sri Rudram.' },
      { name: 'Bilva Patra Archana', description: 'Offering of Bilva leaves to Lord Shiva.' },
      { name: 'Aarti and Prasad', description: 'Concluding aarti and distribution of prasad.' },
    ],
    samagri: [
      { group: 'Abhishek Items', items: ['Shiva Linga', 'Milk', 'Yogurt', 'Honey', 'Ghee', 'Sugar', 'Gangajal', 'Bilva Patra (Bel leaves)', 'Bhang / Dhatura (optional)'] },
      { group: 'Essential Puja Items', items: ['Kalash', 'Coconut', 'White Flowers', 'Kumkum', 'Sandalwood Paste', 'Sacred Ash (Vibhuti)', 'Incense Sticks', 'Camphor', 'Ghee Lamp'] },
      { group: 'Additional Items', items: ['Fresh Flowers', 'Garlands', 'Puja Plate', 'Holy Water', 'Bell'] },
    ],
    occasions: ['Maha Shivratri', 'Shravan Maas (Mondays)', 'Health and recovery', 'Removal of doshas', 'Spiritual upliftment'],
  },
  {
    name: 'Navagraha Shanti Puja',
    subtitle: 'Harmonise planetary influences for peace, success and protection',
    deity: 'Navagraha (Nine Planetary Deities)',
    category: 'Special Anushthan',
    serviceType: 'BOTH',
    durationMin: 150,
    basePrice: 5500,
    shortDesc:
      'A Vedic ceremony to pacify the nine planetary deities (Navagraha) and reduce the malefic effects of unfavourable planetary positions.',
    description:
      'Navagraha Shanti Puja is performed to harmonise the influence of the nine planets (Surya, Chandra, Mangal, Budh, Guru, Shukra, Shani, Rahu and Ketu). By pacifying malefic planetary positions in the horoscope, the puja brings peace, success, good health and protection from obstacles.',
    benefits: [
      'Reduce the malefic effects of unfavourable planets',
      'Bring peace, stability and success in life',
      'Protect from accidents, delays and obstacles',
      'Improve health, career and relationships',
      'Strengthen favourable planetary influences',
    ],
    rituals: [
      { name: 'Sankalp & Ganesh Puja', description: 'Setting the intention and invoking Lord Ganesha.' },
      { name: 'Navagraha Sthapana', description: 'Installation and invocation of the nine planetary deities.' },
      { name: 'Graha Mantra Japa', description: 'Chanting of the specific mantras for each planet.' },
      { name: 'Havan', description: 'Sacred fire ritual with offerings for each graha.' },
      { name: 'Aarti and Prasad', description: 'Concluding aarti and distribution of prasad.' },
    ],
    samagri: [
      { group: 'Essential Puja Items', items: ['Navagraha Yantra', 'Kalash', 'Coconut', 'Nine-coloured Cloth', 'Kumkum', 'Turmeric', 'Nine Grains (Navadhanya)', 'Incense Sticks', 'Camphor', 'Ghee Lamp'] },
      { group: 'Havan Samagri', items: ['Havan Kund', 'Mango Wood', 'Havan Samagri Mix', 'Ghee', 'Black Sesame', 'Barley'] },
      { group: 'Additional Items', items: ['Fresh Flowers', 'Garlands', 'Puja Plate', 'Holy Water', 'Bell'] },
    ],
    occasions: ['Shani Sade Sati', 'Rahu-Ketu dosha', 'Career or health troubles', 'Before major life decisions', 'Annual planetary remedy'],
  },
];

export const CITIES: CitySeed[] = [
  {
    name: 'Varanasi', state: 'Uttar Pradesh', geoRegion: 'IN-UP', latitude: 25.3176, longitude: 82.9739, isPopular: true,
    serviceAreas: ['Assi Ghat', 'Dashashwamedh', 'Sigra', 'Lanka', 'Bhelupur', 'Sarnath', 'Cantt', 'Mahmoorganj', 'Sigra', 'Ramnagar'],
    temples: [
      { name: 'Kashi Vishwanath Temple', deity: 'Lord Shiva', shortDesc: 'One of the twelve Jyotirlingas, the spiritual heart of Varanasi.', description: 'The Kashi Vishwanath Temple, dedicated to Lord Shiva, is one of the most revered Hindu temples and houses one of the twelve sacred Jyotirlingas. Situated on the western bank of the holy Ganga, it has been a centre of faith for millennia.', significance: 'Believed to grant liberation (moksha), a darshan of Kashi Vishwanath is considered the pinnacle of a devotee’s spiritual journey.', timings: '3:00 AM – 11:00 PM', isFeatured: true },
      { name: 'Sankat Mochan Hanuman Temple', deity: 'Lord Hanuman', shortDesc: 'A revered temple of Lord Hanuman founded by Tulsidas.', description: 'The Sankat Mochan Hanuman Temple is dedicated to Lord Hanuman and is believed to have been established by the saint-poet Tulsidas. Devotees visit to seek relief from troubles and obstacles.', significance: 'Known as the remover of troubles ("Sankat Mochan"), the temple draws thousands of devotees on Tuesdays and Saturdays.', timings: '5:00 AM – 10:00 PM' },
    ],
  },
  {
    name: 'Ayodhya', state: 'Uttar Pradesh', geoRegion: 'IN-UP', latitude: 26.7922, longitude: 82.1998, isPopular: true,
    serviceAreas: ['Ram Janmabhoomi', 'Hanuman Garhi', 'Naya Ghat', 'Ranopali', 'Sahadatganj', 'Faizabad'],
    temples: [
      { name: 'Ram Janmabhoomi Mandir', deity: 'Lord Rama', shortDesc: 'The grand temple at the birthplace of Lord Rama.', description: 'The Ram Janmabhoomi Mandir marks the sacred birthplace of Lord Rama and is one of the most significant pilgrimage sites in Hinduism.', significance: 'A focal point of devotion for millions, the temple celebrates the ideal of dharma embodied by Lord Rama.', timings: '6:30 AM – 9:30 PM', isFeatured: true },
      { name: 'Hanuman Garhi', deity: 'Lord Hanuman', shortDesc: 'A hilltop temple of Lord Hanuman, the guardian of Ayodhya.', description: 'Hanuman Garhi is a 10th-century temple of Lord Hanuman, traditionally visited before the darshan of Lord Rama.', significance: 'Believed to be where Hanuman guards the city of Ayodhya.', timings: '5:00 AM – 10:00 PM' },
    ],
  },
  {
    name: 'Prayagraj', state: 'Uttar Pradesh', geoRegion: 'IN-UP', latitude: 25.4358, longitude: 81.8463, isPopular: true,
    serviceAreas: ['Triveni Sangam', 'Civil Lines', 'Daraganj', 'Katra', 'Naini', 'Jhunsi'],
    temples: [
      { name: 'Triveni Sangam', deity: 'Sacred Confluence', shortDesc: 'The holy confluence of the Ganga, Yamuna and mythical Saraswati.', description: 'The Triveni Sangam is the sacred meeting point of three rivers and the site of the Kumbh Mela, the largest spiritual gathering on earth.', significance: 'A bath at the Sangam is believed to cleanse sins and grant spiritual merit.', timings: 'Open 24 hours', isFeatured: true },
      { name: 'Bade Hanuman Mandir', deity: 'Lord Hanuman', shortDesc: 'Famous reclining Hanuman temple near the Sangam.', description: 'The Bade Hanuman Mandir houses a unique reclining idol of Lord Hanuman and is a major draw for pilgrims to Prayagraj.', significance: 'Believed to bless devotees with strength and protection.', timings: '5:00 AM – 9:00 PM' },
    ],
  },
  {
    name: 'Mathura', state: 'Uttar Pradesh', geoRegion: 'IN-UP', latitude: 27.4924, longitude: 77.6737, isPopular: true,
    serviceAreas: ['Krishna Janmabhoomi', 'Vishram Ghat', 'Govardhan', 'Gokul', 'Mahavan', 'Chhata'],
    temples: [
      { name: 'Shri Krishna Janmabhoomi Temple', deity: 'Lord Krishna', shortDesc: 'The birthplace of Lord Krishna.', description: 'The Shri Krishna Janmabhoomi Temple marks the sacred birthplace of Lord Krishna and is among the holiest sites for devotees of Krishna.', significance: 'The spiritual centre of the Braj region, drawing devotees especially during Janmashtami.', timings: '5:00 AM – 9:30 PM', isFeatured: true },
      { name: 'Dwarkadhish Temple', deity: 'Lord Krishna', shortDesc: 'A historic temple of Lord Krishna near Vishram Ghat.', description: 'The Dwarkadhish Temple, built in 1814, is one of the most visited temples in Mathura, known for its intricate architecture.', significance: 'A vibrant centre of Krishna worship and festivals.', timings: '6:30 AM – 8:30 PM' },
    ],
  },
  {
    name: 'Vrindavan', state: 'Uttar Pradesh', geoRegion: 'IN-UP', latitude: 27.5650, longitude: 77.6593, isPopular: true,
    serviceAreas: ['Banke Bihari', 'ISKCON', 'Raman Reti', 'Seva Kunj', 'Prem Mandir', 'Chhatikara'],
    temples: [
      { name: 'Banke Bihari Temple', deity: 'Lord Krishna', shortDesc: 'One of the most beloved Krishna temples in Vrindavan.', description: 'The Banke Bihari Temple is dedicated to Lord Krishna in his Banke Bihari form and is among the most cherished temples in the Braj region.', significance: 'Famed for its unique darshan traditions and deep devotional atmosphere.', timings: '7:45 AM – 12:00 PM, 5:30 PM – 9:30 PM', isFeatured: true },
      { name: 'Prem Mandir', deity: 'Radha Krishna', shortDesc: 'A magnificent marble temple dedicated to Radha Krishna.', description: 'Prem Mandir is a stunning white-marble temple depicting the divine pastimes of Radha Krishna and Sita Ram.', significance: 'A modern landmark of devotion known for its illuminated evenings.', timings: '5:30 AM – 8:30 PM' },
    ],
  },
  {
    name: 'Haridwar', state: 'Uttarakhand', geoRegion: 'IN-UT', latitude: 29.9457, longitude: 78.1642, isPopular: true,
    serviceAreas: ['Har Ki Pauri', 'Kankhal', 'Jwalapur', 'Bhimgoda', 'Shantikunj', 'BHEL'],
    temples: [
      { name: 'Har Ki Pauri', deity: 'Mother Ganga', shortDesc: 'The most sacred ghat of Haridwar on the banks of the Ganga.', description: 'Har Ki Pauri is the most revered ghat in Haridwar, where the famous Ganga Aarti takes place every evening.', significance: 'Believed to bear the footprint of Lord Vishnu; a bath here is deeply auspicious.', timings: 'Open 24 hours; Aarti at sunset', isFeatured: true },
      { name: 'Mansa Devi Temple', deity: 'Goddess Mansa Devi', shortDesc: 'A hilltop temple of Goddess Mansa Devi.', description: 'The Mansa Devi Temple sits atop the Bilwa Parvat and is reached by ropeway, drawing pilgrims who tie sacred threads for wish-fulfilment.', significance: 'Believed to fulfil the sincere wishes of devotees.', timings: '8:00 AM – 5:00 PM' },
    ],
  },
  {
    name: 'Rishikesh', state: 'Uttarakhand', geoRegion: 'IN-UT', latitude: 30.0869, longitude: 78.2676, isPopular: true,
    serviceAreas: ['Lakshman Jhula', 'Ram Jhula', 'Tapovan', 'Muni Ki Reti', 'Swarg Ashram', 'Triveni Ghat'],
    temples: [
      { name: 'Triveni Ghat', deity: 'Mother Ganga', shortDesc: 'The principal bathing ghat of Rishikesh with grand Ganga Aarti.', description: 'Triveni Ghat is the largest and most sacred ghat in Rishikesh, famed for its mesmerising evening Maha Aarti.', significance: 'A holy spot for ritual baths, pind daan and Ganga worship.', timings: 'Open 24 hours; Aarti at sunset', isFeatured: true },
      { name: 'Neelkanth Mahadev Temple', deity: 'Lord Shiva', shortDesc: 'A revered Shiva temple set amidst the hills.', description: 'The Neelkanth Mahadev Temple marks the spot where Lord Shiva is believed to have consumed the poison from the cosmic ocean.', significance: 'A major Shaivite pilgrimage, especially during Shravan.', timings: '5:00 AM – 7:00 PM' },
    ],
  },
  {
    name: 'Delhi', state: 'Delhi', geoRegion: 'IN-DL', latitude: 28.6139, longitude: 77.2090, isPopular: true,
    serviceAreas: ['Chhatarpur', 'Dwarka', 'Rohini', 'Saket', 'Lajpat Nagar', 'Janakpuri', 'Pitampura', 'Vasant Kunj', 'Mayur Vihar', 'Karol Bagh'],
    temples: [
      { name: 'Akshardham Temple', deity: 'Bhagwan Swaminarayan', shortDesc: 'A grand temple complex showcasing Hindu art and spirituality.', description: 'Swaminarayan Akshardham is a sprawling temple complex renowned for its intricate carvings, exhibitions and devotional ambience.', significance: 'A modern spiritual and cultural landmark of the capital.', timings: '9:30 AM – 6:30 PM (closed Mondays)', isFeatured: true },
      { name: 'Chhatarpur Temple', deity: 'Goddess Katyayani', shortDesc: 'One of the largest temple complexes in India.', description: 'The Shri Adya Katyayani Shakti Peeth Mandir at Chhatarpur is dedicated to Goddess Katyayani and is among the largest temples in the country.', significance: 'A major Shakti shrine, especially vibrant during Navratri.', timings: '6:00 AM – 10:00 PM' },
    ],
  },
  {
    name: 'Amritsar', state: 'Punjab', geoRegion: 'IN-PB', latitude: 31.6340, longitude: 74.8723, isPopular: true,
    serviceAreas: ['Golden Temple area', 'Lawrence Road', 'Ranjit Avenue', 'Majitha Road', 'Mall Road', 'Hall Bazaar'],
    temples: [
      { name: 'Durgiana Temple', deity: 'Goddess Durga', shortDesc: 'A revered Hindu temple resembling the Golden Temple.', description: 'The Durgiana Temple, dedicated to Goddess Durga, is a major Hindu shrine known for its silver doors and lake-side architecture.', significance: 'A prominent centre of Devi worship in Punjab.', timings: '6:00 AM – 10:00 PM', isFeatured: true },
      { name: 'Mata Lal Devi Temple', deity: 'Mata Lal Devi', shortDesc: 'A unique cave-style temple dedicated to Mata Lal Devi.', description: 'The Mata Lal Devi Temple is known for its mirrored passages and cave-like shrine, attracting devotees seeking blessings of fertility and prosperity.', significance: 'Popular among devotees praying for children and family well-being.', timings: '6:00 AM – 9:00 PM' },
    ],
  },
  {
    name: 'Jaipur', state: 'Rajasthan', geoRegion: 'IN-RJ', latitude: 26.9124, longitude: 75.7873, isPopular: true,
    serviceAreas: ['Vaishali Nagar', 'Malviya Nagar', 'Mansarovar', 'C-Scheme', 'Jagatpura', 'Sanganer', 'Vidhyadhar Nagar'],
    temples: [
      { name: 'Govind Dev Ji Temple', deity: 'Lord Krishna', shortDesc: 'The presiding deity temple of Jaipur, dedicated to Lord Krishna.', description: 'The Govind Dev Ji Temple, set within the City Palace complex, is dedicated to Lord Krishna and is the most important temple of Jaipur.', significance: 'The royal deity of Jaipur, with seven daily darshan aartis.', timings: '4:30 AM – 9:00 PM', isFeatured: true },
      { name: 'Birla Mandir', deity: 'Lakshmi Narayan', shortDesc: 'A white-marble temple of Lakshmi Narayan.', description: 'The Birla Mandir (Lakshmi Narayan Temple) is a serene white-marble temple known for its modern architecture and tranquil setting.', significance: 'A peaceful place of worship and a city landmark.', timings: '6:00 AM – 12:00 PM, 3:00 PM – 9:00 PM' },
    ],
  },
  {
    name: 'Lucknow', state: 'Uttar Pradesh', geoRegion: 'IN-UP', latitude: 26.8467, longitude: 80.9462,
    serviceAreas: ['Gomti Nagar', 'Hazratganj', 'Aliganj', 'Indira Nagar', 'Aminabad', 'Alambagh', 'Mahanagar'],
    temples: [
      { name: 'Chandrika Devi Temple', deity: 'Goddess Chandrika Devi', shortDesc: 'An ancient Devi temple on the banks of the Gomti.', description: 'The Chandrika Devi Temple is an ancient shrine dedicated to Goddess Chandrika Devi, drawing large crowds during Navratri and amavasya.', significance: 'A revered Shakti shrine of the Awadh region.', timings: '5:00 AM – 10:00 PM', isFeatured: true },
      { name: 'Mankameshwar Temple', deity: 'Lord Shiva', shortDesc: 'A historic Shiva temple near the Daliganj bridge.', description: 'The Mankameshwar Temple is one of the oldest and most revered Shiva temples in Lucknow, especially busy on Mondays and during Shravan.', significance: 'Believed to fulfil the heartfelt wishes of devotees.', timings: '5:00 AM – 10:00 PM' },
    ],
  },
  {
    name: 'Kurukshetra', state: 'Haryana', geoRegion: 'IN-HR', latitude: 29.9695, longitude: 76.8783,
    serviceAreas: ['Thanesar', 'Brahma Sarovar', 'Jyotisar', 'Pehowa', 'Sector 7', 'Sector 13'],
    temples: [
      { name: 'Brahma Sarovar', deity: 'Sacred Tank', shortDesc: 'A vast sacred water tank central to Kurukshetra’s spiritual heritage.', description: 'Brahma Sarovar is one of the largest sacred tanks in Asia and a focal point of pilgrimage, especially during solar eclipses and Gita Jayanti.', significance: 'A bath here during an eclipse is believed to grant immense merit.', timings: 'Open 24 hours', isFeatured: true },
      { name: 'Jyotisar', deity: 'Lord Krishna', shortDesc: 'The site where the Bhagavad Gita was revealed.', description: 'Jyotisar is revered as the place where Lord Krishna delivered the Bhagavad Gita to Arjuna on the battlefield of Kurukshetra.', significance: 'One of the most sacred sites in Hindu philosophy and history.', timings: '6:00 AM – 7:00 PM' },
    ],
  },
];
