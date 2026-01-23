/**
 * Share Link Diagnostic Script
 * Run this in your browser console on the share link page to diagnose issues
 * 
 * Usage:
 * 1. Open share link in browser (even if it shows error)
 * 2. Open browser console (F12)
 * 3. Paste this entire script
 * 4. Run: diagnoseShareLink('c29341b2751eaa1fbd9752967214be46')
 */

async function diagnoseShareLink(token) {
  console.log('🔍 DIAGNOSING SHARE LINK:', token);
  console.log('='.repeat(60));
  
  const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || window.__SUPABASE_URL__;
  const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || window.__SUPABASE_KEY__;
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  // Test 1: Check if edge function is accessible
  console.log('\n📡 Test 1: Edge Function Access');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-public-dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({ token }),
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (data.debug) {
      console.log('\n🐛 Debug Info:');
      console.log('- Token found:', data.debug.token_found);
      console.log('- Token source:', data.debug.token_source);
      console.log('- Query steps:', data.debug.query_steps);
      console.log('- Failures:', data.debug.failures);
      console.log('- Schema detected:', data.debug.schema_detected);
      console.log('- Columns found:', data.debug.share_link_query_result?.columns_found);
      console.log('- Full debug:', JSON.stringify(data.debug, null, 2));
    }
  } catch (err) {
    console.error('❌ Edge function call failed:', err);
  }
  
  // Test 2: Check Supabase client auth state
  console.log('\n🔐 Test 2: Auth State');
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(SUPABASE_URL, SUPABASE_KEY);
    const { data: { session } } = await client.auth.getSession();
    console.log('Has session:', !!session);
    console.log('User ID:', session?.user?.id || 'none');
  } catch (err) {
    console.error('❌ Auth check failed:', err);
  }
  
  // Test 3: Direct database query (if possible)
  console.log('\n💾 Test 3: Direct Database Query');
  console.log('⚠️  This requires SERVICE_ROLE_KEY - run in Supabase SQL Editor instead:');
  console.log(`
SELECT 
  token,
  owner_user_id,
  user_id,
  is_active,
  include_stats,
  include_countries,
  include_memories,
  created_at
FROM share_links 
WHERE token = '${token}';
  `);
  
  console.log('\n✅ Diagnosis complete!');
  console.log('='.repeat(60));
}

// Auto-run if token is in URL
if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = window.location.pathname.split('/').pop();
  if (tokenFromUrl && tokenFromUrl.length === 32) {
    console.log('🔍 Auto-detected token from URL');
    diagnoseShareLink(tokenFromUrl);
  }
}
