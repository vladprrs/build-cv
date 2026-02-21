'use server';

import { auth } from '@/auth';
import { getUserDatabaseInfo } from './user-db';

export interface ResumeData {
  name: string;
  contacts: { email?: string; linkedin?: string; github?: string };
  summary: string;
  experience: {
    company: string;
    role: string;
    period: string;
    bullets: string[];
  }[];
  skills: string[];
  education: { institution: string; degree: string; period: string }[];
}

const N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL || 'https://n8n.vladpr.com/webhook/resume-optimize';

export async function generateResume(
  vacancyText: string,
): Promise<{ data?: ResumeData; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (!vacancyText || vacancyText.length < 50) {
    return { error: 'Job description must be at least 50 characters' };
  }

  const dbInfo = await getUserDatabaseInfo();
  if (!dbInfo || dbInfo.status !== 'ready' || !dbInfo.tursoDbUrl || !dbInfo.tursoReadOnlyToken) {
    return { error: 'User database not ready. Please wait for setup to complete.' };
  }

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vacancyText,
        dbUrl: dbInfo.tursoDbUrl,
        dbToken: dbInfo.tursoReadOnlyToken,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('n8n webhook error:', response.status, errorBody);
      return { error: 'Failed to generate resume. Please try again.' };
    }

    const result = await response.json();

    // The agent returns the resume as a JSON string in result.resume
    let resumeData: ResumeData;
    if (typeof result.resume === 'string') {
      // Strip markdown code fences if present
      let cleaned = result.resume.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      resumeData = JSON.parse(cleaned);
    } else if (result.resume && typeof result.resume === 'object') {
      resumeData = result.resume;
    } else if (result.data) {
      resumeData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
    } else {
      // Try parsing the whole result
      resumeData = result;
    }

    // Basic shape validation
    if (!resumeData.name || !resumeData.experience) {
      return { error: 'Invalid resume data received from AI agent' };
    }

    return { data: resumeData };
  } catch (err) {
    console.error('Resume generation error:', err);
    return { error: 'Failed to generate resume. Please try again.' };
  }
}
