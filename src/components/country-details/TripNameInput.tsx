import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface TripNameInputProps {
    initialValue: string;
    onSave: (value: string) => void;
}

// Debounced input component for trip name
export const TripNameInput = ({ initialValue, onSave }: TripNameInputProps) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    return (
        <Input
            type="text"
            placeholder="e.g., Trip with In-laws"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
                if (value !== initialValue) {
                    onSave(value);
                }
            }}
            className="h-8 text-sm"
        />
    );
};
