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
    }

    // 2. Seed Country if empty
    const countryCount = await Country.countDocuments();
    if (countryCount === 0) {
      const india = await Country.create({ name: 'India', slug: 'india', enabled: true, sortOrder: 1 });
      const uae = await Country.create({ name: 'United Arab Emirates', slug: 'uae', enabled: true, sortOrder: 2 });
      const oman = await Country.create({ name: 'Oman', slug: 'oman', enabled: true, sortOrder: 3 });

      // 3. Seed Cities (with State)
      const delhi = await City.create({ countryId: india._id, name: 'Delhi', slug: 'delhi', state: 'Delhi', enabled: true, isPopular: true, sortOrder: 1 });
      const mumbai = await City.create({ countryId: india._id, name: 'Mumbai', slug: 'mumbai', state: 'Maharashtra', enabled: true, isPopular: true, sortOrder: 2 });
      const dubai = await City.create({ countryId: uae._id, name: 'Dubai', slug: 'dubai', state: 'Dubai', enabled: true, isPopular: true, sortOrder: 3 });
      const muscat = await City.create({ countryId: oman._id, name: 'Muscat', slug: 'muscat', state: 'Muscat', enabled: true, isPopular: true, sortOrder: 4 });

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
        heroImage: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=800&q=80',
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
        heroImage: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
        benefits: ['Promotes family harmony', 'Overcomes health issues', 'Fulfills righteous desires'],
        rituals: [{ name: 'Katha Recitation', description: 'Reading of 5 chapters of Satyanarayan Katha' }],
        samagri: [{ group: 'Puja Samagri', items: ['Panjiri Prasad', 'Tulsi Leaves', 'Banana Leaves', 'Fruits'] }],
        occasions: ['Full Moon Days', 'Housewarming', 'Anniversaries'],
        faqs: [{ question: 'Is prasad provided?', answer: 'Pandit ji will guide you on preparing fresh prasad.' }],
        enabled: true,
        isFeatured: true,
        sortOrder: 2,
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
