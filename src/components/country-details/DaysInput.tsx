import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface DaysInputProps {
    initialValue: number;
    disabled: boolean;
    onSave: (value: number) => void;
}

// Debounced input component for days
export const DaysInput = ({ initialValue, disabled, onSave }: DaysInputProps) => {
    const [value, setValue] = useState(initialValue.toString());

    useEffect(() => {
        setValue(initialValue.toString());
    }, [initialValue]);

    return (
        <Input
            type="number"
            min={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
                const numValue = parseInt(value);
                if (!isNaN(numValue) && numValue >= 1 && numValue !== initialValue) {
                    onSave(numValue);
                } else if (isNaN(numValue) || numValue < 1) {
                    setValue(initialValue.toString());
                }
            }}
            disabled={disabled}
            className={`h-8 text-sm ${disabled ? "bg-muted cursor-not-allowed" : ""}`}
            placeholder="Enter days"
        />
    );
};
