import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Heart, X, Loader2, Check, Map, FileText, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { countriesWithStates, countryNameToCode } from '@/lib/statesData';
interface CountryInfo {
  iso3: string;
  name: string;
  flag: string;
  continent: string;
}
interface CountryQuickActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countryInfo: CountryInfo | null;
  isVisited: boolean;
  isWishlisted: boolean;
  isHomeCountry?: boolean;
  onActionComplete: () => void;
  onOpenStateTracking?: (countryId: string, countryName: string) => void;
  onOpenVisitDetails?: (countryId: string, countryName: string, countryCode: string) => void;
}
const CountryQuickActionDialog = ({
  open,
  onOpenChange,
  countryInfo,
  isVisited,
  isWishlisted,
  isHomeCountry = false,
  onActionComplete,
  onOpenStateTracking,
  onOpenVisitDetails
}: CountryQuickActionDialogProps) => {
  const [loading, setLoading] = useState<'visited-quick' | 'visited-details' | 'wishlist' | 'remove-visited' | 'remove-wishlist' | null>(null);
  if (!countryInfo) return null;
  const hasStateTracking = countryNameToCode[countryInfo.name] && countriesWithStates.includes(countryNameToCode[countryInfo.name]);

  // Get ISO2 country code from name
  const getCountryCode = (): string => {
    return countryNameToCode[countryInfo.name] || countryInfo.iso3?.slice(0, 2) || '';
  };

  // Helper to ensure country exists and get its ID
  const ensureCountryExists = async (userId: string): Promise<string> => {
    const {
      data: existingCountry
    } = await supabase.from('countries').select('id').eq('name', countryInfo.name).eq('user_id', userId).maybeSingle();
    if (existingCountry) {
      return existingCountry.id;
    }

    // Store the ISO2 code in the flag field for reliable flag rendering
    const iso2Code = getCountryCode().toUpperCase();
    const {
      data: newCountry,
      error: insertError
    } = await supabase.from('countries').insert({
      name: countryInfo.name,
      flag: iso2Code || countryInfo.flag,
      // Store ISO2 code, fallback to whatever was provided
      continent: countryInfo.continent,
      user_id: userId
    }).select('id').single();
    if (insertError) throw insertError;
    return newCountry.id;
  };
  const handleAddVisitedQuick = async () => {
    setLoading('visited-quick');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Require at least one family member — the app tracks which family members have been where
      const {
        data: members
      } = await supabase.from('family_members').select('id').eq('user_id', user.id).limit(1);
      if (!members || members.length === 0) {
        toast.error('Add at least one family member first to track who has been where.');
        setLoading(null);
        return;
      }

      const countryId = await ensureCountryExists(user.id);

      if (members && members.length > 0) {
        // Check if visit already exists
        const {
          data: existingVisit
        } = await supabase.from('country_visits').select('id').eq('country_id', countryId).eq('family_member_id', members[0].id).maybeSingle();
        if (!existingVisit) {
          await supabase.from('country_visits').insert({
            country_id: countryId,
            family_member_id: members[0].id,
            user_id: user.id
          });
        }
      }

      // Remove from wishlist if it was there
      if (isWishlisted) {
        await supabase.from('country_wishlist').delete().eq('country_id', countryId);
      }
      toast.success(`${countryInfo.flag} ${countryInfo.name} marked as visited!`);
      onActionComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding visited country:', error);
      toast.error('Failed to add country');
    } finally {
      setLoading(null);
    }
  };
  const handleAddVisitedWithDetails = async () => {
    setLoading('visited-details');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      // Require at least one family member — the app tracks which family members have been where
      const {
        data: members
      } = await supabase.from('family_members').select('id').eq('user_id', user.id).limit(1);
      if (!members || members.length === 0) {
        toast.error('Add at least one family member first to track who has been where.');
        setLoading(null);
        return;
      }

      const countryId = await ensureCountryExists(user.id);

      if (members && members.length > 0) {
        const {
          data: existingVisit
        } = await supabase.from('country_visits').select('id').eq('country_id', countryId).eq('family_member_id', members[0].id).maybeSingle();
        if (!existingVisit) {
          await supabase.from('country_visits').insert({
            country_id: countryId,
            family_member_id: members[0].id,
            user_id: user.id
          });
        }
      }

      // Remove from wishlist if it was there
      if (isWishlisted) {
        await supabase.from('country_wishlist').delete().eq('country_id', countryId);
      }
      onActionComplete();
      onOpenChange(false);

      // Open the visit details dialog
      if (onOpenVisitDetails) {
        onOpenVisitDetails(countryId, countryInfo.name, getCountryCode());
      }
      toast.success(`${countryInfo.flag} ${countryInfo.name} added! Opening details...`);
    } catch (error) {
      console.error('Error adding visited country:', error);
      toast.error('Failed to add country');
    } finally {
      setLoading(null);
    }
  };
  const handleAddWishlist = async () => {
    setLoading('wishlist');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const countryId = await ensureCountryExists(user.id);

      // Check if already in wishlist
      const {
        data: existingWishlist
      } = await supabase.from('country_wishlist').select('id').eq('country_id', countryId).maybeSingle();
      if (!existingWishlist) {
        await supabase.from('country_wishlist').insert({
          country_id: countryId,
          user_id: user.id
        });
      }
      toast.success(`${countryInfo.flag} ${countryInfo.name} added to wishlist!`);
      onActionComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      toast.error('Failed to add to wishlist');
    } finally {
      setLoading(null);
    }
  };
  const handleRemoveVisited = async () => {
    setLoading('remove-visited');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: existingCountry
      } = await supabase.from('countries').select('id').eq('name', countryInfo.name).eq('user_id', user.id).maybeSingle();
      if (existingCountry) {
        await supabase.from('country_visits').delete().eq('country_id', existingCountry.id);
        toast.success(`${countryInfo.flag} ${countryInfo.name} removed from visited`);
      }
      onActionComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing visited:', error);
      toast.error('Failed to remove');
    } finally {
      setLoading(null);
    }
  };
  const handleRemoveWishlist = async () => {
    setLoading('remove-wishlist');
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;
      const {
        data: existingCountry
      } = await supabase.from('countries').select('id').eq('name', countryInfo.name).eq('user_id', user.id).maybeSingle();
      if (existingCountry) {
        await supabase.from('country_wishlist').delete().eq('country_id', existingCountry.id);
        toast.success(`${countryInfo.flag} ${countryInfo.name} removed from wishlist`);
      }
      onActionComplete();
      onOpenChange(false);
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Failed to remove');
    } finally {
      setLoading(null);
    }
  };
  const handleOpenStateTracking = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) return;

      // For home country, ensure the country record exists even if not "visited"
      let countryId: string | null = null;
      const {
        data: existingCountry
      } = await supabase.from('countries').select('id').eq('name', countryInfo.name).eq('user_id', user.id).maybeSingle();
      if (existingCountry) {
        countryId = existingCountry.id;
      } else if (isHomeCountry && hasStateTracking) {
        // Create country record for home country state tracking
        const iso2Code = getCountryCode().toUpperCase();
        const {
          data: newCountry,
          error
        } = await supabase.from('countries').insert({
          name: countryInfo.name,
          flag: iso2Code || countryInfo.flag,
          continent: countryInfo.continent,
          user_id: user.id
        }).select('id').single();
        if (!error && newCountry) {
          countryId = newCountry.id;
        }
      }
      if (countryId && onOpenStateTracking) {
        onOpenStateTracking(countryId, countryInfo.name);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error opening state tracking:', error);
    }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="text-3xl">{countryInfo.flag}</span>
            {countryInfo.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Status badges */}
          <div className="flex gap-2 flex-wrap">
            {isHomeCountry && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-sm">
                <Home className="h-3 w-3" /> Home Country
              </span>}
            {isVisited && !isHomeCountry && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/20 text-accent text-sm">
                <Check className="h-3 w-3" /> Visited
              </span>}
            {isWishlisted && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/20 text-secondary text-sm">
                <Heart className="h-3 w-3" /> On Wishlist
              </span>}
          </div>

          {/* Action buttons */}
          <div className="grid gap-2">
            {/* Home country special handling - show state tracking prominently */}
            {isHomeCountry && hasStateTracking && onOpenStateTracking && <Button onClick={handleOpenStateTracking} disabled={loading !== null} className="w-full justify-start gap-2" variant="default">
                <Map className="h-4 w-4" />
                Track States/Regions
              </Button>}

            {/* For non-home countries that haven't been visited */}
            {!isVisited && !isHomeCountry ? <>
                {/* Visited Quick */}
                <Button onClick={handleAddVisitedQuick} disabled={loading !== null} className="w-full justify-start gap-2" variant="default">
                  {loading === 'visited-quick' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  Add to Visited (Quick)
                </Button>

                {/* Visited with Details */}
                <Button onClick={handleAddVisitedWithDetails} disabled={loading !== null} className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white border-0" variant="outline">
                  {loading === 'visited-details' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Add to Visited (Add Details)
                </Button>

                {/* Wishlist - only show if not visited and not already wishlisted */}
                {!isWishlisted && <Button onClick={handleAddWishlist} disabled={loading !== null} className="w-full justify-start gap-2" variant="secondary">
                    {loading === 'wishlist' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
                    Add to Wish List
                  </Button>}
              </> : isVisited && !isHomeCountry ? <>
                {/* State tracking - show first for visited countries with state tracking */}
                {hasStateTracking && onOpenStateTracking && <Button onClick={handleOpenStateTracking} disabled={loading !== null} className="w-full justify-start gap-2" variant="default">
                    <Map className="h-4 w-4" />
                    Track States/Regions
                  </Button>}

                {/* Remove from Visited - at the bottom with red styling */}
                <Button onClick={handleRemoveVisited} disabled={loading !== null} className="w-full justify-start gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90" variant="destructive">
                  {loading === 'remove-visited' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  Remove from Visited
                </Button>
              </> : null}

            {/* Remove from wishlist */}
            {isWishlisted && <Button onClick={handleRemoveWishlist} disabled={loading !== null} className="w-full justify-start gap-2 bg-destructive text-destructive-foreground hover:bg-destructive/90" variant="destructive">
                {loading === 'remove-wishlist' ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                Remove from Wishlist
              </Button>}
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>;
};
export default CountryQuickActionDialog;