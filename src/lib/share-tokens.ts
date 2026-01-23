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

// Simple share link data matching actual database schema
export interface ShareLinkData {
  id: string;
  token: string;
  owner_user_id: string;
  is_active: boolean;
  include_stats: boolean;
  include_countries: boolean;
  include_memories: boolean;
  created_at: string;
  last_accessed_at: string | null;
  // Note: Share links are permanent (never expire) for brand awareness
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
        .select("id, dashboard_share_token, is_public")
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
  const { userId, shareType, includedFields } = options;

  // Generate secure random token
  const token = generateToken().toLowerCase();

  // Try new share_links table first
  const tableExists = await checkShareLinksTableExists();
  
  if (tableExists) {
    try {
      // Create permanent share link (never expires) for brand awareness
      // Using actual database schema: owner_user_id, is_active, include_* flags
      const insertData = {
        token: token,
        owner_user_id: userId,
        is_active: true, // Always active - permanent links
        include_stats: includedFields.includes('stats'),
        include_countries: includedFields.includes('countries'),
        include_memories: includedFields.includes('memories'),
      };

      // Check if a share link already exists for this user (to handle unique constraint)
      const { data: existingLink } = await supabase
        .from('share_links')
        .select('token')
        .eq('owner_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      let finalToken = token;
      let { data, error } = { data: null, error: null as any };

      if (existingLink) {
        // Update existing link instead of creating new one
        ({ data, error } = await supabase
          .from('share_links')
          .update({
            token: token,
            is_active: true,
            include_stats: includedFields.includes('stats'),
            include_countries: includedFields.includes('countries'),
            include_memories: includedFields.includes('memories'),
          })
          .eq('owner_user_id', userId)
          .eq('is_active', true)
          .select()
          .single());
        
        finalToken = existingLink.token; // Use existing token to maintain same URL
      } else {
        // Insert new link
        ({ data, error } = await supabase
          .from('share_links')
          .insert(insertData)
          .select()
          .single());
      }

      if (!error && data) {
        // Success with new system
        const baseUrl = window.location.origin;
        switch (shareType) {
          case 'dashboard':
            return `${baseUrl}/share/dashboard/${finalToken}`;
          case 'memory':
            return `${baseUrl}/share/memory/${finalToken}`;
          case 'wishlist':
            return `${baseUrl}/share/wishlist/${finalToken}`;
          case 'trip':
            return `${baseUrl}/share/trip/${finalToken}`;
          case 'highlights':
            return `${baseUrl}/highlights/${finalToken}`;
          default:
            return `${baseUrl}/share/${finalToken}`;
        }
      } else if (error) {
        console.warn('share_links insert/update failed, trying legacy system:', error);
        // Fall through to legacy system
      }
    } catch (err) {
      console.warn('share_links insert/update error, trying legacy system:', err);
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
      // Check if user already has a share link first
      const { data: existingLink, error: fetchError } = await supabase
        .from('share_links')
        .select('token, is_active')
        .eq('owner_user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError && !fetchError.message.includes('does not exist')) {
        diagnostics.error = `Failed to check existing links: ${fetchError.message}`;
        diagnostics.errorDetails = fetchError;
      } else if (existingLink) {
        // User already has a share link - use it for diagnostics
        diagnostics.success = true;
        diagnostics.method = 'share_links';
        diagnostics.token = existingLink.token;
        const baseUrl = window.location.origin;
        diagnostics.url = `${baseUrl}/share/dashboard/${existingLink.token}`;
      } else {
        // No existing link - try to create a test one
        const testToken = generateToken().toLowerCase();
        const { data, error } = await supabase
          .from('share_links')
          .insert({
            token: testToken,
            owner_user_id: userId,
            is_active: true,
            include_stats: true,
            include_countries: true,
            include_memories: false,
          })
          .select()
          .single();

        if (error) {
          // If duplicate key error, try to find the existing link
          if (error.code === '23505' || error.message.includes('duplicate key')) {
            const { data: conflictLink } = await supabase
              .from('share_links')
              .select('token, is_active')
              .eq('owner_user_id', userId)
              .maybeSingle();
            
            if (conflictLink) {
              diagnostics.success = true;
              diagnostics.method = 'share_links';
              diagnostics.token = conflictLink.token;
              const baseUrl = window.location.origin;
              diagnostics.url = `${baseUrl}/share/dashboard/${conflictLink.token}`;
            } else {
              diagnostics.error = `Duplicate key constraint exists but no link found. ${error.message}`;
              diagnostics.errorDetails = error;
            }
          } else {
            diagnostics.error = error.message;
            diagnostics.errorDetails = error;
          }
        } else if (data) {
          // Successfully created test record - clean it up
          await supabase
            .from('share_links')
            .delete()
            .eq('id', data.id);

          diagnostics.success = true;
          diagnostics.method = 'share_links';
          diagnostics.token = testToken;
        }
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
  // No expiration check needed - links remain active indefinitely

  // Update last_accessed_at for analytics
  await supabase
    .from('share_links')
    .update({ last_accessed_at: new Date().toISOString() })
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
    .eq('owner_user_id', userId);

  if (error) {
    console.error('Failed to revoke share token:', error);
    throw new Error(`Failed to revoke share token: ${error.message}`);
  }
}

/**
 * Get all share links for a user
 */
export async function getUserShareLinks(userId: string): Promise<ShareLinkData[]> {
  const { data, error } = await supabase
    .from('share_links')
    .select('*')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get user share links:', error);
    return [];
  }

  return (data || []) as ShareLinkData[];
}
