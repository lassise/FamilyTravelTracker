import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { getCitiesForCountry } from "@/lib/citiesData";
import { MapPin, Plus, X } from "lucide-react";

interface CityPickerProps {
    countryCode: string;
    selectedCities: string[];
    onAddCity: (city: string) => void;
    onRemoveCity: (city: string) => void;
}

// City picker component with search and custom entry
export const CityPicker = ({
    countryCode,
    selectedCities,
    onAddCity,
    onRemoveCity,
}: CityPickerProps) => {
    const [open, setOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const cities = getCitiesForCountry(countryCode);

    const filteredCities = cities.filter(
        (city) =>
            city.toLowerCase().includes(searchValue.toLowerCase()) &&
            !selectedCities.includes(city)
    );

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs h-8">
                        <Plus className="w-3 h-3 mr-1" />
                        Add cities visited...
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search or type city..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto">
                            <CommandEmpty>
                                {searchValue.trim() && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-xs"
                                        onClick={() => {
                                            onAddCity(searchValue.trim());
                                            setSearchValue("");
                                            setOpen(false);
                                        }}
                                    >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Add "{searchValue}"
                                    </Button>
                                )}
                            </CommandEmpty>
                            <CommandGroup>
                                {filteredCities.map((city) => (
                                    <CommandItem
                                        key={city}
                                        value={city}
                                        onSelect={() => {
                                            onAddCity(city);
                                            setSearchValue("");
                                            setOpen(false);
                                        }}
                                    >
                                        <MapPin className="w-3 h-3 mr-2 text-muted-foreground" />
                                        {city}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            {selectedCities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selectedCities.map((city) => (
                        <Badge key={city} variant="secondary" className="text-xs py-0.5 px-2">
                            <MapPin className="w-2.5 h-2.5 mr-1" />
                            {city}
                            <button
                                onClick={() => onRemoveCity(city)}
                                className="ml-1 hover:text-destructive"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
};
