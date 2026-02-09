import { VEHICLE_MAKES, VEHICLE_MODELS } from '../data/vehicle-makes-models';

const generatedMakes = VEHICLE_MAKES.map(make => ({
    value: make.toLowerCase().replace(/ /g, '-'),
    label: make
}));

const generatedModels: Record<string, { value: string; label: string }[]> = {};
Object.entries(VEHICLE_MODELS).forEach(([make, models]) => {
    generatedModels[make.toLowerCase().replace(/ /g, '-')] = models.map(model => ({
        value: model.toLowerCase().replace(/ /g, '-'),
        label: model
    }));
});

export const VEHICLE_DATA = {
    cars: {
        makes: generatedMakes,
        models: generatedModels,
        bodyStyles: [
            { value: 'sedan', label: 'Sedan' },
            { value: 'hatchback', label: 'Hatchback' },
            { value: 'suv', label: 'SUV' },
            { value: 'ute', label: 'Ute' },
            { value: 'station-wagon', label: 'Station Wagon' },
            { value: 'coupe', label: 'Coupe' },
            { value: 'convertible', label: 'Convertible' },
            { value: 'van', label: 'Van' },
            { value: 'people-mover', label: 'People Mover' },
        ],
        fuelTypes: [
            { value: 'petrol', label: 'Petrol' },
            { value: 'diesel', label: 'Diesel' },
            { value: 'hybrid', label: 'Hybrid' },
            { value: 'electric', label: 'Electric' },
            { value: 'phev', label: 'PHEV (Plug-in Hybrid)' },
            { value: 'lpg', label: 'LPG' },
        ],
        priceRanges: [
            { value: '5000', label: '$5,000' },
            { value: '10000', label: '$10,000' },
            { value: '20000', label: '$20,000' },
            { value: '30000', label: '$30,000' },
            { value: '40000', label: '$40,000' },
            { value: '50000', label: '$50,000' },
            { value: '75000', label: '$75,000' },
            { value: '100000', label: '$100k+' },
        ]
    },
    motorbikes: {
        makes: [
            { value: 'honda', label: 'Honda' },
            { value: 'yamaha', label: 'Yamaha' },
            { value: 'suzuki', label: 'Suzuki' },
            { value: 'kawasaki', label: 'Kawasaki' },
            { value: 'harley-davidson', label: 'Harley-Davidson' },
            { value: 'bmw', label: 'BMW' },
            { value: 'triumph', label: 'Triumph' },
            { value: 'ducati', label: 'Ducati' },
            { value: 'ktm', label: 'KTM' },
            { value: 'royal-enfield', label: 'Royal Enfield' },
        ],
        styles: [
            { value: 'cruiser', label: 'Cruiser' },
            { value: 'sports', label: 'Sports' },
            { value: 'touring', label: 'Touring' },
            { value: 'off-road', label: 'Off-road' },
            { value: 'scooter', label: 'Scooter' },
            { value: 'naked', label: 'Naked' },
        ],
        engineSizes: [
            { value: '50', label: '50cc' },
            { value: '125', label: '125cc' },
            { value: '250', label: '250cc' },
            { value: '400', label: '400cc' },
            { value: '600', label: '600cc' },
            { value: '1000', label: '1000cc+' },
        ],
        priceRanges: [
            { value: '2000', label: '$2,000' },
            { value: '5000', label: '$5,000' },
            { value: '8000', label: '$8,000' },
            { value: '10000', label: '$10,000' },
            { value: '15000', label: '$15,000' },
            { value: '20000', label: '$20,000' },
            { value: '30000', label: '$30,000+' },
        ]
    },
    caravans: {
        makes: [
            { value: 'jayco', label: 'Jayco' },
            { value: 'bailey', label: 'Bailey' },
            { value: 'swift', label: 'Swift' },
            { value: 'avida', label: 'Avida' },
            { value: 'coromal', label: 'Coromal' },
            { value: 'windsor', label: 'Windsor' },
        ],
        berths: [
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
            { value: '5', label: '5' },
            { value: '6', label: '6+' },
        ],
        layouts: [
            { value: 'island-bed', label: 'Island bed' },
            { value: 'french-bed', label: 'French bed' },
            { value: 'twin-single', label: 'Twin single' },
            { value: 'bunk-beds', label: 'Bunk beds' },
        ],
        priceRanges: [
            { value: '10000', label: '$10,000' },
            { value: '20000', label: '$20,000' },
            { value: '40000', label: '$40,000' },
            { value: '60000', label: '$60,000' },
            { value: '80000', label: '$80,000' },
            { value: '100000', label: '$100,000' },
            { value: '150000', label: '$150,000+' },
        ]
    },
    boats: {
        makes: [
            { value: 'sea-ray', label: 'Sea Ray' },
            { value: 'bayliner', label: 'Bayliner' },
            { value: 'yamaha', label: 'Yamaha' },
            { value: 'kawasaki', label: 'Kawasaki' },
            { value: 'surtees', label: 'Surtees' },
            { value: 'stabicraft', label: 'Stabicraft' },
        ],
        hullTypes: [
            { value: 'fibreglass', label: 'Fibreglass' },
            { value: 'aluminium', label: 'Aluminium' },
            { value: 'inflatable', label: 'Inflatable' },
            { value: 'wood', label: 'Wood' },
        ],
        engineTypes: [
            { value: 'outboard', label: 'Outboard' },
            { value: 'inboard', label: 'Inboard' },
            { value: 'sterndrive', label: 'Sterndrive' },
            { value: 'jet', label: 'Jet' },
        ],
        priceRanges: [
            { value: '10000', label: '$10,000' },
            { value: '25000', label: '$25,000' },
            { value: '50000', label: '$50,000' },
            { value: '100000', label: '$100,000' },
            { value: '200000', label: '$200,000' },
            { value: '500000', label: '$500,000' },
            { value: '1000000', label: '$1M+' },
        ]
    },
    parts: {
        priceRanges: []
    }
};
