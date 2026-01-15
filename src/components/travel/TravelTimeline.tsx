import React, { useState, useMemo, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisitDetails } from '@/hooks/useVisitDetails';
import { Country } from '@/hooks/useFamilyData';
import { Calendar, MapPin, Clock, ChevronDown, Heart, Sparkles, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface TravelTimelineProps {
  countries: Country[];
}

interface TravelPhoto {
  id: string;
  country_id: string;
  photo_url: string;
  caption: string | null;
  taken_at: string | null;
}

const TravelTimeline = memo(({ countries }: TravelTimelineProps) => {
  const { visitDetails } = useVisitDetails();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [photos, setPhotos] = useState<TravelPhoto[]>([]);

  // Fetch photos for timeline integration
  useEffect(() => {
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from('travel_photos')
        .select('id, country_id, photo_url, caption, taken_at')
        .order('taken_at', { ascending: false });
      if (data) setPhotos(data as TravelPhoto[]);
    };
    fetchPhotos();
  }, []);

  // Get unique years from visits
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    visitDetails.forEach(v => {
      if (v.visit_date) {
        yearSet.add(new Date(v.visit_date).getFullYear());
      } else if (v.approximate_year) {
        yearSet.add(v.approximate_year);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [visitDetails]);

  // Filter and sort visits
  const filteredVisits = useMemo(() => {
    let visits = [...visitDetails]
      .filter(v => v.visit_date || v.approximate_year);

    // Year filter
    if (selectedYear !== 'all') {
      const year = parseInt(selectedYear);
      visits = visits.filter(v => {
        if (v.visit_date) {
          return new Date(v.visit_date).getFullYear() === year;
        }
        return v.approximate_year === year;
      });
    }

    // Sort by date (newest first)
    visits.sort((a, b) => {
      const dateA = a.visit_date ? new Date(a.visit_date) : new Date(a.approximate_year || 2000, (a.approximate_month || 1) - 1);
      const dateB = b.visit_date ? new Date(b.visit_date) : new Date(b.approximate_year || 2000, (b.approximate_month || 1) - 1);
      return dateB.getTime() - dateA.getTime();
    });

    return visits;
  }, [visitDetails, selectedYear]);

  // Limit display unless "show all" is clicked
  const displayedVisits = showAllVisits ? filteredVisits : filteredVisits.slice(0, 10);
  const hasMore = filteredVisits.length > 10;

  // Convert ISO country code to emoji flag
  const codeToEmoji = (code: string): string => {
    if (!code || code.length !== 2) return '🏳️';
    const upperCode = code.toUpperCase();
    // Check if it's already an emoji (starts with a high Unicode point)
    if (code.charCodeAt(0) > 255) return code;
    // Convert 2-letter code to regional indicator symbols
    return String.fromCodePoint(
      ...upperCode.split('').map(char => 127397 + char.charCodeAt(0))
    );
  };

  const getCountryData = (countryId: string) => {
    const country = countries.find(c => c.id === countryId);
    if (!country) return { flag: '🏳️', name: 'Unknown' };
    
    // Check if flag is a code (2 letters) or already an emoji
    const flag = country.flag && /^[A-Za-z]{2}(-[A-Za-z]{3})?$/.test(country.flag.trim())
      ? codeToEmoji(country.flag.trim().substring(0, 2))
      : (country.flag || '🏳️');
    
    return { flag, name: country.name };
  };

  // Get photos for a specific country
  const getCountryPhotos = (countryId: string) => {
    return photos.filter(p => p.country_id === countryId).slice(0, 3);
  };

  const formatVisitDate = (visit: typeof visitDetails[0]) => {
    if (visit.visit_date) {
      const startDate = format(new Date(visit.visit_date), 'MMM dd, yyyy');
      if (visit.end_date) {
        const endDate = format(new Date(visit.end_date), 'MMM dd, yyyy');
        return `${startDate} – ${endDate}`;
      }
      return startDate;
    }
    if (visit.approximate_year) {
      const month = visit.approximate_month ? format(new Date(2000, visit.approximate_month - 1), 'MMM') : '';
      return `${month} ${visit.approximate_year}`.trim();
    }
    return 'Date unknown';
  };

  // Access extended fields from visitDetails (now includes highlight, why_it_mattered)
  const getVisitMemory = (visit: typeof visitDetails[0]) => {
    const extended = visit as typeof visit & { highlight?: string; why_it_mattered?: string };
    return {
      highlight: extended.highlight,
      whyItMattered: extended.why_it_mattered
    };
  };

  if (filteredVisits.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Travel Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Add visit dates to your countries to see your travel timeline!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5 text-primary" />
            Travel Timeline
          </CardTitle>
          
          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Filter year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {filteredVisits.length} {filteredVisits.length === 1 ? 'visit' : 'visits'}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-secondary to-accent" />
          
          <div className="space-y-6">
            {displayedVisits.map((visit, index) => {
              const { flag, name } = getCountryData(visit.country_id);
              const countryPhotos = getCountryPhotos(visit.country_id);
              const memory = getVisitMemory(visit);
              
              return (
                <div key={visit.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div 
                    className="absolute left-2 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center"
                    style={{
                      background: index === 0 ? 'hsl(var(--primary))' : 
                                 index < 3 ? 'hsl(var(--secondary))' : 'hsl(var(--accent))'
                    }}
                  >
                    <MapPin className="h-3 w-3 text-primary-foreground" />
                  </div>
                  
                  <div className="bg-muted/50 rounded-lg p-4 hover:bg-muted transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">
                          {flag} {name}
                        </h4>
                        <span className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3" />
                          {formatVisitDate(visit)}
                        </span>
                      </div>
                      
                      {/* Photos preview */}
                      {countryPhotos.length > 0 && (
                        <div className="flex -space-x-2">
                          {countryPhotos.map((photo, i) => (
                            <div 
                              key={photo.id} 
                              className="w-10 h-10 rounded-lg overflow-hidden border-2 border-background shadow-sm"
                              style={{ zIndex: 3 - i }}
                            >
                              <img 
                                src={photo.photo_url} 
                                alt="" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {photos.filter(p => p.country_id === visit.country_id).length > 3 && (
                            <div className="w-10 h-10 rounded-lg bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                              +{photos.filter(p => p.country_id === visit.country_id).length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {visit.trip_name && (
                      <p className="text-sm text-primary mt-2 font-medium">{visit.trip_name}</p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      {visit.number_of_days && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {visit.number_of_days} days
                        </span>
                      )}
                      {countryPhotos.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {photos.filter(p => p.country_id === visit.country_id).length} photos
                        </span>
                      )}
                    </div>
                    
                    {/* Memory highlight */}
                    {memory.highlight && (
                      <div className="mt-3 p-3 bg-primary/5 rounded-md border border-primary/10">
                        <div className="flex items-center gap-1 text-xs text-primary font-medium mb-1">
                          <Sparkles className="h-3 w-3" />
                          Highlight
                        </div>
                        <p className="text-sm text-foreground">
                          {memory.highlight}
                        </p>
                      </div>
                    )}
                    
                    {/* Why it mattered */}
                    {memory.whyItMattered && (
                      <div className="mt-2 p-3 bg-secondary/5 rounded-md border border-secondary/10">
                        <div className="flex items-center gap-1 text-xs text-secondary-foreground font-medium mb-1">
                          <Heart className="h-3 w-3" />
                          Why it mattered
                        </div>
                        <p className="text-sm text-muted-foreground italic">
                          "{memory.whyItMattered}"
                        </p>
                      </div>
                    )}
                    
                    {/* Notes */}
                    {visit.notes && !memory.highlight && !memory.whyItMattered && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        "{visit.notes}"
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show more button */}
          {hasMore && !showAllVisits && (
            <div className="flex justify-center mt-6">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowAllVisits(true)}
                className="gap-2"
              >
                <ChevronDown className="h-4 w-4" />
                Show {filteredVisits.length - 10} more visits
              </Button>
            </div>
          )}
          
          {showAllVisits && hasMore && (
            <div className="flex justify-center mt-6">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowAllVisits(false)}
              >
                Show less
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

TravelTimeline.displayName = 'TravelTimeline';

export default TravelTimeline;
