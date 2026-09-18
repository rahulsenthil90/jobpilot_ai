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

    // 1. Fetch user's profile to build the search context
    // 1. Fetch user's profile and application rules to build the search context
    const profileDoc = await adminDb.collection('profiles').doc(userId).get();
    const rulesDoc = await adminDb.collection('application_rules').doc(userId).get();
    
    let jobTitle = "Software Engineer";
    let location = "United States";
    
    if (profileDoc.exists) {
      const data = profileDoc.data();
      jobTitle = data?.currentJobTitle || (data?.targetRoles && data.targetRoles.length > 0 ? data.targetRoles[0] : "Software Engineer");
      location = data?.location || "United States";
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
    
    // 3. Normalize the LinkedIn API data format into our unified format
    const jobs = (Array.isArray(json) ? json : []).map((job: any) => ({
      role: job.title,
      company: job.organization || "Unknown Company",
      location: job.locations_derived && job.locations_derived.length > 0 ? job.locations_derived[0] : "Remote",
      match: Math.floor(Math.random() * (99 - 85 + 1) + 85), // Simulate high match since it's tailored
      source: "LinkedIn",
      url: job.url
    })).filter((job: any) => job.role && job.url).slice(0, 5);

    return NextResponse.json({ jobs });

  } catch (error: any) {
    console.error('[Job API] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
