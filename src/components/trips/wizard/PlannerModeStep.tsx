import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Users, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useTravelProfiles } from "@/hooks/useTravelProfiles";

export interface ClientInfo {
  numAdults: number;
  numKids: number;
  kidsAges: number[];
  homeAirport: string;
  budgetRange: 'budget' | 'moderate' | 'luxury';
  profileId: string | null;
}

interface PlannerModeStepProps {
  mode: 'personal' | 'planner';
  clientInfo: ClientInfo;
  onModeChange: (mode: 'personal' | 'planner') => void;
  onClientInfoChange: (info: ClientInfo) => void;
}

export function PlannerModeStep({ 
  mode, 
  clientInfo, 
  onModeChange, 
  onClientInfoChange 
}: PlannerModeStepProps) {
  const { profiles, activeProfile } = useTravelProfiles();
  const [newAge, setNewAge] = useState("");

  const addKidAge = () => {
    const age = parseInt(newAge);
    if (!isNaN(age) && age >= 0 && age <= 18) {
      onClientInfoChange({
        ...clientInfo,
        numKids: clientInfo.numKids + 1,
        kidsAges: [...clientInfo.kidsAges, age],
      });
      setNewAge("");
    }
  };

  const removeKidAge = (index: number) => {
    const newAges = clientInfo.kidsAges.filter((_, i) => i !== index);
    onClientInfoChange({
      ...clientInfo,
      numKids: Math.max(0, clientInfo.numKids - 1),
      kidsAges: newAges,
    });
  };

  return (
    <div className="space-y-6">
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as 'personal' | 'planner')}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Card className={`cursor-pointer transition-all ${mode === 'personal' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
          <CardHeader className="pb-2">
            <Label htmlFor="personal" className="cursor-pointer">
              <RadioGroupItem value="personal" id="personal" className="sr-only" />
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle className="text-lg">Personal Planning</CardTitle>
              </div>
            </Label>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Plan trips for yourself and your family using your saved preferences and travel history.
            </CardDescription>
            {mode === 'personal' && activeProfile && (
              <Badge variant="secondary" className="mt-2">
                Using: {activeProfile.name}
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card className={`cursor-pointer transition-all ${mode === 'planner' ? 'border-primary ring-2 ring-primary/20' : ''}`}>
          <CardHeader className="pb-2">
            <Label htmlFor="planner" className="cursor-pointer">
              <RadioGroupItem value="planner" id="planner" className="sr-only" />
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <CardTitle className="text-lg">Travel Planner Mode</CardTitle>
              </div>
            </Label>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Plan trips for clients. Enter their details to create a customized itinerary.
            </CardDescription>
          </CardContent>
        </Card>
      </RadioGroup>

      {mode === 'planner' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Information</CardTitle>
            <CardDescription>Enter details about the family you're planning for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numAdults">Number of Adults</Label>
                <Select
                  value={clientInfo.numAdults.toString()}
                  onValueChange={(v) => onClientInfoChange({ ...clientInfo, numAdults: parseInt(v) })}
                >
                  <SelectTrigger id="numAdults">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Kids Ages</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={18}
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="Age"
                    className="w-20"
                    onKeyDown={(e) => e.key === 'Enter' && addKidAge()}
                  />
                  <Button type="button" size="icon" variant="outline" onClick={addKidAge}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {clientInfo.kidsAges.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {clientInfo.kidsAges.map((age, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {age} yrs
                        <button type="button" onClick={() => removeKidAge(idx)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="homeAirport">Home Airport (Optional)</Label>
              <Input
                id="homeAirport"
                value={clientInfo.homeAirport}
                onChange={(e) => onClientInfoChange({ ...clientInfo, homeAirport: e.target.value })}
                placeholder="e.g., LAX, JFK, ORD"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetRange">Budget Range</Label>
              <Select
                value={clientInfo.budgetRange}
                onValueChange={(v) => onClientInfoChange({ ...clientInfo, budgetRange: v as 'budget' | 'moderate' | 'luxury' })}
              >
                <SelectTrigger id="budgetRange">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Budget - Cost-conscious</SelectItem>
                  <SelectItem value="moderate">Moderate - Good value</SelectItem>
                  <SelectItem value="luxury">Luxury - Premium experiences</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile">Apply Profile (Optional)</Label>
              <Select
                value={clientInfo.profileId || "none"}
                onValueChange={(v) => onClientInfoChange({ ...clientInfo, profileId: v === "none" ? null : v })}
              >
                <SelectTrigger id="profile">
                  <SelectValue placeholder="Select a profile..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No profile - Use custom settings</SelectItem>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
