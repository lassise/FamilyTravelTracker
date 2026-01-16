import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';

export interface MapColors {
  visited: string;
  wishlist: string;
  home: string;
}

export const defaultMapColors: MapColors = {
  visited: 'hsl(142, 70%, 45%)',
  wishlist: 'hsl(200, 85%, 55%)',
  home: 'hsl(280, 70%, 50%)',
};

const colorPresets = [
  { label: 'Green', value: 'hsl(142, 70%, 45%)' },
  { label: 'Blue', value: 'hsl(200, 85%, 55%)' },
  { label: 'Purple', value: 'hsl(280, 70%, 50%)' },
  { label: 'Orange', value: 'hsl(25, 90%, 55%)' },
  { label: 'Pink', value: 'hsl(340, 75%, 55%)' },
  { label: 'Teal', value: 'hsl(175, 70%, 40%)' },
  { label: 'Yellow', value: 'hsl(45, 90%, 50%)' },
  { label: 'Red', value: 'hsl(0, 70%, 55%)' },
];

interface MapColorSettingsProps {
  colors: MapColors;
  onColorsChange: (colors: MapColors) => void;
  onReset?: () => void;
}

const MapColorSettings = ({ colors, onColorsChange, onReset }: MapColorSettingsProps) => {
  const updateColor = (key: keyof MapColors, value: string) => {
    onColorsChange({ ...colors, [key]: value });
  };

  const handleReset = () => {
    if (onReset) {
      onReset();
    } else {
      onColorsChange({ ...defaultMapColors });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          title="Customize map colors"
          aria-label="Change map colors"
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Map Colors</h4>
          
          {/* Visited Color */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Visited Countries</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={`visited-${preset.value}`}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    colors.visited === preset.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => updateColor('visited', preset.value)}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* Wishlist Color */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Wishlist Countries</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={`wishlist-${preset.value}`}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    colors.wishlist === preset.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => updateColor('wishlist', preset.value)}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          {/* Home Color */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Home Country</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={`home-${preset.value}`}
                  type="button"
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    colors.home === preset.value ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: preset.value }}
                  onClick={() => updateColor('home', preset.value)}
                  title={preset.label}
                />
              ))}
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleReset}
          >
            Reset to Defaults
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MapColorSettings;
