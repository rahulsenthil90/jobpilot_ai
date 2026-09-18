import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { userId, queryOverrides } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const rapidApiKey = process.env.RAPIDAPI_KEY;
    if (!rapidApiKey) {
      return NextResponse.json({ error: 'RAPIDAPI_KEY is not configured in .env.local' }, { status: 500 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    // 1. Fetch user's profile to build the search context
    // 1. Fetch user's profile and application rules to build the search context
    const profileDoc = await adminDb.collection('profiles').doc(userId).get();
    const rulesDoc = await adminDb.collection('application_rules').doc(userId).get();
    
    let jobTitle = "Software Engineer";
    let location = "United States";
    let resumeText = "";
    
    if (profileDoc.exists) {
      const data = profileDoc.data();
      jobTitle = data?.currentJobTitle || (data?.targetRoles && data.targetRoles.length > 0 ? data.targetRoles[0] : "Software Engineer");
      location = data?.location || "United States";
      resumeText = data?.resumeText || "";
    }

    if (rulesDoc.exists) {
      const rules = rulesDoc.data();
      if (rules?.preferred_locations && rules.preferred_locations.length > 0) {
        location = rules.preferred_locations.join(", ");
      }
      if (rules?.preferred_job_title && rules.preferred_job_title.trim() !== "") {
        jobTitle = rules.preferred_job_title.trim();
      }
    }
    
    // Fetch skills
    const skillsDoc = await adminDb.collection('skills').doc(userId).get();
    let skillsList = "";
    if (skillsDoc.exists) {
      const data = skillsDoc.data();
      skillsList = data?.skills?.map((s: any) => s.name).join(", ") || "";
    }

    let searchQuery = jobTitle;
    let searchLocation = location;
    
    if (queryOverrides && queryOverrides.trim() !== "") {
      searchQuery = queryOverrides;
    }

    console.log(`[Job API] Searching LinkedIn API for: "${searchQuery}" in "${searchLocation}"`);

    // 2. Call the LinkedIn Job Search API
    // Using the /active-jb endpoint which returns the actual jobs list
    const url = new URL('https://linkedin-job-search-api.p.rapidapi.com/active-jb');
    url.searchParams.append('description_format', 'text');
    url.searchParams.append('title', searchQuery);
    url.searchParams.append('location', searchLocation);
    url.searchParams.append('time_frame', '24h');
    url.searchParams.append('offset', '0');
    url.searchParams.append('limit', '5');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'linkedin-job-search-api.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Job API] RapidAPI LinkedIn Error:", errorText);
      return NextResponse.json({ error: 'Failed to fetch jobs from LinkedIn API' }, { status: 502 });
    }

    const json = await response.json();
    let jobsList = (Array.isArray(json) ? json : []).filter((job: any) => job.title && job.url).slice(0, 5);

    // 3. Normalize and evaluate matches via Gemini AI
    console.log(`[Job API] Evaluating matches using Gemini...`);
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const jobs = await Promise.all(jobsList.map(async (job: any) => {
      let matchScore = 85;
      
      try {
        const prompt = `You are an expert HR job matching system. 
Calculate a match percentage (integer between 50 and 99) for this candidate applying to this job.

CANDIDATE RESUME:
${resumeText}

CANDIDATE SKILLS:
${skillsList}

JOB DESCRIPTION:
Title: ${job.title}
Company: ${job.organization}
Description: ${job.description_text || "No description provided."}

Return ONLY a single integer representing the match score (e.g. 92). Do not include any other text or characters.`;

        const evalResponse = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt
        });

        const scoreText = evalResponse.text?.replace(/[^0-9]/g, '');
        if (scoreText) {
          const score = parseInt(scoreText, 10);
          if (!isNaN(score) && score >= 0 && score <= 100) {
             matchScore = score;
          }
        }
      } catch (err) {
        console.error(`[Job API] Failed to evaluate match for job ${job.title}`, err);
      }

      return {
        role: job.title,
        company: job.organization || "Unknown Company",
        location: job.locations_derived && job.locations_derived.length > 0 ? job.locations_derived[0] : "Remote",
        match: matchScore,
        source: "LinkedIn",
        url: job.url
      };
    }));

    return NextResponse.json({ jobs });

  } catch (error: any) {
    console.error('[Job API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
