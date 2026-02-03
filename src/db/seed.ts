import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { jobs, highlights } from './schema';
import { config } from 'dotenv';

// Load .env.local explicitly
config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client);

async function setupTables() {
  console.log('🔧 Setting up tables...\n');

  // Создаём таблицы если их нет
  await client.execute(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      logo_url TEXT,
      website TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log('✅ Table "jobs" ready');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY NOT NULL,
      job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      domains TEXT DEFAULT '[]' NOT NULL,
      skills TEXT DEFAULT '[]' NOT NULL,
      keywords TEXT DEFAULT '[]' NOT NULL,
      metrics TEXT DEFAULT '[]' NOT NULL,
      is_hidden INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log('✅ Table "highlights" ready');
}

async function seed() {
  await setupTables();

  console.log('\n🌱 Seeding data...\n');

  // Очищаем существующие данные
  try {
    await client.execute('DELETE FROM highlights');
    await client.execute('DELETE FROM jobs');
    console.log('🗑️  Cleared existing data');
  } catch (e) {
    console.log('ℹ️  No existing data to clear');
  }

  // Создаём тестовые компании
  const acmeId = crypto.randomUUID();
  const techCorpId = crypto.randomUUID();
  const startupId = crypto.randomUUID();

  await db.insert(jobs).values([
    {
      id: acmeId,
      company: 'Acme Corporation',
      role: 'Senior Product Manager',
      startDate: '2020-03-01',
      endDate: '2023-06-30',
      logoUrl: 'https://ui-avatars.com/api/?name=Acme&background=0D8ABC&color=fff',
      website: 'https://acme.example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: techCorpId,
      company: 'TechCorp Inc.',
      role: 'Product Manager',
      startDate: '2018-06-01',
      endDate: '2020-02-28',
      logoUrl: 'https://ui-avatars.com/api/?name=TechCorp&background=6366F1&color=fff',
      website: 'https://techcorp.example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: startupId,
      company: 'FastStartup',
      role: 'Junior Product Analyst',
      startDate: '2016-09-01',
      endDate: '2018-05-30',
      logoUrl: 'https://ui-avatars.com/api/?name=FastStartup&background=10B981&color=fff',
      website: 'https://faststartup.example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  console.log('✅ Created 3 jobs');

  // Создаём хайлайты
  await db.insert(highlights).values([
    // Acme Corporation highlights
    {
      id: crypto.randomUUID(),
      jobId: acmeId,
      type: 'achievement',
      title: 'Increased checkout conversion by 25%',
      content: 'Led a cross-functional team of 8 people to redesign the checkout flow. Conducted user research with 50+ customers, identified 12 friction points, and implemented A/B tests that resulted in 25% conversion increase.',
      startDate: '2022-01-01',
      endDate: '2022-06-30',
      domains: ['e-commerce', 'fintech'],
      skills: ['A/B Testing', 'User Research', 'Data Analysis', 'Figma'],
      keywords: ['conversion', 'growth', 'checkout', 'optimization'],
      metrics: [
        { label: 'Conversion Growth', value: 25, unit: '%', prefix: '+' },
        { label: 'Revenue Impact', value: 2.5, unit: 'M', prefix: '$' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      jobId: acmeId,
      type: 'project',
      title: 'Launched mobile payment SDK',
      content: 'Spearheaded the development and launch of a mobile payment SDK used by 50+ merchant partners. Defined product roadmap, prioritized features, and coordinated with engineering teams across 3 time zones.',
      startDate: '2021-03-01',
      endDate: '2021-12-31',
      domains: ['fintech', 'mobile', 'b2b'],
      skills: ['Product Strategy', 'API Design', 'Stakeholder Management', 'Agile'],
      keywords: ['sdk', 'payments', 'mobile', 'partners'],
      metrics: [
        { label: 'Merchant Partners', value: 50, unit: '+', prefix: '' },
        { label: 'Time to Market', value: 6, unit: ' months', prefix: '' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      jobId: acmeId,
      type: 'responsibility',
      title: 'Product team lead for Growth squad',
      content: 'Managed a team of 3 PMs and 2 designers focused on user acquisition and retention. Established OKRs, sprint planning processes, and cross-functional communication rhythms.',
      startDate: '2020-03-01',
      endDate: '2023-06-30',
      domains: ['growth', 'leadership'],
      skills: ['Team Leadership', 'OKRs', 'Hiring', 'Mentoring'],
      keywords: ['management', 'growth', 'team'],
      metrics: [
        { label: 'Team Size', value: 5, unit: ' people', prefix: '' },
        { label: 'Direct Reports', value: 3, unit: ' PMs', prefix: '' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // TechCorp highlights
    {
      id: crypto.randomUUID(),
      jobId: techCorpId,
      type: 'achievement',
      title: 'Reduced customer churn by 15%',
      content: 'Analyzed churn patterns and identified key drop-off points in the user journey. Implemented targeted email campaigns and in-app onboarding improvements.',
      startDate: '2019-06-01',
      endDate: '2019-12-31',
      domains: ['saas', 'analytics'],
      skills: ['SQL', 'Customer Success', 'Email Marketing', 'Mixpanel'],
      keywords: ['churn', 'retention', 'analytics'],
      metrics: [
        { label: 'Churn Reduction', value: 15, unit: '%', prefix: '-' },
        { label: 'ARR Saved', value: 500, unit: 'K', prefix: '$' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      jobId: techCorpId,
      type: 'project',
      title: 'Built analytics dashboard for enterprise clients',
      content: 'Designed and launched a self-service analytics dashboard that reduced support tickets by 40%. Worked closely with enterprise clients to understand their reporting needs.',
      startDate: '2018-09-01',
      endDate: '2019-05-30',
      domains: ['b2b', 'analytics', 'enterprise'],
      skills: ['Product Design', 'SQL', 'Tableau', 'User Interviews'],
      keywords: ['dashboard', 'analytics', 'enterprise', 'self-service'],
      metrics: [
        { label: 'Support Tickets', value: 40, unit: '%', prefix: '-' },
        { label: 'Enterprise Clients', value: 25, unit: '+', prefix: '' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    // FastStartup highlights
    {
      id: crypto.randomUUID(),
      jobId: startupId,
      type: 'education',
      title: 'Completed Product Management certification',
      content: 'Intensive 12-week program covering product strategy, user research, and agile methodologies. Final project: launched a feature from ideation to MVP.',
      startDate: '2017-01-01',
      endDate: '2017-03-30',
      domains: ['education', 'product-management'],
      skills: ['Product Strategy', 'Agile', 'User Research', 'Prototyping'],
      keywords: ['certification', 'education', 'training'],
      metrics: [
        { label: 'Duration', value: 12, unit: ' weeks', prefix: '' },
        { label: 'Projects Completed', value: 5, unit: '', prefix: '' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      jobId: startupId,
      type: 'achievement',
      title: 'First successful product launch',
      content: "Coordinated the launch of the company's first mobile app. Managed beta testing with 100 users, gathered feedback, and iterated before public release.",
      startDate: '2017-06-01',
      endDate: '2017-09-30',
      domains: ['mobile', 'startup'],
      skills: ['Launch Strategy', 'Beta Testing', 'App Store', 'Coordination'],
      keywords: ['launch', 'mobile', 'startup', 'first'],
      metrics: [
        { label: 'Beta Users', value: 100, unit: '', prefix: '' },
        { label: 'App Rating', value: 4.5, unit: '/5', prefix: '' },
      ],
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);
  console.log('✅ Created 7 highlights');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log('   • 3 Jobs (Acme Corp, TechCorp, FastStartup)');
  console.log('   • 7 Highlights with metrics');
  console.log('   • Mix of achievements, projects, responsibilities, and education');
  
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
