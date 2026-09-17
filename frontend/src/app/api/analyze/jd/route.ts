import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log("🚀 [API] /api/analyze/jd - Request received");
  try {
    const { userId, applicationId, jobDescription, resumeId } = await request.json();

    if (!userId || !jobDescription) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Fetch user's primary resume
    console.log(`📄 [API] Fetching resume for user: ${userId}`);
    let resumeData: any = null;
    
    if (resumeId) {
      const resumeDoc = await adminDb.collection('resumes').doc(resumeId).get();
      if (resumeDoc.exists && resumeDoc.data()?.parsedData) {
        resumeData = resumeDoc.data()?.parsedData;
      }
    } else {
      // Find primary resume
      const resumesSnapshot = await adminDb.collection('resumes')
        .where('userId', '==', userId)
        .where('isPrimary', '==', true)
        .limit(1)
        .get();
        
      if (!resumesSnapshot.empty && resumesSnapshot.docs[0].data().parsedData) {
        resumeData = resumesSnapshot.docs[0].data().parsedData;
      } else {
        // Fallback to latest parsed resume
        const anyResumeSnapshot = await adminDb.collection('resumes')
          .where('userId', '==', userId)
          .where('status', '==', 'analyzed')
          .orderBy('uploadedAt', 'desc')
          .limit(1)
          .get();
          
        if (!anyResumeSnapshot.empty && anyResumeSnapshot.docs[0].data().parsedData) {
          resumeData = anyResumeSnapshot.docs[0].data().parsedData;
        }
      }
    }

    if (!resumeData) {
      console.log("❌ [API] No parsed resume found for user");
      return NextResponse.json({ error: 'No parsed resume found to compare against. Please upload and parse your resume first.' }, { status: 404 });
    }

    // 2. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log("❌ [API] GEMINI_API_KEY missing");
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 3. Prompt Gemini
    const prompt = `
      You are an expert HR recruiter and ATS algorithms specialist.
      I will provide you with a candidate's structured resume data and a Job Description.
      Analyze how well the candidate fits the Job Description.

      Candidate Resume Data (JSON):
      ${JSON.stringify(resumeData)}

      Job Description:
      ${jobDescription}

      Output ONLY a raw JSON object with NO markdown formatting or backticks.
      The JSON structure should be EXACTLY:
      {
        "matchPercentage": 85, // Number from 0-100 evaluating the fit
        "missingSkills": ["List of", "important skills", "missing from resume"],
        "atsAnalysis": "Brief 1-2 sentence explanation of how an ATS would score this resume based on keyword density.",
        "recommendation": "A 2-3 sentence strategic recommendation on what the candidate should tweak or highlight before applying to this specific role."
      }
    `;

    console.log("🧠 [API] Sending JD and Resume to Gemini AI for analysis...");
    const result = await Promise.race([
      model.generateContent(prompt),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Gemini API timeout after 30 seconds")), 30000))
    ]) as any;

    console.log("✅ [API] Received response from Gemini AI");
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let analysisData: any = {};
    try {
      analysisData = JSON.parse(responseText);
      console.log("✅ [API] Successfully parsed Gemini JSON response");
    } catch (e) {
      console.error("❌ [API] Failed to parse Gemini JSON. Raw text:", responseText);
      throw new Error("Failed to parse AI response");
    }

    // 4. Save the analysis to the application document if applicationId is provided
    if (applicationId) {
      console.log(`💾 [API] Saving analysis to application ${applicationId}...`);
      await adminDb.collection('applications').doc(applicationId).update({
        matchAnalysis: analysisData,
        jobDescription: jobDescription, // Save the JD too
        updatedAt: new Date().toISOString()
      });
    }

    console.log("🎉 [API] Successfully completed JD Analysis!");
    return NextResponse.json({ success: true, analysis: analysisData });
  } catch (error: any) {
    console.error('❌ [API] Error analyzing JD:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze Job Description' }, { status: 500 });
  }
}
