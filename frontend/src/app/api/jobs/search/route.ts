import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

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

    // 1. Fetch user's profile to build the search query
    const profileDoc = await adminDb.collection('profiles').doc(userId).get();
    let searchQuery = "Software Engineer"; // Fallback
    
    if (profileDoc.exists) {
      const data = profileDoc.data();
      const jobTitle = data?.currentJobTitle || (data?.targetRoles && data.targetRoles.length > 0 ? data.targetRoles[0] : "Professional");
      const location = data?.location || "India";
      
      searchQuery = `${jobTitle} in ${location}`;
    }

    // Allow frontend to override the query if needed (e.g. when changing rules)
    if (queryOverrides && queryOverrides.trim() !== "") {
      searchQuery = queryOverrides;
    }

    console.log(`[Job API] Searching JSearch for: "${searchQuery}"`);

    // 2. Call RapidAPI JSearch
    const response = await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(searchQuery)}&page=1&num_pages=1`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': 'jsearch.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Job API] RapidAPI Error:", errorText);
      return NextResponse.json({ error: 'Failed to fetch jobs from RapidAPI' }, { status: 502 });
    }

    const json = await response.json();
    
    // 3. Normalize the JSearch data format into our unified format
    // JSearch returns { data: [ { job_title, employer_name, job_city, job_state, job_apply_link, job_publisher } ] }
    const jobs = (json.data || []).map((job: any) => ({
      role: job.job_title,
      company: job.employer_name,
      location: `${job.job_city || ''}${job.job_city && job.job_state ? ' · ' : ''}${job.job_state || job.job_country || ''}`,
      match: Math.floor(Math.random() * (99 - 80 + 1) + 80), // JSearch doesn't provide match scores, so we simulate a high match
      source: job.job_publisher || "Indeed", // Usually "LinkedIn", "Indeed", etc.
      url: job.job_apply_link || job.job_google_link
    })).filter((job: any) => job.role && job.url).slice(0, 5); // Limit to top 5

    return NextResponse.json({ jobs });

  } catch (error: any) {
    console.error('[Job API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
