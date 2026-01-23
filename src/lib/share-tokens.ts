import { supabase } from '@/integrations/supabase/client';

export type ShareType = 'dashboard' | 'memory' | 'wishlist' | 'trip' | 'highlights';

// Diagnostic information interface
export interface ShareDiagnostics {
  success: boolean;
  method: 'share_links' | 'share_profiles' | 'error';
  error?: string;
  errorDetails?: any;
  tableExists?: boolean;
  token?: string;
  url?: string;
  timestamp: string;
}

export interface ShareTokenOptions {
  userId: string;
  shareType: ShareType;
  itemId?: string; // Specific item ID (for memory, trip, etc.)
  includedFields: string[]; // What data to include (e.g., ['countries', 'memories', 'stats'])
  // Note: All share links are permanent (never expire) for brand awareness and sharing
}

export interface ShareLinkData {
  id: string;
  token: string;
  user_id: string;
  share_type: ShareType;
  item_id: string | null;
  included_fields: string[];
  created_at: string;
  expires_at: string | null; // Always null - links are permanent (never expire)
  view_count: number;
}

/**
 * Generate a secure random token (32 characters, URL-safe)
 */
function generateToken(): string {
  // Use crypto.getRandomValues for better randomness (like the old system)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: generate random string
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Check if share_links table exists by attempting a query
 */
async function checkShareLinksTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('share_links')
      .select('id')
      .limit(1);
    
    // If error is about table not existing, return false
    if (error && (error.message.includes('does not exist') || error.code === '42P01')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate share token using old share_profiles system (fallback)
 */
async function generateShareTokenLegacy(userId: string, shareType: ShareType): Promise<string> {
  // For dashboard, use the old share_profiles system
  if (shareType === 'dashboard') {
    // Fetch or create share profile
    let { data: profile, error } = await supabase
      .from("share_profiles")
      .select("id, dashboard_share_token, is_public")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && !error.message.includes('does not exist')) {
      throw new Error(`Failed to fetch share profile: ${error.message}`);
    }

    // Create if doesn't exist
    if (!profile) {
      const newToken = generateToken();
      const { data: newProfile, error: createError } = await supabase
        .from("share_profiles")
        .insert({
          user_id: userId,
          is_public: true,
          show_stats: true,
          show_map: true,
          show_countries: true,
          show_photos: true,
          dashboard_share_token: newToken,
        })
        .select("dashboard_share_token")
        .single();

      if (createError) {
        throw new Error(`Failed to create share profile: ${createError.message}`);
      }
      profile = newProfile;
    }

    // Generate token if missing
    if (!profile.dashboard_share_token) {
      const newToken = generateToken();
      const { error: updateError } = await supabase
        .from("share_profiles")
        .update({ 
          dashboard_share_token: newToken,
          is_public: true 
        })
        .eq("id", profile.id);

      if (updateError) {
        throw new Error(`Failed to update share profile: ${updateError.message}`);
      }
      profile.dashboard_share_token = newToken;
    }

    // Ensure it's public
    if (!profile.is_public) {
      await supabase
        .from("share_profiles")
        .update({ is_public: true })
        .eq("id", profile.id);
    }

    return `${window.location.origin}/dashboard/${profile.dashboard_share_token}`;
  }

  throw new Error(`Legacy system not supported for share type: ${shareType}`);
}

/**
 * Generate a share token and store it in the database
 * Falls back to legacy share_profiles system if share_links table doesn't exist
 */
export async function generateShareToken(options: ShareTokenOptions): Promise<string> {
  const { userId, shareType, itemId, includedFields } = options;

  // Generate secure random token
  const token = generateToken().toLowerCase();

  // Try new share_links table first
  const tableExists = await checkShareLinksTableExists();
  
  if (tableExists) {
    try {
      // Create permanent share link (never expires) for brand awareness
      let insertData: any = {
        token: token,
        user_id: userId,
        share_type: shareType,
        item_id: itemId || null,
        included_fields: includedFields,
        created_at: new Date().toISOString(),
        expires_at: null, // Permanent link - never expires
        view_count: 0,
      };

      let { data, error } = await supabase
        .from('share_links')
        .insert(insertData)
        .select()
        .single();

      // If error is about missing column, try without expires_at
      if (error && (error.message.includes('expires_at') || error.message.includes('column') || error.code === '42703')) {
        console.warn('expires_at column not found, retrying without it:', error.message);
        // Remove expires_at and try again
        delete insertData.expires_at;
        const retryResult = await supabase
          .from('share_links')
          .insert(insertData)
          .select()
          .single();
        
        if (retryResult.error) {
          console.warn('share_links insert failed after retry, trying legacy system:', retryResult.error);
          // Fall through to legacy system
        } else {
          data = retryResult.data;
          error = null;
        }
      }

      if (!error && data) {
        // Success with new system
        const baseUrl = window.location.origin;
        switch (shareType) {
          case 'dashboard':
            return `${baseUrl}/share/dashboard/${token}`;
          case 'memory':
            return `${baseUrl}/share/memory/${token}`;
          case 'wishlist':
            return `${baseUrl}/share/wishlist/${token}`;
          case 'trip':
            return `${baseUrl}/share/trip/${token}`;
          case 'highlights':
            return `${baseUrl}/highlights/${token}`;
          default:
            return `${baseUrl}/share/${token}`;
        }
      } else if (error) {
        console.warn('share_links insert failed, trying legacy system:', error);
        // Fall through to legacy system
      }
    } catch (err) {
      console.warn('share_links insert error, trying legacy system:', err);
      // Fall through to legacy system
    }
  }

  // Fallback to legacy system for dashboard
  if (shareType === 'dashboard') {
    console.log('Using legacy share_profiles system for dashboard sharing');
    return await generateShareTokenLegacy(userId, shareType);
  }

  // For other types, throw error if new system fails
  throw new Error(`Failed to generate share token: share_links table may not exist. Please run database migrations.`);
}

/**
 * Diagnostic function to check share system status
 */
export async function diagnoseShareSystem(userId: string): Promise<ShareDiagnostics> {
  const diagnostics: ShareDiagnostics = {
    success: false,
    method: 'error',
    timestamp: new Date().toISOString(),
  };

  try {
    // Check if share_links table exists
    const shareLinksExists = await checkShareLinksTableExists();
    diagnostics.tableExists = shareLinksExists;

    if (shareLinksExists) {
      // Test insert/delete (without expires_at to avoid schema issues)
      const testToken = generateToken().toLowerCase();
      const { data, error } = await supabase
        .from('share_links')
        .insert({
          token: testToken,
          user_id: userId,
          share_type: 'dashboard',
          included_fields: ['test'],
          view_count: 0,
        })
        .select()
        .single();

      if (error) {
        // If it's a column error, try without expires_at
        if (error.message.includes('expires_at') || error.message.includes('column') || error.code === '42703') {
          const retryResult = await supabase
            .from('share_links')
            .insert({
              token: testToken,
              user_id: userId,
              share_type: 'dashboard',
              included_fields: ['test'],
              view_count: 0,
            })
            .select()
            .single();

          if (retryResult.error) {
            diagnostics.error = retryResult.error.message;
            diagnostics.errorDetails = retryResult.error;
          } else {
            // Clean up test record
            await supabase
              .from('share_links')
              .delete()
              .eq('id', retryResult.data.id);

            diagnostics.success = true;
            diagnostics.method = 'share_links';
            diagnostics.token = testToken;
          }
        } else {
          diagnostics.error = error.message;
          diagnostics.errorDetails = error;
        }
      } else {
        // Clean up test record
        await supabase
          .from('share_links')
          .delete()
          .eq('id', data.id);

        diagnostics.success = true;
        diagnostics.method = 'share_links';
        diagnostics.token = testToken;
      }
    } else {
      // Check legacy system
      const { data, error } = await supabase
        .from("share_profiles")
        .select("dashboard_share_token")
        .eq("user_id", userId)
        .maybeSingle();

      if (error && !error.message.includes('does not exist')) {
        diagnostics.error = `share_profiles error: ${error.message}`;
        diagnostics.errorDetails = error;
      } else {
        diagnostics.success = true;
        diagnostics.method = 'share_profiles';
        if (data?.dashboard_share_token) {
          diagnostics.token = data.dashboard_share_token;
          diagnostics.url = `${window.location.origin}/dashboard/${data.dashboard_share_token}`;
        }
      }
    }
  } catch (err: any) {
    diagnostics.error = err.message || 'Unknown error';
    diagnostics.errorDetails = err;
  }

  return diagnostics;
}

/**
 * Retrieve share token data from the database
 */
export async function getShareTokenData(token: string): Promise<ShareLinkData | null> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token.toLowerCase())
    .single();

  if (error) {
    console.error('Failed to get share token data:', error);
    return null;
  }

  // Note: Share links are permanent and never expire (for brand awareness)
  // No expiration check needed

  // Increment view count
  await supabase
    .from('share_links')
    .update({ view_count: (data.view_count || 0) + 1 })
    .eq('id', data.id);

  return data as ShareLinkData;
}

/**
 * Revoke a share token (delete it)
 */
export async function revokeShareToken(token: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('token', token.toLowerCase())
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to revoke share token:', error);
    throw new Error(`Failed to revoke share token: ${error.message}`);
  }
}

/**
 * Get all share links for a user
 */
export async function getUserShareLinks(userId: string, shareType?: ShareType): Promise<ShareLinkData[]> {
  let query = supabase
    .from('share_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (shareType) {
    query = query.eq('share_type', shareType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to get user share links:', error);
    return [];
  }

  return (data || []) as ShareLinkData[];
}
