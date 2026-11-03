const API_URL = 'http://localhost:5000/api';

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // not json
  }

  return { status: res.status, ok: res.ok, data };
}

async function runE2ETests() {
  if (!process.env.ALLOW_E2E_MUTATION) {
    console.warn('⚠️  E2E mutation script blocked to protect real database from test records.');
    console.warn('   Unit & integration tests ("npm test") run safely in test isolation.');
    console.warn('   To run this against a local test instance, explicitly pass ALLOW_E2E_MUTATION=true.');
    process.exit(0);
  }

  console.log('====================================================');
  console.log('  🧪 LifeLink End-to-End Verification Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  const timestamp = Date.now();

  // Test 1: Donor Registration Validation (Reject missing blood group)
  try {
    const res = await req('POST', '/auth/register', {
      name: `Test Donor ${timestamp}`,
      email: `test_nobg_${timestamp}@lifelink.test`,
      password: 'Password123!',
      role: 'donor',
      // bloodGroup omitted
    });
    assert(
      res.status === 400,
      'Registration rejects donor registration without bloodGroup',
      `HTTP status: ${res.status}`
    );
  } catch (err) {
    assert(false, 'Registration rejects donor registration without bloodGroup', err.message);
  }

  // Test 2: Donor Registration Validation (Reject invalid blood group)
  try {
    const res = await req('POST', '/auth/register', {
      name: `Test Donor ${timestamp}`,
      email: `test_badbg_${timestamp}@lifelink.test`,
      password: 'Password123!',
      role: 'donor',
      bloodGroup: 'INVALID',
    });
    assert(
      res.status === 400,
      'Registration rejects invalid blood group',
      `HTTP status: ${res.status}`
    );
  } catch (err) {
    assert(false, 'Registration rejects invalid blood group', err.message);
  }

  // Test 3: Successful Registration with specific Blood Group (B+)
  let bPosToken, bPosUser;
  try {
    const regRes = await req('POST', '/auth/register', {
      name: `B-Positive Donor ${timestamp}`,
      email: `donor_bpos_${timestamp}@lifelink.test`,
      password: 'Password123!',
      role: 'donor',
      bloodGroup: 'B+',
      phone: '9876543210',
    });

    bPosUser = regRes.data?.data;
    bPosToken = bPosUser?.token;

    assert(
      regRes.ok && bPosUser?.bloodGroup === 'B+',
      'Successful registration preserves selected blood group (B+)',
      `Returned bloodGroup: ${bPosUser?.bloodGroup}`
    );
  } catch (err) {
    assert(false, 'Successful registration preserves selected blood group (B+)', err.message);
  }

  // Test 4: Verify DonorProfile has bloodGroupConfirmed = true
  try {
    const profileRes = await req('GET', '/donors/profile', null, bPosToken);
    const donorProfile = profileRes.data?.data;
    assert(
      donorProfile?.bloodGroup === 'B+' && donorProfile?.bloodGroupConfirmed === true,
      'DonorProfile persists bloodGroup and marks bloodGroupConfirmed: true',
      `bloodGroup: ${donorProfile?.bloodGroup}, confirmed: ${donorProfile?.bloodGroupConfirmed}`
    );
  } catch (err) {
    assert(false, 'DonorProfile persists bloodGroup and marks bloodGroupConfirmed: true', err.message);
  }

  // Test 5: Donor Profile Update (Change blood group to AB+)
  try {
    const updateRes = await req(
      'PUT',
      '/donors/profile',
      {
        bloodGroup: 'AB+',
        contactNumber: '9123456789',
        address: 'Connaught Place, New Delhi',
      },
      bPosToken
    );
    const updated = updateRes.data?.data;
    assert(
      updated?.bloodGroup === 'AB+' && updated?.bloodGroupConfirmed === true,
      'Donor can update blood group in profile settings (persisted as AB+)',
      `Updated bloodGroup: ${updated?.bloodGroup}`
    );
  } catch (err) {
    assert(false, 'Donor can update blood group in profile settings', err.message);
  }

  // Test 6: Register an O- Donor
  let oNegToken, oNegUser;
  try {
    const regRes = await req('POST', '/auth/register', {
      name: `O-Negative Donor ${timestamp}`,
      email: `donor_oneg_${timestamp}@lifelink.test`,
      password: 'Password123!',
      role: 'donor',
      bloodGroup: 'O-',
      phone: '9988776655',
    });
    oNegUser = regRes.data?.data;
    oNegToken = oNegUser?.token;
    assert(regRes.ok && oNegUser?.bloodGroup === 'O-', 'Register O- Universal Donor successfully');
  } catch (err) {
    assert(false, 'Register O- Universal Donor successfully', err.message);
  }

  // Test 7: Create Blood Request for O- (using admin or verified hospital)
  let adminToken, oNegRequestId;
  try {
    const adminLogin = await req('POST', '/auth/login', {
      email: 'admin@lifelink.com',
      password: 'admin123',
    });
    adminToken = adminLogin.data?.data?.token;

    const reqRes = await req(
      'POST',
      '/requests',
      {
        patientName: 'Critical Trauma Patient',
        bloodGroup: 'O-',
        unitsNeeded: 2,
        urgency: 'critical',
        address: 'Central Emergency Trauma Center, New Delhi',
        coordinates: [77.209, 28.6139],
      },
      adminToken
    );
    oNegRequestId = reqRes.data?.data?._id;
    assert(
      reqRes.ok && oNegRequestId,
      'Emergency blood request created for O- blood',
      `Request ID: ${oNegRequestId}`
    );
  } catch (err) {
    assert(false, 'Emergency blood request created for O- blood', err.message);
  }

  // Test 8: Medical Incompatibility Gating (AB+ donor attempting to pledge for O- request)
  try {
    const pledgeRes = await req(
      'POST',
      '/donations/pledge',
      { requestId: oNegRequestId },
      bPosToken
    );
    assert(
      pledgeRes.status === 403 && pledgeRes.data?.message?.toLowerCase().includes('incompatible'),
      'Incompatible donor (AB+) is blocked from pledging to O- request (HTTP 403 returned with medical reason)',
      `HTTP status: ${pledgeRes.status}, message: ${pledgeRes.data?.message}`
    );
  } catch (err) {
    assert(false, 'Incompatible donor (AB+) is blocked from pledging to O- request', err.message);
  }

  // Test 9: Medically Compatible Donor (O-) Pledges Successfully
  let donationId;
  try {
    const pledgeRes = await req(
      'POST',
      '/donations/pledge',
      { requestId: oNegRequestId, message: 'I can donate immediately' },
      oNegToken
    );
    donationId = pledgeRes.data?.data?._id;
    assert(
      pledgeRes.status === 201 && donationId,
      'Compatible donor (O-) successfully pledges to O- emergency request (HTTP 201)'
    );
  } catch (err) {
    assert(false, 'Compatible donor (O-) successfully pledges to O- emergency request', err.message);
  }

  // Test 10: Duplicate Pledge Prevention
  try {
    const dupRes = await req(
      'POST',
      '/donations/pledge',
      { requestId: oNegRequestId },
      oNegToken
    );
    assert(
      dupRes.status === 400 && dupRes.data?.message?.includes('already pledged'),
      'Duplicate pledge is blocked with HTTP 400 ("already pledged")',
      `HTTP status: ${dupRes.status}, message: ${dupRes.data?.message}`
    );
  } catch (err) {
    assert(false, 'Duplicate pledge is blocked for same donor and request', err.message);
  }

  // Test 11: 90-Day Cooldown Enforcement (Donor in cooldown cannot pledge)
  try {
    // Create another request (A+)
    const reqRes2 = await req(
      'POST',
      '/requests',
      {
        patientName: 'Surgery Patient',
        bloodGroup: 'A+',
        unitsNeeded: 1,
        urgency: 'high',
        address: 'Central Emergency Trauma Center, New Delhi',
        coordinates: [77.209, 28.6139],
      },
      adminToken
    );
    const aPosRequestId = reqRes2.data?.data?._id;

    // Set O- donor's last donation date to 20 days ago (inside 90-day cooldown)
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await req(
      'PUT',
      '/donors/profile',
      { lastDonationDate: twentyDaysAgo },
      oNegToken
    );

    // Try to pledge with active cooldown (O- to A+ is compatible, but cooldown is active!)
    const cooldownPledgeRes = await req(
      'POST',
      '/donations/pledge',
      { requestId: aPosRequestId },
      oNegToken
    );
    assert(
      cooldownPledgeRes.status === 403 && cooldownPledgeRes.data?.message?.includes('cooldown'),
      '90-day cooldown enforcement blocks donor within cooldown period (HTTP 403 returned with cooldown days)',
      `HTTP status: ${cooldownPledgeRes.status}, message: ${cooldownPledgeRes.data?.message}`
    );

    // Now set last donation date to 95 days ago (> 90 days)
    const ninetyFiveDaysAgo = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await req(
      'PUT',
      '/donors/profile',
      { lastDonationDate: ninetyFiveDaysAgo },
      oNegToken
    );

    // Now pledge should succeed!
    const validPledgeRes = await req(
      'POST',
      '/donations/pledge',
      { requestId: aPosRequestId },
      oNegToken
    );
    assert(
      validPledgeRes.ok,
      'Donor after 90+ days cooldown is eligible and successfully pledges (HTTP 201)'
    );
  } catch (err) {
    assert(false, '90-day cooldown rule lifecycle test', err.message);
  }

  console.log('\n====================================================');
  console.log(`  E2E Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
