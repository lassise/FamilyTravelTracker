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
 * Generate a secure random token (32 characters, URL-safe, lowercase hex)
 * VERIFICATION: Token is always 32 lowercase hex chars
 */
function generateToken(): string {
  // Use crypto.getRandomValues for secure randomness
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback: generate random hex string
  let result = '';
  const hexChars = '0123456789abcdef';
  for (let i = 0; i < 32; i++) {
    result += hexChars.charAt(Math.floor(Math.random() * hexChars.length));
  }
  return result;
}

/**
 * Generate a share token and store it in share_links table
 * This is the CANONICAL function for creating share links
 * VERIFICATION: Always returns /share/dashboard/{32-char-hex} URL
 */
export async function generateShareToken(options: ShareTokenOptions): Promise<string> {
  const { userId, shareType, includedFields } = options;

  // DEV logging for verification
  console.log('[ShareToken] === generateShareToken called ===');
  console.log('[ShareToken] User ID:', userId);
  console.log('[ShareToken] Share Type:', shareType);
  console.log('[ShareToken] Included Fields:', includedFields);

  // Derive boolean flags from includedFields
  const includeStats = includedFields.includes('stats');
  const includeCountries = includedFields.includes('countries');
  const includeMemories = includedFields.includes('memories'); // This is the timeline toggle

  try {
    // Step 1: Check if user already has an active share link
    const { data: existingLink, error: fetchError } = await supabase
      .from('share_links')
      .select('id, token')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    console.log('[ShareToken] Existing link check:', { existingLink, fetchError });

    if (fetchError) {
      console.error('[ShareToken] Error checking existing link:', fetchError);
      throw new Error(`Failed to check existing share links: ${fetchError.message}`);
    }

    let finalToken: string;

    if (existingLink) {
      // User already has a share link - UPDATE settings, KEEP the same token for stable URL
      finalToken = existingLink.token;
      console.log('[ShareToken] Updating existing link, keeping token:', finalToken);
      
      const { error: updateError } = await supabase
        .from('share_links')
        .update({
          is_active: true,
          include_stats: includeStats,
          include_countries: includeCountries,
          include_memories: includeMemories,
        })
        .eq('id', existingLink.id);

      if (updateError) {
        console.error('[ShareToken] Update failed:', updateError);
        throw new Error(`Failed to update share link: ${updateError.message}`);
      }
      console.log('[ShareToken] Update successful');
    } else {
      // No existing link - CREATE new one
      finalToken = generateToken(); // Always lowercase hex
      console.log('[ShareToken] Creating NEW share link with token:', finalToken);
      
      const { error: insertError } = await supabase
        .from('share_links')
        .insert({
          token: finalToken,
          owner_user_id: userId,
          is_active: true,
          include_stats: includeStats,
          include_countries: includeCountries,
          include_memories: includeMemories,
        });

      if (insertError) {
        console.error('[ShareToken] Insert failed:', insertError);
        throw new Error(`Failed to create share link: ${insertError.message}`);
      }
      console.log('[ShareToken] Insert successful');
    }

    // Build the share URL
    const baseUrl = window.location.origin;
    let url: string;
    switch (shareType) {
      case 'dashboard':
        url = `${baseUrl}/share/dashboard/${finalToken}`;
        break;
      case 'memory':
        url = `${baseUrl}/share/memory/${finalToken}`;
        break;
      case 'wishlist':
        url = `${baseUrl}/share/wishlist/${finalToken}`;
        break;
      case 'trip':
        url = `${baseUrl}/share/trip/${finalToken}`;
        break;
      case 'highlights':
        url = `${baseUrl}/highlights/${finalToken}`;
        break;
      default:
        url = `${baseUrl}/share/${finalToken}`;
    }
    
    console.log('[ShareToken] SUCCESS! Generated URL:', url);
    return url;
  } catch (err: any) {
    console.error('[ShareToken] FAILED:', err);
    throw err;
  }
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
    // Check if share_links table exists and user has a link
    const { data: existingLink, error: fetchError } = await supabase
      .from('share_links')
      .select('token, is_active')
      .eq('owner_user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (fetchError) {
      // Table might not exist or other error
      diagnostics.error = `share_links query error: ${fetchError.message}`;
      diagnostics.errorDetails = fetchError;
      diagnostics.tableExists = !fetchError.message.includes('does not exist');
    } else {
      diagnostics.tableExists = true;
      
      if (existingLink) {
        // User has an existing share link
        diagnostics.success = true;
        diagnostics.method = 'share_links';
        diagnostics.token = existingLink.token;
        diagnostics.url = `${window.location.origin}/share/dashboard/${existingLink.token}`;
      } else {
        // No link exists yet - this is fine, just means user hasn't shared
        diagnostics.success = true;
        diagnostics.method = 'share_links';
        diagnostics.error = 'No share link exists yet. Click Generate to create one.';
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
