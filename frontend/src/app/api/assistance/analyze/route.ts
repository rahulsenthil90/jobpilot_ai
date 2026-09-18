import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: Request) {
  try {
    const { userId, jobDescription } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }
    
    if (!jobDescription || jobDescription.trim() === "") {
      return NextResponse.json({ error: 'Missing jobDescription' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured in .env.local' }, { status: 500 });
    }

    // Fetch user's profile and skills to build the search context
    const profileDoc = await adminDb.collection('profiles').doc(userId).get();
    let resumeText = "";
    if (profileDoc.exists) {
      const data = profileDoc.data();
      resumeText = data?.resumeText || "";
    }
    
    const skillsDoc = await adminDb.collection('skills').doc(userId).get();
    let skillsList = "";
    if (skillsDoc.exists) {
      const data = skillsDoc.data();
      skillsList = data?.skills?.map((s: any) => s.name).join(", ") || "";
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert HR job matching system. 
Analyze the provided job description against the candidate's resume and skills.

CANDIDATE RESUME:
${resumeText}

CANDIDATE SKILLS:
${skillsList}

JOB DESCRIPTION:
${jobDescription}

Respond with ONLY a raw JSON object containing the following keys (no markdown formatting, no backticks):
{
  "matchScore": <integer between 0 and 100>,
  "requiredSkills": [<array of strings of key skills required by the job>],
  "missingSkills": [<array of strings of required skills that the candidate is missing>],
  "summary": "<a 2-3 sentence summary explaining the match score and fit>"
}
`;

    const evalResponse = await model.generateContent(prompt);

    let jsonText = evalResponse.response.text() || "{}";
    if (jsonText.startsWith("\`\`\`json")) {
        jsonText = jsonText.replace(/\`\`\`json\n?/, "").replace(/\`\`\`$/, "");
    } else if (jsonText.startsWith("\`\`\`")) {
        jsonText = jsonText.replace(/\`\`\`\n?/, "").replace(/\`\`\`$/, "");
    }
    
    const result = JSON.parse(jsonText.trim());

    return NextResponse.json({ result });

  } catch (error: any) {
    console.error('[Analyze API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
