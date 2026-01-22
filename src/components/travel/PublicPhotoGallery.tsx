import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Country } from '@/hooks/useFamilyData';
import { Image as ImageIcon } from 'lucide-react';

interface PublicPhotoGalleryProps {
  countries: Country[];
  photos: Array<{
    id: string;
    country_id: string;
    photo_url: string;
    caption: string | null;
    taken_at: string | null;
  }>;
}

const PublicPhotoGallery = ({ countries, photos }: PublicPhotoGalleryProps) => {
  const getCountryName = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    return country?.name || 'Unknown';
  };

  if (photos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No photos to display yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Photo Gallery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div 
              key={photo.id}
              className="relative group aspect-square rounded-lg overflow-hidden"
            >
              <img 
                src={photo.photo_url} 
                alt={photo.caption || getCountryName(photo.country_id)}
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
      </CardContent>
    </Card>
  );
};

export default PublicPhotoGallery;
