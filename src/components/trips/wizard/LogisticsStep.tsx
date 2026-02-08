import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TripFormData } from "../TripWizard";
import { Plane, Car, Home, User, Ruler, Sofa } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LogisticsStepProps {
    formData: TripFormData;
    updateFormData: (updates: Partial<TripFormData>) => void;
}

const CAR_SEAT_OPTIONS = [
    { value: "none", label: "No car seats needed" },
    { value: "infant", label: "Infant seat (rear-facing)" },
    { value: "convertible", label: "Convertible/Toddler seat" },
    { value: "booster", label: "Booster seat" },
    { value: "multiple", label: "Multiple types needed" },
];

const FLIGHT_TIME_OPTIONS = [
    { value: "any", label: "Any time (Cheapest/Fastest)" },
    { value: "morning", label: "Morning" },
    { value: "afternoon", label: "Afternoon" },
    { value: "red_eye", label: "Overnight / Red-eye" },
];

const ACCOMMODATION_NEEDS = [
    { id: "bathtub", label: "Bathtub" },
    { id: "kitchen", label: "Kitchen / Kitchenette" },
    { id: "laundry", label: "Laundry facilities" },
    { id: "pool", label: "Pool" },
    { id: "separate_bedrooms", label: "Separate sleeping areas" },
    { id: "crib", label: "Crib / Pack 'n Play" },
];

export const LogisticsStep = ({ formData, updateFormData }: LogisticsStepProps) => {
    const [newHeight, setNewHeight] = useState("");

    const toggleAccommodationNeed = (needId: string) => {
        const current = formData.accommodationNeeds || [];
        if (current.includes(needId)) {
            updateFormData({ accommodationNeeds: current.filter(id => id !== needId) });
        } else {
            updateFormData({ accommodationNeeds: [...current, needId] });
        }
    };

    const addHeight = () => {
        const height = parseInt(newHeight);
        if (!isNaN(height) && height > 0) {
            updateFormData({ kidHeightsInches: [...(formData.kidHeightsInches || []), height] });
            setNewHeight("");
        }
    };

    const removeHeight = (index: number) => {
        updateFormData({
            kidHeightsInches: (formData.kidHeightsInches || []).filter((_, i) => i !== index),
        });
    };

    return (
        <div className="space-y-8">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold">Logistics & Equipment</h3>
                <p className="text-sm text-muted-foreground">help us plan the practical details</p>
            </div>

            {/* Car Seats - Only if traveling with kids */}
            {formData.travelingWithKids && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 font-medium">
                        <Car className="h-4 w-4 text-blue-500" />
                        <span>Car Seat Requirements</span>
                    </div>
                    <RadioGroup
                        value={formData.carSeatNeeds}
                        onValueChange={(val) => updateFormData({ carSeatNeeds: val as any })}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                        {CAR_SEAT_OPTIONS.map((option) => (
                            <div key={option.value} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent cursor-pointer">
                                <RadioGroupItem value={option.value} id={`seat-${option.value}`} />
                                <Label htmlFor={`seat-${option.value}`} className="cursor-pointer flex-1">
                                    {option.label}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
            )}

            {/* Flight Preferences */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium">
                    <Plane className="h-4 w-4 text-sky-500" />
                    <span>Flight Time Preference</span>
                </div>
                <RadioGroup
                    value={formData.flightTimePreference}
                    onValueChange={(val) => updateFormData({ flightTimePreference: val as any })}
                    className="grid grid-cols-2 gap-3"
                >
                    {FLIGHT_TIME_OPTIONS.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent cursor-pointer">
                            <RadioGroupItem value={option.value} id={`flight-${option.value}`} />
                            <Label htmlFor={`flight-${option.value}`} className="cursor-pointer flex-1">
                                {option.label}
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>

            {/* Accommodation Needs */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 font-medium">
                    <Home className="h-4 w-4 text-indigo-500" />
                    <span>Accommodation Must-Haves</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {ACCOMMODATION_NEEDS.map((need) => (
                        <div key={need.id} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent">
                            <Checkbox
                                id={`need-${need.id}`}
                                checked={formData.accommodationNeeds?.includes(need.id)}
                                onCheckedChange={() => toggleAccommodationNeed(need.id)}
                            />
                            <Label htmlFor={`need-${need.id}`} className="cursor-pointer flex-1 font-normal">
                                {need.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Single Parent & Kid Heights */}
            {formData.travelingWithKids && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                    {/* Single Parent Toggle */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 font-medium">
                            <User className="h-4 w-4 text-pink-500" />
                            <span>Solo Parent Trip?</span>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-md p-3 bg-muted/20">
                            <Checkbox
                                id="single-parent"
                                checked={formData.isSingleParent}
                                onCheckedChange={(checked) => updateFormData({ isSingleParent: checked as boolean })}
                            />
                            <Label htmlFor="single-parent" className="cursor-pointer font-normal">
                                Yes, I'm traveling solo with kids
                                <span className="block text-xs text-muted-foreground mt-1">
                                    We'll suggestmanageable logistics and safe areas
                                </span>
                            </Label>
                        </div>
                    </div>

                    {/* Kid Heights - Only if theme parks selected */}
                    {formData.interests.includes('theme-parks') && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 font-medium">
                                <Ruler className="h-4 w-4 text-yellow-500" />
                                <span>Kid Heights (Inches)</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Helpful for theme park rides</p>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder='e.g. 42"'
                                    value={newHeight}
                                    onChange={(e) => setNewHeight(e.target.value)}
                                    className="w-24"
                                    onKeyDown={(e) => e.key === "Enter" && addHeight()}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addHeight}>Add</Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {formData.kidHeightsInches?.map((height, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1">
                                        {height}"
                                        <span className="cursor-pointer hover:text-destructive ml-1" onClick={() => removeHeight(i)}>×</span>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
