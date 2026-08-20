import bcrypt from 'bcryptjs';
import { env } from './env.js';
import { AdminUser } from '../models/AdminUser.js';
import { Country } from '../models/Country.js';
import { City } from '../models/City.js';
import { PujaCategory } from '../models/PujaCategory.js';
import { Puja } from '../models/Puja.js';
import { PujaLocation } from '../models/PujaLocation.js';
import { Temple } from '../models/Temple.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';

export async function seedInitialData() {
  try {
    // 1. Seed Admin User
    const adminEmail = env.seedAdmin.email.toLowerCase();
    const existingAdmin = await AdminUser.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(env.seedAdmin.password, 10);
      await AdminUser.create({
        email: adminEmail,
        passwordHash,
        name: 'Naman Puja Admin',
        role: 'ADMIN',
      });
      // eslint-disable-next-line no-console
      console.log(`👤 Default admin created: ${adminEmail}`);
    } else {
      const passwordHash = await bcrypt.hash(env.seedAdmin.password, 10);
      existingAdmin.name = 'Naman Puja Admin';
      existingAdmin.passwordHash = passwordHash;
      await existingAdmin.save();
      // eslint-disable-next-line no-console
      console.log(`👤 Default admin updated/synced: ${adminEmail}`);
    }

    // 1b. Seed Second Admin User
    const secondAdminEmail = 'namanpuja@admin.com';
    const existingSecondAdmin = await AdminUser.findOne({ email: secondAdminEmail });
    if (!existingSecondAdmin) {
      const passwordHash = await bcrypt.hash('AdminUser@321', 10);
      await AdminUser.create({
        email: secondAdminEmail,
        passwordHash,
        name: 'Admin User',
        role: 'ADMIN',
      });
      // eslint-disable-next-line no-console
      console.log(`👤 Second admin created: ${secondAdminEmail}`);
    } else {
      const passwordHash = await bcrypt.hash('AdminUser@321', 10);
      existingSecondAdmin.name = 'Admin User';
      existingSecondAdmin.passwordHash = passwordHash;
      await existingSecondAdmin.save();
      // eslint-disable-next-line no-console
      console.log(`👤 Second admin updated/synced: ${secondAdminEmail}`);
    }

    // 2. Seed Country if empty
    const countryCount = await Country.countDocuments();
    if (countryCount === 0) {
      const india = await Country.create({ name: 'India', slug: 'india', enabled: true, sortOrder: 1 });
      const uae = await Country.create({ name: 'United Arab Emirates', slug: 'uae', enabled: true, sortOrder: 2 });
      const oman = await Country.create({ name: 'Oman', slug: 'oman', enabled: true, sortOrder: 3 });

      // 3. Seed Cities (with State)
      const delhi = await City.create({ countryId: india._id, name: 'Delhi', slug: 'delhi', state: 'Delhi', geoRegion: 'IN-DL', latitude: 28.6139, longitude: 77.2090, enabled: true, isPopular: true, sortOrder: 1 });
      const mumbai = await City.create({ countryId: india._id, name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', geoRegion: 'IN-MH', latitude: 19.0760, longitude: 72.8777, enabled: true, isPopular: true, sortOrder: 2 });
      const dubai = await City.create({ countryId: uae._id, name: 'Dubai', slug: 'dubai', state: 'Dubai', geoRegion: 'AE-DU', latitude: 25.2048, longitude: 55.2708, enabled: true, isPopular: true, sortOrder: 3 });
      const muscat = await City.create({ countryId: oman._id, name: 'Muscat', slug: 'muscat', state: 'Muscat', geoRegion: 'OM-MA', latitude: 23.5880, longitude: 58.3829, enabled: true, isPopular: true, sortOrder: 4 });

      // 4. Seed Puja Category
      const vedicCategory = await PujaCategory.create({
        name: 'Vedic Pujas',
        slug: 'vedic-pujas',
        description: 'Authentic Vedic rituals performed by certified Acharyas & Pandits',
      });

      // 5. Seed Pujas
      const ganeshPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Ganesh Puja',
        slug: 'ganesh-puja',
        deity: 'Lord Ganesha',
        subtitle: 'For prosperity, removing obstacles, and new beginnings',
        serviceType: 'BOTH',
        durationMin: 90,
        duration: '1.5 Hours',
        basePrice: 2500,
        shortDesc: 'Invoke the blessings of Lord Ganesha for peace and prosperity.',
        shortDescription: 'Invoke the blessings of Lord Ganesha for peace and prosperity.',
        description: 'Ganesh Puja is performed before any new venture or auspicious occasion to seek the divine blessings of Lord Ganesha for removing obstacles.',
    
        benefits: ['Removes obstacles', 'Brings peace & prosperity', 'Ensures success in new endeavors'],
        rituals: [{ name: 'Sankalp & Ganesh Avahan', description: 'Invocation of Lord Ganesha' }],
        samagri: [{ group: 'Puja Samagri', items: ['Modak', 'Flowers', 'Incense', 'Ghee Lamp'] }],
        occasions: ['New Home', 'Business Start', 'Festivals'],
        faqs: [{ question: 'How long does the puja take?', answer: 'Approximately 90 minutes.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 1,
      });

      const satyanarayanPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Satyanarayan Puja',
        slug: 'satyanarayan-puja',
        deity: 'Lord Vishnu',
        subtitle: 'For family harmony, wellness, and spiritual fulfillment',
        serviceType: 'BOTH',
        durationMin: 120,
        duration: '2 Hours',
        basePrice: 3100,
        shortDesc: 'Sacred ritual dedicated to Lord Vishnu for family health and prosperity.',
        shortDescription: 'Sacred ritual dedicated to Lord Vishnu for family health and prosperity.',
        description: 'Satyanarayan Katha and Puja is performed on Purnima or any special occasion for peace, wellness, and gratitude.',
       
        benefits: ['Promotes family harmony', 'Overcomes health issues', 'Fulfills righteous desires'],
        rituals: [{ name: 'Katha Recitation', description: 'Reading of 5 chapters of Satyanarayan Katha' }],
        samagri: [{ group: 'Puja Samagri', items: ['Panjiri Prasad', 'Tulsi Leaves', 'Banana Leaves', 'Fruits'] }],
        occasions: ['Full Moon Days', 'Housewarming', 'Anniversaries'],
        faqs: [{ question: 'Is prasad provided?', answer: 'Pandit ji will guide you on preparing fresh prasad.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 2,
        bhaktiType: 'main',
      });

      const grihaPraveshPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Griha Pravesh Puja',
        slug: 'griha-pravesh-puja',
        deity: 'Vastu Purush & Lord Ganesha',
        subtitle: 'Housewarming ceremony for peace, positive energy, and prosperity',
        serviceType: 'BOTH',
        durationMin: 150,
        duration: '2.5 Hours',
        basePrice: 3500,
        shortDesc: 'Auspicious housewarming ritual to purify your new home and invite divine blessings.',
        shortDescription: 'Auspicious housewarming ritual to purify your new home and invite divine blessings.',
        description: 'Griha Pravesh Puja is performed before entering a new home to remove negative energies, appease Vastu Purush, and invite health and wealth.',
       
        benefits: ['Purifies new home', 'Removes Vastu dosha', 'Invites positive energy and harmony'],
        rituals: [{ name: 'Vastu Shanti & Navagraha Puja', description: 'Pacifying directional deities and planets' }],
        samagri: [{ group: 'Puja Samagri', items: ['Mango Leaves', 'Kalash', 'Coconut', 'Turmeric'] }],
        occasions: ['New Home', 'Housewarming'],
        faqs: [{ question: 'When should Griha Pravesh be done?', answer: 'On an auspicious date determined by Panchang.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 3,
        bhaktiType: 'main',
      });

      const lakshmiPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Lakshmi Puja',
        slug: 'lakshmi-puja',
        deity: 'Goddess Lakshmi',
        subtitle: 'For wealth, abundance, business growth, and financial stability',
        serviceType: 'BOTH',
        durationMin: 90,
        duration: '1.5 Hours',
        basePrice: 2800,
        shortDesc: 'Invoke Goddess Lakshmi for wealth, prosperity, and financial well-being.',
        shortDescription: 'Invoke Goddess Lakshmi for wealth, prosperity, and financial well-being.',
        description: 'Lakshmi Puja is dedicated to the Goddess of wealth and fortune, bringing prosperity, success, and removal of financial obstacles.',
   
        benefits: ['Attracts wealth & abundance', 'Business success', 'Financial stability'],
        rituals: [{ name: 'Mahalakshmi Stotram & Archana', description: 'Chanting hymns for Goddess Lakshmi' }],
        samagri: [{ group: 'Puja Samagri', items: ['Lotus Flowers', 'Coins', 'Sweets', 'Kumkum'] }],
        occasions: ['Diwali', 'New Business', 'Friday Worship'],
        faqs: [{ question: 'Can this be done at office?', answer: 'Yes, suitable for both homes and offices.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 4,
        bhaktiType: 'main',
      });

      const rudrabhishekPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Rudrabhishek Puja',
        slug: 'rudrabhishek-puja',
        deity: 'Lord Shiva',
        subtitle: 'Powerful abhishek for health, peace, and wish fulfillment',
        serviceType: 'BOTH',
        durationMin: 120,
        duration: '2 Hours',
        basePrice: 3100,
        shortDesc: 'Sacred ritual bathing of Shivling with milk, honey, ghee, and holy water.',
        shortDescription: 'Sacred ritual bathing of Shivling with milk, honey, ghee, and holy water.',
        description: 'Rudrabhishek is one of the most powerful Vedic rituals to worship Lord Shiva, washing away sins and bestowing health, peace, and spiritual strength.',
       
        benefits: ['Bestows mental peace', 'Cures chronic ailments', 'Removes negative karma'],
        rituals: [{ name: 'Rudra Sukhtam Chanting & Abhishek', description: 'Bathing Shivling with sacred liquids' }],
        samagri: [{ group: 'Puja Samagri', items: ['Bilva Patra', 'Milk', 'Honey', 'Gangajal'] }],
        occasions: ['Maha Shivratri', 'Shravan Mondays', 'Birthdays'],
        faqs: [{ question: 'What is used in Rudrabhishek?', answer: 'Milk, curd, honey, ghee, sugar, and Gangajal.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 5,
        bhaktiType: 'main',
      });

      const navagrahaPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Navagraha Shanti Puja',
        slug: 'navagraha-shanti-puja',
        deity: 'Nine Planets (Navagraha)',
        subtitle: 'To pacify malefic planetary influences and bring harmony',
        serviceType: 'BOTH',
        durationMin: 120,
        duration: '2 Hours',
        basePrice: 3200,
        shortDesc: 'Sacred ritual to balance planetary energies and reduce obstacles in life.',
        shortDescription: 'Sacred ritual to balance planetary energies and reduce obstacles in life.',
        description: 'Navagraha Shanti Puja appeases all nine celestial planets, neutralizing negative planetary transits and bringing peace and stability.',
      
        benefits: ['Reduces astrological doshas', 'Brings career stability', 'Removes obstacles'],
        rituals: [{ name: 'Navagraha Homa & Mantra Japa', description: 'Offering oblations to planetary deities' }],
        samagri: [{ group: 'Puja Samagri', items: ['9 Types of Grains', 'Colored Cloths', 'Sesame Seeds'] }],
        occasions: ['Astrological Remedies', 'New Year', 'Major Life Changes'],
        faqs: [{ question: 'Do I need my horoscope?', answer: 'Having your birth details helps the priest customize the sankalp.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 6,
        bhaktiType: 'main',
      });

      const annaprasanPuja = await Puja.create({
        categoryId: vedicCategory._id,
        name: 'Annaprasan Puja',
        slug: 'annaprasan-puja',
        deity: 'Annapurna Devi',
        subtitle: 'Baby’s first rice-eating ceremony for health and nourishment',
        serviceType: 'BOTH',
        durationMin: 90,
        duration: '1.5 Hours',
        basePrice: 2500,
        shortDesc: 'Traditional ceremony marking a baby’s first intake of solid food.',
        shortDescription: 'Traditional ceremony marking a baby’s first intake of solid food.',
        description: 'Annaprasan Samskara is performed when a baby is introduced to solid food for the first time, invoking blessings of Goddess Annapurna for health and vitality.',
       
        benefits: ['Blesses child with good health', 'Prosperity & nourishment', 'Auspicious milestone'],
        rituals: [{ name: 'Feeding First Solid Food & Blessing', description: 'Offering blessed kheer or rice to the baby' }],
        samagri: [{ group: 'Puja Samagri', items: ['Sweet Kheer', 'Silver Spoon', 'Flowers', 'Fruits'] }],
        occasions: ['Baby 6th/8th Month', 'Milestone Celebration'],
        faqs: [{ question: 'What age is best for Annaprasan?', answer: 'Typically 6 months for boys and 7 or 8 months for girls.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 7,
        bhaktiType: 'main',
      });

      // 6. Seed Puja Locations
      await PujaLocation.create({
        pujaId: ganeshPuja._id,
        cityId: delhi._id,
        slug: 'ganesh-puja-in-delhi',
        basePrice: 2500,
        published: true,
      });
      await PujaLocation.create({
        pujaId: ganeshPuja._id,
        cityId: mumbai._id,
        slug: 'ganesh-puja-in-mumbai',
        basePrice: 2700,
        published: true,
      });
      await PujaLocation.create({
        pujaId: satyanarayanPuja._id,
        cityId: delhi._id,
        slug: 'satyanarayan-puja-in-delhi',
        basePrice: 3100,
        published: true,
      });

      // 7. Seed Temple
      await Temple.create({
        cityId: delhi._id,
        name: 'Akshardham Temple',
        slug: 'akshardham-temple-delhi',
        description: 'Spiritual and cultural campus displaying traditional Hindu culture and architecture.',
        enabled: true,
        isFeatured: true,
        sortOrder: 1,
      });

      // 8. Seed Dummy User & Bookings
      const dummyUserPassword = await bcrypt.hash('password123', 10);
      const dummyUser = await User.create({
        email: 'customer@example.com',
        passwordHash: dummyUserPassword,
        name: 'John Doe',
        phone: '+919876543210'
      });

      await Booking.create({
        reference: 'BKG-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        serviceType: 'HOME_VISIT',
        customerName: 'John Doe',
        customerEmail: 'customer@example.com',
        customerPhone: '+919876543210',
        notes: 'Please bring extra samagri.',
        preferredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        preferredTime: '10:00 AM',
        addressLine: '123 Main Street',
        pincode: '110001',
        pujaId: ganeshPuja._id,
        cityId: delhi._id,
        userId: dummyUser._id,
        amount: 2500,
        currency: 'INR',
        status: 'CONFIRMED'
      });

      await Booking.create({
        reference: 'BKG-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        serviceType: 'TEMPLE_VISIT',
        customerName: 'Alice Smith',
        customerEmail: 'alice@example.com',
        customerPhone: '+919876543211',
        preferredDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        preferredTime: '04:00 PM',
        addressLine: 'Akshardham Temple, Delhi',
        pincode: '110092',
        pujaId: satyanarayanPuja._id,
        cityId: delhi._id,
        amount: 3100,
        currency: 'INR',
        status: 'PENDING'
      });

      // eslint-disable-next-line no-console
      console.log('🌱 Initial database seed complete');
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('⚠️ Error during initial data seed:', err);
  }
}
