import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Trash2, Edit3, CalendarDays, Users } from "lucide-react";
import { TravelDatePicker } from "@/components/TravelDatePicker";
import { CityPicker } from "./CityPicker";
import { FamilyMember, NewVisitDraft, calculateDays } from "./types";

interface NewVisitCardProps {
    draft: NewVisitDraft;
    index: number;
    countryCode: string;
    familyMembers: FamilyMember[];
    onUpdate: (id: string, updates: Partial<NewVisitDraft>) => void;
    onRemove: (id: string) => void;
}

// New visit draft card component
export const NewVisitCard = ({
    draft,
    index,
    countryCode,
    familyMembers,
    onUpdate,
    onRemove,
}: NewVisitCardProps) => {
    const months = [
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

    const handleDateChange = (startDate: string | null, endDate: string | null) => {
        let numberOfDays = draft.numberOfDays;
        if (startDate && endDate) {
            const calculated = calculateDays(startDate, endDate);
            if (calculated) numberOfDays = calculated;
        }

        onUpdate(draft.id, {
            visitDate: startDate,
            endDate: endDate,
            numberOfDays,
            isApproximate: false,
            approximateMonth: null,
            approximateYear: null,
        });
    };

    const toggleFamilyMember = (memberId: string) => {
        const newIds = draft.familyMemberIds.includes(memberId)
            ? draft.familyMemberIds.filter((id) => id !== memberId)
            : [...draft.familyMemberIds, memberId];
        onUpdate(draft.id, { familyMemberIds: newIds });
    };

    return (
        <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs">New Visit #{index + 1}</Badge>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground cursor-pointer">
                                Approximate dates
                            </Label>
                            <Switch
                                checked={draft.isApproximate}
                                onCheckedChange={(checked) => {
                                    onUpdate(draft.id, {
                                        isApproximate: checked,
                                        visitDate: checked ? null : draft.visitDate,
                                        endDate: checked ? null : draft.endDate,
                                        approximateMonth: checked ? draft.approximateMonth : null,
                                        approximateYear: checked ? draft.approximateYear : null,
                                    });
                                }}
                                className="scale-75"
                            />
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemove(draft.id)}
                        className="text-destructive hover:text-destructive h-6 w-6 p-0"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>

                {/* Trip Name */}
                <div className="mb-3">
                    <Label className="text-xs mb-1 block">Trip Name (optional)</Label>
                    <Input
                        type="text"
                        placeholder="e.g., Trip with In-laws"
                        value={draft.tripName}
                        onChange={(e) => onUpdate(draft.id, { tripName: e.target.value })}
                        className="h-8 text-sm"
                    />
                </div>

                <div className="space-y-3">
                    {draft.isApproximate ? (
                        <div>
                            <Label className="text-xs mb-1 block flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                Approximate Time
                            </Label>
                            <div className="flex gap-2">
                                <Select
                                    value={draft.approximateMonth?.toString() || ""}
                                    onValueChange={(value) =>
                                        onUpdate(draft.id, { approximateMonth: value ? parseInt(value) : null })
                                    }
                                >
                                    <SelectTrigger className="h-8 text-sm flex-1">
                                        <SelectValue placeholder="Month (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {months.map((month) => (
                                            <SelectItem key={month.value} value={month.value.toString()}>
                                                {month.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={draft.approximateYear?.toString() || ""}
                                    onValueChange={(value) =>
                                        onUpdate(draft.id, { approximateYear: value ? parseInt(value) : null })
                                    }
                                >
                                    <SelectTrigger className="h-8 text-sm w-28">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {years.map((year) => (
                                            <SelectItem key={year} value={year.toString()}>
                                                {year}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <Label className="text-xs mb-1 block">Travel Dates</Label>
                            <TravelDatePicker
                                startDate={draft.visitDate}
                                endDate={draft.endDate}
                                onSave={handleDateChange}
                            />
                        </div>
                    )}

                    {/* Days */}
                    <div>
                        <Label className="text-xs mb-1 block">Days</Label>
                        <Input
                            type="number"
                            min={1}
                            value={draft.numberOfDays ?? ""}
                            onChange={(e) => {
                                const value = e.target.value;
                                const numValue = parseInt(value);
                                onUpdate(draft.id, {
                                    numberOfDays: value === "" ? null : (isNaN(numValue) ? null : numValue),
                                });
                            }}
                            disabled={!draft.isApproximate && !!draft.visitDate && !!draft.endDate}
                            className="h-8 text-sm"
                            placeholder="Enter days"
                        />
                    </div>

                    {/* Cities */}
                    <div>
                        <Label className="text-xs mb-1 block flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Cities Visited
                        </Label>
                        <CityPicker
                            countryCode={countryCode}
                            selectedCities={draft.cities}
                            onAddCity={(city) =>
                                onUpdate(draft.id, { cities: [...draft.cities, city] })
                            }
                            onRemoveCity={(city) =>
                                onUpdate(draft.id, { cities: draft.cities.filter((c) => c !== city) })
                            }
                        />
                    </div>

                    {/* Family Members */}
                    {familyMembers.length > 0 && (
                        <div>
                            <Label className="text-xs mb-2 block flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Who went on this trip? (optional)
                            </Label>
                            <div className="flex flex-wrap gap-2">
                                {familyMembers.map((member) => (
                                    <label
                                        key={member.id}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={draft.familyMemberIds.includes(member.id)}
                                            onCheckedChange={() => toggleFamilyMember(member.id)}
                                        />
                                        <span>{member.avatar}</span>
                                        <span>{member.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Journal / Memories */}
                    <div>
                        <Label className="text-xs mb-2 block flex items-center gap-1 font-semibold text-primary">
                            <Edit3 className="w-3 h-3" />
                            Journal & Memories
                        </Label>
                        <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                            <div>
                                <Label className="text-xs mb-1 block">Highlight (e.g. "Sunset at the castle")</Label>
                                <Input
                                    value={draft.highlight}
                                    onChange={(e) => onUpdate(draft.id, { highlight: e.target.value })}
                                    className="h-8 text-sm bg-background/50"
                                    placeholder="What was the best moment?"
                                />
                            </div>

                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
