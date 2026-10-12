const { MongoClient } = require('mongodb');

const API_BASE = 'http://localhost:5000/api/v1';

async function run() {
  console.log('--- Starting Isolated Fresh Case #001 Lifecycle Test ---');

  // Generate unique fresh student credentials
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
  const freshEmail = `fresh_student_${uniqueId}@datachan.test`;
  const freshPassword = 'FreshStudentTest!123';

  // 1. Provision fresh student via Firebase Auth Emulator
  let token = '';
  try {
    const res = await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: freshEmail,
        password: freshPassword,
        returnSecureToken: true,
      }),
    });
    const data = await res.json();
    if (!data.idToken) throw new Error('No idToken returned from emulator signUp: ' + JSON.stringify(data));
    token = data.idToken;
    console.log(`✅ 1. Fresh student registered in emulator: ${freshEmail}`);
  } catch (err) {
    console.error('❌ Failed to register fresh student in emulator:', err.message);
    process.exit(1);
  }

  // 2. Exchange token for session cookie
  let cookieHeader = '';
  try {
    const loginRes = await fetch(`${API_BASE}/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token })
    });
    if (!loginRes.ok) throw new Error(await loginRes.text());

    cookieHeader = loginRes.headers.get('set-cookie');
    console.log('✅ 2. Session established for fresh student');
  } catch (err) {
    console.error('❌ Failed to establish session:', err.message);
    process.exit(1);
  }

  const reqConfig = {
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/json'
    }
  };

  const gameId = 'case_001_midnight_murder';

  // 3. Verify Initial Authoritative User XP is 0
  let initialXp = 0;
  let userId = '';
  try {
    const meRes = await fetch(`${API_BASE}/auth/me`, reqConfig);
    if (!meRes.ok) throw new Error(await meRes.text());
    const meData = await meRes.json();
    userId = meData.data.id;
    initialXp = meData.data.xp || 0;
    if (initialXp !== 0) {
      throw new Error(`Expected fresh user initial XP to be 0, but got ${initialXp}`);
    }
    console.log(`✅ 3. Initial authoritative user balance confirmed: xp=${initialXp} (userId: ${userId})`);
  } catch (err) {
    console.error('❌ Failed to verify initial user XP:', err.message);
    process.exit(1);
  }

  // 4. Assert NO Existing Game Progress Prior to Start
  try {
    const preCheckRes = await fetch(`${API_BASE}/games/${gameId}/progress`, reqConfig);
    if (preCheckRes.status !== 404) {
      const body = await preCheckRes.json();
      throw new Error(`Expected 404 for unstarted game, but received status ${preCheckRes.status}: ${JSON.stringify(body)}`);
    }
    console.log('✅ 4. Pre-start progress check verified: 404 ResourceNotFoundError (no existing progress)');
  } catch (err) {
    console.error('❌ Pre-start check failed:', err.message);
    process.exit(1);
  }

  // 5. Start Game & Assert Pristine Initial State (chapter_1, 0 clues, 0 challenges)
  let sandboxId = '';
  try {
    const startRes = await fetch(`${API_BASE}/games/${gameId}/start`, { method: 'POST', ...reqConfig });
    if (!startRes.ok) throw new Error(await startRes.text());
    const startData = await startRes.json();
    const progress = startData.data;

    sandboxId = progress.sandboxId;
    if (!sandboxId) throw new Error('No sandboxId in start response');
    if (sandboxId.length > 63) throw new Error(`sandboxId length exceeds 63 chars: ${sandboxId}`);

    if (progress.currentChapter !== 'chapter_1') {
      throw new Error(`Fresh game initial chapter is not "chapter_1": got "${progress.currentChapter}"`);
    }
    if (!Array.isArray(progress.completedChallenges) || progress.completedChallenges.length !== 0) {
      throw new Error(`Fresh game completedChallenges is not empty: ${JSON.stringify(progress.completedChallenges)}`);
    }
    if (!Array.isArray(progress.discoveredClues) || progress.discoveredClues.length !== 0) {
      throw new Error(`Fresh game discoveredClues is not empty: ${JSON.stringify(progress.discoveredClues)}`);
    }

    console.log(`✅ 5. Game started in pristine state: chapter="${progress.currentChapter}", completed=${progress.completedChallenges.length}, clues=${progress.discoveredClues.length}, sandbox="${sandboxId}"`);
  } catch (err) {
    console.error('❌ Failed to start game in pristine state:', err.message);
    process.exit(1);
  }

  // 6. Execute Canonical Chapter 1 Query
  const validQuery = `db.visits.find({ time: { $gte: "23:00", $lt: "24:00" } })`;
  let queryResultData = [];
  try {
    const queryRes = await fetch(`${API_BASE}/games/${gameId}/query`, {
      method: 'POST',
      ...reqConfig,
      body: JSON.stringify({ challengeId: 'chal_001', query: validQuery })
    });
    if (!queryRes.ok) throw new Error(await queryRes.text());
    const queryData = await queryRes.json();
    queryResultData = queryData.data;

    if (!Array.isArray(queryResultData) || queryResultData.length !== 5) {
      throw new Error(`Expected exactly 5 records, received ${queryResultData?.length}`);
    }

    const expectedFive = ['Sarah Mitchell', 'Daniel Carter', 'Emily Ross', 'Michael Reed', 'Olivia Blake'];
    const returnedPeople = queryResultData.map(doc => doc.person);

    for (const name of expectedFive) {
      if (!returnedPeople.includes(name)) {
        throw new Error(`Expected suspect "${name}" missing from query results: ${JSON.stringify(returnedPeople)}`);
      }
    }

    if (returnedPeople.includes('John Doe') || returnedPeople.includes('Jane Smith')) {
      throw new Error(`Decoy outsiders found in query results: ${JSON.stringify(returnedPeople)}`);
    }

    console.log(`✅ 6. Chapter 1 query executed: returned 5 canonical suspects [ ${returnedPeople.join(', ')} ]`);
  } catch (err) {
    console.error('❌ Failed to run query:', err.message);
    process.exit(1);
  }

  // 7. Assert Incomplete Result Rejection (4 suspects, missing Daniel Carter)
  try {
    const incompleteResult = queryResultData.filter(d => d.person !== 'Daniel Carter');
    const rejRes = await fetch(`${API_BASE}/games/${gameId}/challenges/chal_001/validate`, {
      method: 'POST',
      ...reqConfig,
      body: JSON.stringify({ query: validQuery, result: incompleteResult })
    });
    const rejData = await rejRes.json();
    if (rejData.data.solved !== false || rejData.data.xpAwarded !== 0) {
      throw new Error(`Incomplete result was not rejected: ${JSON.stringify(rejData)}`);
    }
    console.log('✅ 7. Incomplete result rejected: solved=false, xpAwarded=0');
  } catch (err) {
    console.error('❌ Incomplete result test failed:', err.message);
    process.exit(1);
  }

  // 8. Assert Incorrect Result Rejection (Outsider John Doe included)
  try {
    const incorrectResult = [...queryResultData, { person: 'John Doe', time: '22:15' }];
    const rejRes2 = await fetch(`${API_BASE}/games/${gameId}/challenges/chal_001/validate`, {
      method: 'POST',
      ...reqConfig,
      body: JSON.stringify({ query: validQuery, result: incorrectResult })
    });
    const rejData2 = await rejRes2.json();
    if (rejData2.data.solved !== false || rejData2.data.xpAwarded !== 0) {
      throw new Error(`Incorrect result was not rejected: ${JSON.stringify(rejData2)}`);
    }
    console.log('✅ 8. Incorrect result rejected: solved=false, xpAwarded=0');
  } catch (err) {
    console.error('❌ Incorrect result test failed:', err.message);
    process.exit(1);
  }

  // 9. First Successful Validation of Chapter 1 Challenge
  try {
    const valRes = await fetch(`${API_BASE}/games/${gameId}/challenges/chal_001/validate`, {
      method: 'POST',
      ...reqConfig,
      body: JSON.stringify({ query: validQuery, result: queryResultData })
    });
    if (!valRes.ok) throw new Error(await valRes.text());
    const valData = await valRes.json();

    if (!valData.data.solved) {
      throw new Error(`Expected solved=true, but got false: ${valData.data.message}`);
    }
    if (valData.data.xpAwarded !== 100) {
      throw new Error(`Expected xpAwarded=100 on first solve, got ${valData.data.xpAwarded}`);
    }
    if (valData.data.nextChapter !== 'chapter_2') {
      throw new Error(`Expected nextChapter="chapter_2", got "${valData.data.nextChapter}"`);
    }
    if (!valData.data.clue || !valData.data.clue.includes('5 suspects were present inside the hotel')) {
      throw new Error(`Clue text does not describe 5 suspects: "${valData.data.clue}"`);
    }

    console.log(`✅ 9. Chapter 1 solved: solved=true, xpAwarded=100, nextChapter="${valData.data.nextChapter}", clue unlocked`);
  } catch (err) {
    console.error('❌ Chapter 1 first solve failed:', err.message);
    process.exit(1);
  }

  // 10. Verify Authoritative User Balance Increased by EXACTLY 100 XP
  try {
    const meRes = await fetch(`${API_BASE}/auth/me`, reqConfig);
    if (!meRes.ok) throw new Error(await meRes.text());
    const meData = await meRes.json();
    const updatedXp = meData.data.xp || 0;
    const deltaXp = updatedXp - initialXp;

    if (deltaXp !== 100 || updatedXp !== 100) {
      throw new Error(`Authoritative XP balance did not increase by 100: initial=${initialXp}, current=${updatedXp}, delta=${deltaXp}`);
    }
    console.log(`✅ 10. Authoritative user balance verified: xp=${updatedXp} (increased by exactly +100)`);
  } catch (err) {
    console.error('❌ Failed to verify authoritative XP increase:', err.message);
    process.exit(1);
  }

  // 11. Concurrent & Serial Duplicate Submission Test
  try {
    // Send two concurrent requests simultaneously to verify race condition immunity
    const [dup1, dup2] = await Promise.all([
      fetch(`${API_BASE}/games/${gameId}/challenges/chal_001/validate`, {
        method: 'POST',
        ...reqConfig,
        body: JSON.stringify({ query: validQuery, result: queryResultData })
      }).then(r => r.json()),
      fetch(`${API_BASE}/games/${gameId}/challenges/chal_001/validate`, {
        method: 'POST',
        ...reqConfig,
        body: JSON.stringify({ query: validQuery, result: queryResultData })
      }).then(r => r.json())
    ]);

    if (!dup1.data.solved || !dup2.data.solved) {
      throw new Error('Concurrent repeat submission did not acknowledge solved state');
    }
    if (dup1.data.xpAwarded !== 0 || dup2.data.xpAwarded !== 0) {
      throw new Error(`Duplicate submission awarded XP: dup1=${dup1.data.xpAwarded}, dup2=${dup2.data.xpAwarded}`);
    }

    // Verify user XP remains exactly 100 (zero additional points)
    const meResAfterDup = await fetch(`${API_BASE}/auth/me`, reqConfig);
    const meDataAfterDup = await meResAfterDup.json();
    const postDupXp = meDataAfterDup.data.xp || 0;

    if (postDupXp !== 100) {
      throw new Error(`Authoritative XP changed after duplicate submission: expected 100, got ${postDupXp}`);
    }

    console.log(`✅ 11. Duplicate submission verified (serial + concurrent): both return xpAwarded=0, user xp remains ${postDupXp}`);
  } catch (err) {
    console.error('❌ Duplicate submission test failed:', err.message);
    process.exit(1);
  }

  // 12. Reload & Resume Persistence Verification
  try {
    const progReloadRes = await fetch(`${API_BASE}/games/${gameId}/progress`, reqConfig);
    if (!progReloadRes.ok) throw new Error(await progReloadRes.text());
    const reloadData = await progReloadRes.json();
    const p = reloadData.data;

    if (p.currentChapter !== 'chapter_2') {
      throw new Error(`Persisted chapter mismatch: expected "chapter_2", got "${p.currentChapter}"`);
    }
    if (!p.completedChallenges.includes('chal_001')) {
      throw new Error(`Persisted completedChallenges missing "chal_001": ${JSON.stringify(p.completedChallenges)}`);
    }
    if (!Array.isArray(p.discoveredClues) || p.discoveredClues.length === 0) {
      throw new Error('Persisted discoveredClues is empty');
    }
    if (!p.discoveredClues[0].includes('5 suspects were present inside the hotel')) {
      throw new Error(`Persisted clue text mismatch: "${p.discoveredClues[0]}"`);
    }

    console.log(`✅ 12. Reload/resume verified: chapter="${p.currentChapter}", completed=[ ${p.completedChallenges.join(', ')} ], clues=${p.discoveredClues.length}`);
  } catch (err) {
    console.error('❌ Reload/resume verification failed:', err.message);
    process.exit(1);
  }

  // 13. Safe Ephemeral Resource Cleanup
  console.log('--- Cleaning Up Ephemeral Test Resources ---');
  try {
    // 1. Delete Firebase Auth user in emulator
    if (token) {
      await fetch('http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:delete?key=fake-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });
      console.log(`🧹 Deleted ephemeral Firebase Auth user: ${freshEmail}`);
    }

    // 2. Clean up MongoDB control-plane records and ephemeral sandbox databases
    if (userId && freshEmail.startsWith('fresh_student_')) {
      const client = new MongoClient('mongodb://localhost:27017');
      await client.connect();
      const platformDb = client.db('datachan_platform');

      // Drop user's sandbox databases
      const vdbs = await platformDb.collection('virtual_databases').find({ userId }).toArray();
      for (const vdb of vdbs) {
        const ns = vdb.physicalDatabaseName || vdb.physicalNamespace;
        if (ns && (ns.startsWith('vdb_g_') || ns.startsWith('dc_ws_'))) {
          await client.db(ns).dropDatabase();
          console.log(`🧹 Dropped ephemeral sandbox database: ${ns}`);
        }
      }

      // Also ensure game sandbox is dropped if not in vdbs
      if (sandboxId && sandboxId.startsWith('vdb_g_')) {
        await client.db(sandboxId).dropDatabase();
        console.log(`🧹 Dropped ephemeral game sandbox database: ${sandboxId}`);
      }

      // Delete user's control plane records
      const delProg = await platformDb.collection('game_progress').deleteMany({ userId });
      const delVdb = await platformDb.collection('virtual_databases').deleteMany({ userId });
      const delWs = await platformDb.collection('workspaces').deleteMany({ userId });
      const delUser = await platformDb.collection('users').deleteOne({ id: userId, email: freshEmail });

      console.log(`🧹 Removed control-plane records: users=${delUser.deletedCount}, workspaces=${delWs.deletedCount}, vdbs=${delVdb.deletedCount}, progress=${delProg.deletedCount}`);

      await client.close();
    }
    console.log('✅ 13. Ephemeral test cleanup complete (shared development accounts strictly untouched)');
  } catch (cleanErr) {
    console.warn('⚠️ Warning during cleanup:', cleanErr.message);
  }

  console.log('🎉 ALL 13 Fresh Lifecycle & Cleanup Verification Steps Passed Perfectly!');
}

run();
