/**
 * Turso Platform API client for provisioning per-user databases.
 * Uses TURSO_PLATFORM_API_TOKEN and TURSO_ORG_NAME env vars.
 */

interface CreateDatabaseResult {
  dbName: string;
  dbUrl: string;
  authToken: string;
  readOnlyToken: string;
}

const TURSO_API_BASE = 'https://api.turso.tech/v1';

function getApiHeaders(): HeadersInit {
  const token = process.env.TURSO_PLATFORM_API_TOKEN;
  if (!token) throw new Error('TURSO_PLATFORM_API_TOKEN is not set');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function getOrgName(): string {
  const org = process.env.TURSO_ORG_NAME;
  if (!org) throw new Error('TURSO_ORG_NAME is not set');
  return org;
}

/**
 * Create a new Turso database for a user, plus RW and read-only tokens.
 */
export async function createUserDatabase(userId: string): Promise<CreateDatabaseResult> {
  const org = getOrgName();
  const headers = getApiHeaders();

  // DB name: buildcv-{first 8 chars of userId}
  const dbName = `buildcv-${userId.slice(0, 8).toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // Get the group to use (default group)
  const groupName = process.env.TURSO_GROUP_NAME || 'default';

  // Create database
  const createRes = await fetch(`${TURSO_API_BASE}/organizations/${org}/databases`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: dbName,
      group: groupName,
    }),
  });

  let dbUrl: string;

  if (createRes.ok) {
    const createData = await createRes.json();
    const hostname = createData.database?.hostname;
    if (!hostname) {
      throw new Error('No hostname returned from database creation');
    }
    dbUrl = `libsql://${hostname}`;
  } else if (createRes.status === 409) {
    // Database already exists — look up its hostname
    const getRes = await fetch(
      `${TURSO_API_BASE}/organizations/${org}/databases/${dbName}`,
      { method: 'GET', headers }
    );
    if (!getRes.ok) {
      throw new Error(`Failed to get existing database: ${getRes.status} ${await getRes.text()}`);
    }
    const getData = await getRes.json();
    const hostname = getData.database?.hostname;
    if (!hostname) {
      throw new Error('No hostname returned for existing database');
    }
    dbUrl = `libsql://${hostname}`;
  } else {
    const errorBody = await createRes.text();
    throw new Error(`Failed to create database: ${createRes.status} ${errorBody}`);
  }

  // Create RW auth token
  const rwTokenRes = await fetch(
    `${TURSO_API_BASE}/organizations/${org}/databases/${dbName}/auth/tokens`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ permissions: { read_attach: { databases: ['*'] } } }),
    }
  );

  if (!rwTokenRes.ok) {
    const errorBody = await rwTokenRes.text();
    throw new Error(`Failed to create RW token: ${rwTokenRes.status} ${errorBody}`);
  }

  const rwTokenData = await rwTokenRes.json();
  const authToken = rwTokenData.jwt;

  // Create read-only token
  const roTokenRes = await fetch(
    `${TURSO_API_BASE}/organizations/${org}/databases/${dbName}/auth/tokens`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        permissions: { read_attach: { databases: ['*'] } },
        authorization: 'read-only',
      }),
    }
  );

  if (!roTokenRes.ok) {
    const errorBody = await roTokenRes.text();
    throw new Error(`Failed to create read-only token: ${roTokenRes.status} ${errorBody}`);
  }

  const roTokenData = await roTokenRes.json();
  const readOnlyToken = roTokenData.jwt;

  return { dbName, dbUrl, authToken, readOnlyToken };
}
