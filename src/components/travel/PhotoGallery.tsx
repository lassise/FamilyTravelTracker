import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Country } from '@/hooks/useFamilyData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, Plus, X, Image as ImageIcon, Upload } from 'lucide-react';
import { getEffectiveFlagCode } from '@/lib/countriesData';
import CountryFlag from '@/components/common/CountryFlag';
import { Switch } from '@/components/ui/switch';

interface PhotoGalleryProps {
  countries: Country[];
}

interface TravelPhoto {
  id: string;
  country_id: string;
  photo_url: string;
  caption: string | null;
  taken_at: string | null;
  is_shareable?: boolean;
}

const PhotoGallery = ({ countries }: PhotoGalleryProps) => {
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [caption, setCaption] = useState('');
  const [takenAt, setTakenAt] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<TravelPhoto | null>(null);
  const { toast } = useToast();

  const visitedCountries = countries.filter(c => c.visitedBy.length > 0);

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from('travel_photos')
      .select('*')
      .order('taken_at', { ascending: false });
    if (data) setPhotos(data as TravelPhoto[]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCountry) {
      toast({ title: 'Please select a country first', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('travel-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('travel-photos')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from('travel_photos')
        .insert({
          user_id: user.id,
          country_id: selectedCountry,
          photo_url: publicUrl,
          caption: caption || null,
          taken_at: takenAt || null,
        });

      if (insertError) throw insertError;

      toast({ title: 'Photo uploaded successfully!' });
      setIsDialogOpen(false);
      setSelectedCountry('');
      setCaption('');
      setTakenAt('');
      fetchPhotos();
    } catch (error: any) {
      toast({ title: 'Error uploading photo', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    const { error } = await supabase.from('travel_photos').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Photo deleted' });
      setSelectedPhoto(null);
      fetchPhotos();
    }
  };

  const handleToggleShareable = async (photo: TravelPhoto, next: boolean) => {
    const { error } = await supabase
      .from('travel_photos')
      .update({ is_shareable: next })
      .eq('id', photo.id);

    if (error) {
      toast({ title: 'Failed to update sharing', variant: 'destructive' });
      return;
    }

    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, is_shareable: next } : p)));
    setSelectedPhoto((prev) => (prev && prev.id === photo.id ? { ...prev, is_shareable: next } : prev));
  };

  const getCountryName = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    // Avoid relying on stored emoji flags; just return the country name
    return country ? country.name : 'Unknown';
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Camera className="h-5 w-5 text-primary" />
          Travel Photos
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              Add Photo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Travel Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent>
                    {visitedCountries.map((country) => {
                      const { code, isSubdivision } = getEffectiveFlagCode(country.name, country.flag);
                      return (
                        <SelectItem key={country.id} value={country.id}>
                          <span className="inline-flex items-center gap-2">
                            {isSubdivision || code ? (
                              <CountryFlag countryCode={code} countryName={country.name} size="sm" />
                            ) : null}
                            <span>{country.name}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Caption (optional)</Label>
                <Input 
                  placeholder="Describe this memory..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
              <div>
                <Label>Date Taken (optional)</Label>
                <Input 
                  type="date"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                />
              </div>
              <div>
                <Label>Photo</Label>
                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {isUploading ? 'Uploading...' : 'Click to upload'}
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={isUploading || !selectedCountry}
                    />
                  </label>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {photos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No photos yet. Start capturing your travel memories!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div 
                key={photo.id}
                className="relative group aspect-square rounded-lg overflow-hidden cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img 
                  src={photo.photo_url} 
                  alt={photo.caption || 'Travel photo'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-white text-sm font-medium truncate">
                      {getCountryName(photo.country_id)}
                    </p>
                    {photo.caption && (
                      <p className="text-white/80 text-xs truncate">{photo.caption}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Photo Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl">
            {selectedPhoto && (
              <>
                <div className="relative">
                  <img 
                    src={selectedPhoto.photo_url} 
                    alt={selectedPhoto.caption || 'Travel photo'}
                    className="w-full rounded-lg"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {getCountryName(selectedPhoto.country_id)}
                    </p>
                    {selectedPhoto.caption && (
                      <p className="text-muted-foreground text-sm">{selectedPhoto.caption}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Share</span>
                      <Switch
                        checked={!!selectedPhoto.is_shareable}
                        onCheckedChange={(v) => handleToggleShareable(selectedPhoto, v)}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePhoto(selectedPhoto.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PhotoGallery;
