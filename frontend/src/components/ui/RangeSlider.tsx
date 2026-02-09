import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface RangeSliderProps {
    min: number;
    max: number;
    step?: number;
    value: [number, number];
    onChange: (value: [number, number]) => void;
    formatLabel?: (value: number) => string;
    className?: string;
}

export function RangeSlider({
    min,
    max,
    step = 1,
    value,
    onChange,
    formatLabel = (v) => v.toString(),
    className,
}: RangeSliderProps) {
    const [minVal, setMinVal] = useState(value[0]);
    const [maxVal, setMaxVal] = useState(value[1]);
    const minValRef = useRef(value[0]);
    const maxValRef = useRef(value[1]);
    const range = useRef<HTMLDivElement>(null);

    // Convert to percentage
    const getPercent = useCallback(
        (value: number) => Math.round(((value - min) / (max - min)) * 100),
        [min, max]
    );

    // Set width of the range to decrease from the left side
    useEffect(() => {
        const minPercent = getPercent(minVal);
        const maxPercent = getPercent(maxValRef.current);

        if (range.current) {
            range.current.style.left = `${minPercent}%`;
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [minVal, getPercent]);

    // Set width of the range to decrease from the right side
    useEffect(() => {
        const minPercent = getPercent(minValRef.current);
        const maxPercent = getPercent(maxVal);

        if (range.current) {
            range.current.style.width = `${maxPercent - minPercent}%`;
        }
    }, [maxVal, getPercent]);

    useEffect(() => {
        setMinVal(value[0]);
        setMaxVal(value[1]);
        minValRef.current = value[0];
        maxValRef.current = value[1];
    }, [value]);

    return (
        <div className={cn("w-full py-4 select-none", className)}>
            <div className="flex justify-between mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded">{formatLabel(minVal)}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded">{formatLabel(maxVal)}</span>
            </div>

            <div className="relative h-5 w-full flex items-center">
                <div className="absolute w-full h-1.5 rounded-full bg-gray-200 dark:bg-neutral-700 overflow-hidden top-1/2 -translate-y-1/2">
                    <div
                        ref={range}
                        className="absolute h-full bg-primary-600"
                    />
                </div>

                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={minVal}
                    onChange={(event) => {
                        const value = Math.min(Number(event.target.value), maxVal - step);
                        setMinVal(value);
                        minValRef.current = value;
                        onChange([value, maxVal]);
                    }}
                    className="absolute w-full h-full appearance-none bg-transparent cursor-pointer z-20 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                    style={{ zIndex: minVal > max - 100 ? 5 : undefined }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={maxVal}
                    onChange={(event) => {
                        const value = Math.max(Number(event.target.value), minVal + step);
                        setMaxVal(value);
                        maxValRef.current = value;
                        onChange([minVal, value]);
                    }}
                    className="absolute w-full h-full appearance-none bg-transparent cursor-pointer z-20 pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                />
            </div>
        </div>
    );
}
