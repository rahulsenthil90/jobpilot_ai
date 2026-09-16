import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';

export async function POST(request: Request) {
  try {
    const { userId, resumeId, fileUrl } = await request.json();

    if (!userId || !resumeId || !fileUrl) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Download the PDF from Firebase Storage URL
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error('Failed to fetch resume file');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Parse PDF to text
    const pdfData = await pdfParse(buffer);
    const resumeText = pdfData.text;

    // 3. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 4. Prompt Gemini to extract structured data
    const prompt = `
      You are an expert ATS (Applicant Tracking System) and HR recruiter. 
      Analyze the following resume text and extract the information in JSON format.
      Return ONLY a raw JSON object with no markdown formatting or backticks.
      
      The JSON structure should be exactly:
      {
        "name": "Full Name",
        "email": "Email Address",
        "phone": "Phone Number",
        "skills": ["Skill 1", "Skill 2"],
        "experience_years": 5, // total years of experience as a number
        "education": ["Degree 1", "Degree 2"],
        "roles": ["Role 1", "Role 2"]
      }

      Resume Text:
      ${resumeText}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      throw new Error("Failed to parse AI response");
    }

    // 5. Save the parsed data to Firestore
    await adminDb.collection('resumes').doc(resumeId).update({
      parsedData,
      status: 'analyzed',
      analyzedAt: new Date().toISOString()
    });

    // Optionally update user profile with extracted skills if empty
    const profileRef = adminDb.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    if (profileDoc.exists) {
      const existingData = profileDoc.data();
      if (!existingData?.skills && parsedData.skills) {
        await profileRef.update({
          skills: parsedData.skills.join(', ')
        });
      }
    }

    return NextResponse.json({ success: true, parsedData });
  } catch (error: any) {
    console.error('Error analyzing resume:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze resume' }, { status: 500 });
  }
}
