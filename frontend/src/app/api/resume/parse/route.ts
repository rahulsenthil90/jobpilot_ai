import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

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

    // 2. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // 3. Prompt Gemini with the PDF directly as inlineData
    const prompt = `
      You are an expert ATS (Applicant Tracking System) and HR recruiter. 
      Analyze the attached PDF resume and extract the information in highly detailed JSON format.
      Return ONLY a raw JSON object with no markdown formatting or backticks.
      
      Extract a "resumeScore" (number from 0-100) evaluating the strength of the resume.
      Extract "scoreFeedback" (array of strings) with constructive feedback points.

      The JSON structure should be EXACTLY:
      {
        "name": "Full Name",
        "email": "Email Address",
        "phone": "Phone Number",
        "location": "City, State or Country",
        "linkedin": "LinkedIn URL",
        "github": "GitHub URL",
        "portfolio": "Portfolio URL",
        "skills": ["Skill 1", "Skill 2", "Skill 3"],
        "resumeScore": 85,
        "scoreFeedback": ["Strong action verbs used", "Missing quantified metrics in experience"],
        "experience": [
          {
            "company": "Company Name",
            "jobTitle": "Job Title",
            "employmentType": "Full-time", // Full-time, Part-time, Contract, etc.
            "startDate": "YYYY-MM",
            "endDate": "YYYY-MM", // or empty string if current
            "isCurrent": false,
            "location": "City, State",
            "description": "Short summary of the role",
            "responsibilities": "Bullet point 1\\nBullet point 2", // separated by newlines
            "achievements": "Metric 1\\nMetric 2",
            "technologies": "React, Node.js, AWS",
            "domain": "FinTech"
          }
        ],
        "education": [
          {
            "degree": "Degree Name (e.g. BS Computer Science)",
            "institution": "University Name",
            "startYear": "YYYY",
            "endYear": "YYYY",
            "location": "City, State",
            "description": "GPA, honors, relevant coursework"
          }
        ],
        "projects": [
          {
            "name": "Project Name",
            "company": "Company or University (if applicable)",
            "role": "Your Role",
            "startDate": "YYYY-MM",
            "endDate": "YYYY-MM",
            "description": "Short description",
            "responsibilities": "Bullet point 1\\nBullet point 2",
            "technologies": "Python, TensorFlow",
            "domain": "AI/ML"
          }
        ]
      }
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      },
      prompt
    ]);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsedData: any = {};
    try {
      parsedData = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      throw new Error("Failed to parse AI response");
    }

    const batch = adminDb.batch();

    // 4. Clear existing extracted data for this user to prevent duplicates
    const collectionsToClear = ['experiences', 'education', 'projects'];
    for (const colName of collectionsToClear) {
      const snapshot = await adminDb.collection(colName).where('userId', '==', userId).get();
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }

    // 5. Insert newly extracted Data
    const now = new Date().toISOString();
    
    if (parsedData.experience && Array.isArray(parsedData.experience)) {
      for (const exp of parsedData.experience) {
        const ref = adminDb.collection('experiences').doc();
        batch.set(ref, { ...exp, userId, updatedAt: now });
      }
    }
    
    if (parsedData.education && Array.isArray(parsedData.education)) {
      for (const edu of parsedData.education) {
        const ref = adminDb.collection('education').doc();
        batch.set(ref, { ...edu, userId, updatedAt: now });
      }
    }
    
    if (parsedData.projects && Array.isArray(parsedData.projects)) {
      for (const proj of parsedData.projects) {
        const ref = adminDb.collection('projects').doc();
        batch.set(ref, { ...proj, userId, updatedAt: now });
      }
    }

    // 6. Update Profile
    const profileRef = adminDb.collection('profiles').doc(userId);
    const profileDoc = await profileRef.get();
    const profileUpdates: any = {};
    if (parsedData.skills) profileUpdates.skills = parsedData.skills.join(', ');
    if (parsedData.name && !profileDoc.data()?.name) profileUpdates.name = parsedData.name;
    if (parsedData.phone && !profileDoc.data()?.phone) profileUpdates.phone = parsedData.phone;
    if (parsedData.location && !profileDoc.data()?.location) profileUpdates.location = parsedData.location;
    if (parsedData.linkedin && !profileDoc.data()?.linkedin) profileUpdates.linkedin = parsedData.linkedin;
    if (parsedData.github && !profileDoc.data()?.github) profileUpdates.github = parsedData.github;
    if (parsedData.portfolio && !profileDoc.data()?.portfolio) profileUpdates.portfolio = parsedData.portfolio;
    
    if (Object.keys(profileUpdates).length > 0) {
      batch.set(profileRef, profileUpdates, { merge: true });
    }

    // 7. Save the parsed data and score to Firestore Resume document
    const resumeRef = adminDb.collection('resumes').doc(resumeId);
    batch.update(resumeRef, {
      parsedData,
      status: 'analyzed',
      analyzedAt: now,
      resumeScore: parsedData.resumeScore || 0,
      scoreFeedback: parsedData.scoreFeedback || []
    });

    await batch.commit();

    return NextResponse.json({ success: true, parsedData });
  } catch (error: any) {
    console.error('Error analyzing resume:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze resume' }, { status: 500 });
  }
}
