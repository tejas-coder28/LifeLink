const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const connectDB = require('./config/db');
const { disconnectMongo } = require('./config/mongo');
const models = require('./models');
const User = require('./repositories/user.repository');
const DonorProfile = require('./repositories/donorProfile.repository');
const Hospital = require('./repositories/hospital.repository');
const BloodRequest = require('./repositories/bloodRequest.repository');
const Donation = require('./repositories/donation.repository');
const Notification = require('./repositories/notification.repository');
const AIInsight = require('./repositories/aiInsight.repository');

const seedData = async (options = true) => {
  let shouldExit = true;
  let shouldReset = process.argv.includes('--reset');

  if (typeof options === 'boolean') {
    shouldExit = options;
  } else if (typeof options === 'object' && options !== null) {
    shouldExit = options.shouldExit !== undefined ? options.shouldExit : true;
    if (options.reset !== undefined) shouldReset = Boolean(options.reset);
  }

  try {
    await connectDB();

    if (shouldReset) {
      console.log('Reset flag detected. Clearing all MongoDB collections...');
      await Promise.all(Object.values(models).map((M) => M.deleteMany({})));
      await Promise.all(Object.values(models).map((M) => M.syncIndexes()));
      console.log('Collections cleared and indexes synchronized.');
    }

    const existingUsersCount = await User.countDocuments();

    if (existingUsersCount > 0) {
      console.log(`Database already has data (${existingUsersCount} user(s) found).`);
      console.log('Skipping seed to prevent overwriting existing data. Use --reset to recreate.');
      if (shouldExit) {
        await disconnectMongo();
        process.exit(0);
      }
      return;
    }

    console.log('Database is empty. Populating initial seed data...');
    console.log('Creating demo users...');

    // 1. Create Admin
    await User.create({
      name: 'System Admin',
      email: 'admin@lifelink.com',
      password: 'admin123',
      accountType: 'admin',
      phone: '+91 9876543210',
    });

    // 2. Create Verified Demo Hospital User & 8-Group Inventory
    let hospitalUser = await User.create({
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

    hospitalUser = await User.findByIdAndUpdate(hospitalUser._id, { hospitalId: hospital._id });

    // 3. Create Individual User (Requester + Profile)
    const recipientUser = await User.create({
      name: 'Sarah Connor',
      email: 'recipient@lifelink.com',
      password: 'recipient123',
      accountType: 'user',
      phone: '+91 9988776655',
    });

    await DonorProfile.create({
      user: recipientUser._id,
      bloodGroup: 'O-',
      bloodGroupConfirmed: true,
      location: {
        type: 'Point',
        coordinates: [77.2090, 28.6139],
      },
      address: 'Delhi NCR Region',
      age: 32,
      gender: 'female',
      is18Plus: true,
      isWeight50KgPlus: true,
      consentContact: true,
      isAvailable: true,
      contactNumber: recipientUser.phone,
    });

    // 4. Create Demo Donor Mix:
    //    - Eligible donor (last donated >= 90 days ago)
    //    - Never-donated donor (lastDonationDate: null)
    //    - Donor in cooldown (last donated 30 days ago)
    const donorUsersData = [
      {
        name: 'Alex Rivera (Universal Donor)',
        email: 'user@lifelink.com',
        password: 'user123',
        bloodGroup: 'O-',
        coords: [77.2090, 28.6139], // Connaught Place
        age: 29,
        gender: 'male',
        lastDonation: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), // Eligible (>= 90d)
        healthFlags: ['none'],
      },
      {
        name: 'Priya Sharma',
        email: 'donor2@lifelink.com',
        password: 'donor123',
        bloodGroup: 'A+',
        coords: [77.2300, 28.6250], // Mandi House
        age: 26,
        gender: 'female',
        lastDonation: null, // Never-donated first-time donor
        healthFlags: ['none'],
      },
      {
        name: 'Marcus Vance',
        email: 'donor3@lifelink.com',
        password: 'donor123',
        bloodGroup: 'B+',
        coords: [77.2500, 28.5500], // Kalkaji
        age: 34,
        gender: 'male',
        lastDonation: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), // Eligible (>= 90d)
        healthFlags: ['none'],
      },
      {
        name: 'Elena Rostova',
        email: 'donor4@lifelink.com',
        password: 'donor123',
        bloodGroup: 'O+',
        coords: [77.3000, 28.5800], // Noida sector 15
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
        bloodGroupConfirmed: true,
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
        is18Plus: true,
        isWeight50KgPlus: true,
        consentContact: true,
        profileComplete: true,
        completedDonations: dData.lastDonation ? 2 : 0,
        totalDonations: dData.lastDonation ? 2 : 0,
      });

      donorProfiles.push({ user: u, profile: dp });
    }

    console.log('Creating sample blood requests & donations...');

    // Create Blood Requests
    const req1 = await BloodRequest.create({
      requester: recipientUser._id,
      hospital: hospital._id,
      targetHospital: hospital._id,
      hospitalName: hospital.name,
      patientName: 'Robert Vance',
      bloodGroup: 'O-',
      unitsNeeded: 2,
      unitsFromDonors: 2,
      urgency: 'critical',
      location: {
        type: 'Point',
        coordinates: [77.2100, 28.6150],
      },
      address: 'AIIMS Emergency Ward 4, New Delhi',
      status: 'open',
      requiredByDate: new Date(Date.now() + 12 * 60 * 60 * 1000),
      notes: 'Urgent cardiac trauma surgery required.',
      matchedDonorsCount: 2,
    });

    const req2 = await BloodRequest.create({
      requester: recipientUser._id,
      hospital: hospital._id,
      targetHospital: hospital._id,
      hospitalName: hospital.name,
      patientName: 'Anita Gupta',
      bloodGroup: 'A+',
      unitsNeeded: 1,
      unitsFulfilled: 1,
      urgency: 'high',
      location: {
        type: 'Point',
        coordinates: [77.2400, 28.5680],
      },
      address: 'City General Hospital Room 302',
      status: 'fulfilled',
      requiredByDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      notes: 'Post-partum care blood replenishment.',
      matchedDonorsCount: 3,
    });

    await Donation.create({
      donor: donorProfiles[1].user._id, // Priya Sharma (A+)
      donorProfile: donorProfiles[1].profile._id,
      request: req2._id,
      hospitalName: hospital.name,
      unitsDonated: 1,
      donationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'completed',
      notes: 'Successful blood donation at City General Hospital.',
    });

    await Notification.create({
      recipient: donorProfiles[0].user._id,
      title: '🚨 Emergency Blood Request Match!',
      message: 'Urgent demand for O- Negative blood at AIIMS Trauma Ward. Match score: 98%.',
      type: 'request_match',
      link: `/requests/${req1._id}`,
    });

    await AIInsight.create({
      title: 'LifeLink Regional Blood Reserve Analysis',
      summary: 'Emergency response metrics show high readiness for O-Negative and A-Positive requests in New Delhi Central. Demand spike observed in trauma care.',
      metrics: {
        totalRequests: 2,
        fulfilledRequests: 1,
        fulfillmentRate: '50%',
        activeStandbyDonors: 5,
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
    console.log('   - User (Eligible): user@lifelink.com / user123');
    console.log('   - User (Never Donated): donor2@lifelink.com / donor123');
    console.log('   - User (In Cooldown): donor4@lifelink.com / donor123');
    console.log('   - Hospital:        hospital@lifelink.com / hospital123');
    console.log('   - Admin:           admin@lifelink.com / admin123');
    console.log('=======================================================');

    if (shouldExit) {
      await disconnectMongo();
      process.exit(0);
    }
  } catch (err) {
    console.error('Seed Error:', err);
    if (shouldExit) {
      try { await disconnectMongo(); } catch (_) {}
      process.exit(1);
    }
    throw err;
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = seedData;
