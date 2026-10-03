const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const DonorProfile = require('./models/DonorProfile');
const Hospital = require('./models/Hospital');
const BloodRequest = require('./models/BloodRequest');
const Donation = require('./models/Donation');
const Notification = require('./models/Notification');
const AIInsight = require('./models/AIInsight');

dotenv.config();

const seedData = async (options = true) => {
  let shouldExit = true;
  let forceReset = false;

  if (typeof options === 'boolean') {
    shouldExit = options;
  } else if (typeof options === 'object' && options !== null) {
    shouldExit = options.shouldExit !== undefined ? options.shouldExit : true;
    forceReset = Boolean(options.reset);
  }

  if (process.argv.includes('--reset')) {
    forceReset = true;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    const existingUsersCount = await User.countDocuments();

    if (existingUsersCount > 0 && !forceReset) {
      console.log(`Database already has data (${existingUsersCount} user(s) found).`);
      console.log('Skipping seed to prevent accidental data loss. To wipe and re-seed, run with: npm run seed -- --reset');
      if (shouldExit) {
        process.exit(0);
      }
      return;
    }

    if (forceReset) {
      console.log('Reset flag detected. Clearing existing database collections...');
      await User.deleteMany({});
      await DonorProfile.deleteMany({});
      await Hospital.deleteMany({});
      await BloodRequest.deleteMany({});
      await Donation.deleteMany({});
      await Notification.deleteMany({});
      await AIInsight.deleteMany({});
    } else {
      console.log('Database is empty. Populating initial seed data...');
    }

    console.log('Creating demo users...');

    // 1. Create Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@lifelink.com',
      password: 'admin123',
      accountType: 'admin',
      phone: '+91 9876543210',
    });

    // 2. Create Hospital User & Profile
    const hospitalUser = await User.create({
      name: 'City General Hospital',
      email: 'hospital@lifelink.com',
      password: 'hospital123',
      accountType: 'hospital',
      phone: '+91 1123456789',
    });

    const hospital = await Hospital.create({
      user: hospitalUser._id,
      name: 'City General Emergency Hospital',
      licenseNumber: 'HOSP-DEL-2026-9812',
      address: 'Ring Road, Lajpat Nagar, New Delhi, 110024',
      location: {
        type: 'Point',
        coordinates: [77.2400, 28.5680],
      },
      phone: '+91 1123456789',
      inventory: [
        { bloodGroup: 'A+', units: 14 },
        { bloodGroup: 'A-', units: 3 },
        { bloodGroup: 'B+', units: 18 },
        { bloodGroup: 'B-', units: 5 },
        { bloodGroup: 'AB+', units: 9 },
        { bloodGroup: 'AB-', units: 2 },
        { bloodGroup: 'O+', units: 22 },
        { bloodGroup: 'O-', units: 4 },
      ],
      isVerified: true,
    });

    hospitalUser.hospitalId = hospital._id;
    await hospitalUser.save();

    // 3. Create Individual User (Former Recipient)
    const recipientUser = await User.create({
      name: 'Sarah Connor',
      email: 'recipient@lifelink.com',
      password: 'recipient123',
      accountType: 'user',
      phone: '+91 9988776655',
    });

    // Create DonorProfile for Sarah Connor (so she has a profile as an individual)
    await DonorProfile.create({
      user: recipientUser._id,
      bloodGroup: 'O-',
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
      address: 'Delhi NCR Region',
      isAvailable: true,
      contactNumber: recipientUser.phone,
    });

    // 4. Create Multiple Individual Donors with Geo Coordinates around NCR
    const donorUsersData = [
      {
        name: 'Alex Rivera (Universal Donor)',
        email: 'user@lifelink.com',
        password: 'user123',
        bloodGroup: 'O-',
        coords: [77.2090, 28.6139], // Connaught Place (1.5 km)
        age: 29,
        gender: 'male',
        lastDonation: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago (eligible)
        healthFlags: ['none'],
      },
      {
        name: 'Priya Sharma',
        email: 'donor2@lifelink.com',
        password: 'donor123',
        bloodGroup: 'A+',
        coords: [77.2300, 28.6250], // Mandi House (3 km)
        age: 26,
        gender: 'female',
        lastDonation: null, // First time donor
        healthFlags: ['none'],
      },
      {
        name: 'Marcus Vance',
        email: 'donor3@lifelink.com',
        password: 'donor123',
        bloodGroup: 'B+',
        coords: [77.2500, 28.5500], // Kalkaji (8 km)
        age: 34,
        gender: 'male',
        lastDonation: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        healthFlags: ['none'],
      },
      {
        name: 'Elena Rostova',
        email: 'donor4@lifelink.com',
        password: 'donor123',
        bloodGroup: 'O+',
        coords: [77.3000, 28.5800], // Noida sector 15 (14 km)
        age: 31,
        gender: 'female',
        lastDonation: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // In 90-day cooldown
        healthFlags: ['none'],
      },
    ];

    const donorProfiles = [];
    for (const dData of donorUsersData) {
      const u = await User.create({
        name: dData.name,
        email: dData.email,
        password: dData.password || 'user123',
        accountType: 'user',
        phone: '+91 9123456780',
      });

      const dp = await DonorProfile.create({
        user: u._id,
        bloodGroup: dData.bloodGroup,
        location: {
          type: 'Point',
          coordinates: dData.coords,
        },
        address: 'Delhi NCR Region',
        lastDonationDate: dData.lastDonation,
        isAvailable: true,
        age: dData.age,
        gender: dData.gender,
        healthFlags: dData.healthFlags,
        contactNumber: u.phone,
        totalDonations: dData.lastDonation ? 2 : 0,
      });

      donorProfiles.push({ user: u, profile: dp });
    }

    console.log('Creating blood requests & donations...');

    // Create Blood Requests
    const req1 = await BloodRequest.create({
      requester: recipientUser._id,
      hospital: hospital._id,
      patientName: 'Robert Vance',
      bloodGroup: 'O-',
      unitsNeeded: 2,
      urgency: 'critical',
      location: {
        type: 'Point',
        coordinates: [77.2100, 28.6150],
      },
      address: 'AIIMS Emergency Ward 4, New Delhi',
      status: 'open',
      requiredByDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
      notes: 'Urgent cardiac trauma surgery required.',
      matchedDonorsCount: 3,
    });

    const req2 = await BloodRequest.create({
      requester: recipientUser._id,
      hospital: hospital._id,
      patientName: 'Anita Gupta',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      urgency: 'high',
      location: {
        type: 'Point',
        coordinates: [77.2400, 28.5680],
      },
      address: 'City General Hospital Room 302',
      status: 'fulfilled',
      requiredByDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'Post-partum care blood replenishment.',
      matchedDonorsCount: 4,
    });

    // Create Donation Record
    await Donation.create({
      donor: donorProfiles[1].user._id, // Priya Sharma (A+)
      donorProfile: donorProfiles[1].profile._id,
      request: req2._id,
      unitsDonated: 1,
      donationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'completed',
      notes: 'Successful blood donation at City General Hospital.',
    });

    // Create Notifications
    await Notification.create({
      recipient: donorProfiles[0].user._id,
      title: '🚨 Emergency Blood Request Match!',
      message: 'Urgent demand for O- Negative blood at AIIMS Trauma Ward. Match score: 98%.',
      type: 'request_match',
      link: `/requests/${req1._id}`,
    });

    // Create Initial AI Insight
    await AIInsight.create({
      title: 'LifeLink Regional Blood Reserve Analysis',
      summary: 'Emergency response metrics show high readiness for O-Negative and A-Positive requests in New Delhi Central. Demand spike observed in trauma care.',
      metrics: {
        totalRequests: 2,
        fulfilledRequests: 1,
        fulfillmentRate: '50%',
        activeStandbyDonors: 4,
        highRiskBloodGroups: ['O-', 'AB-'],
        surplusGroups: ['A+', 'O+'],
      },
      recommendations: [
        'Deploy targeted notifications for O-Negative donors within a 10km radius of AIIMS.',
        'Replenish AB-Negative emergency reserves at City General Hospital.',
        'Schedule weekend donor drive in South Delhi to prepare for upcoming surgical demand.',
      ],
      rawResponse: 'Seeded initial AI insight doc.',
    });

    console.log('=======================================================');
    console.log('  ✅ Seed Script Execution Completed Successfully!');
    console.log('  Demo Login Credentials:');
    console.log('   - User:       user@lifelink.com / user123');
    console.log('   - Hospital:   hospital@lifelink.com / hospital123');
    console.log('   - Admin:      admin@lifelink.com / admin123');
    console.log('=======================================================');

    if (shouldExit) {
      process.exit(0);
    }
  } catch (err) {
    console.error('Seed Error:', err);
    if (shouldExit) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = seedData;
