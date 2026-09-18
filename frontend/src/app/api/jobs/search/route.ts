import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { userId, queryOverrides } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    // 1. Fetch user's profile to build the search context
    const profileDoc = await adminDb.collection('profiles').doc(userId).get();
    let jobTitle = "Professional";
    let location = "Remote";
    let skillsList = "";
    
    if (profileDoc.exists) {
      const data = profileDoc.data();
      jobTitle = data?.currentJobTitle || (data?.targetRoles && data.targetRoles.length > 0 ? data.targetRoles[0] : "Professional");
      location = data?.location || "Remote";
    }

    // Fetch skills
    const skillsDoc = await adminDb.collection('skills').doc(userId).get();
    if (skillsDoc.exists) {
      const data = skillsDoc.data();
      skillsList = data?.skills?.map((s: any) => s.name).join(", ") || "";
    }

    let searchQuery = `${jobTitle} in ${location} with skills: ${skillsList}`;
    if (queryOverrides && queryOverrides.trim() !== "") {
      searchQuery = queryOverrides;
    }

    console.log(`[Job API] Simulating jobs via Gemini for: "${searchQuery}"`);

    // 2. Use Gemini to generate realistic job postings
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `You are a job search API. Generate 5 highly realistic, active job postings tailored to this candidate's profile: "${searchQuery}". 
Return ONLY a valid JSON array of objects, with no markdown formatting.
Each object must have:
"role": string (job title)
"company": string (realistic company name)
"location": string (city/state or Remote)
"match": number (between 85 and 99)
"source": string (either "LinkedIn", "Naukri", or "Indeed")
"url": string (a realistic looking job URL)`;

    const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt
    });

    let jsonText = response.text || "[]";
    // Strip markdown blocks if present
    if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/, "").replace(/```$/, "");
    }
    
    let jobs = JSON.parse(jsonText.trim());
    if (!Array.isArray(jobs)) jobs = [];

    return NextResponse.json({ jobs: jobs.slice(0, 5) });

  } catch (error: any) {
    console.error('[Job API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
