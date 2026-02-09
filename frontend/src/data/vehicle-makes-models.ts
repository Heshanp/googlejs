export const VEHICLE_MAKES = [
    'Abarth', 'Acura', 'Alfa Romeo', 'Aston Martin', 'Audi', 'Bentley', 'BMW', 'Buick', 'BYD',
    'Cadillac', 'Chery', 'Chevrolet', 'Chrysler', 'Citroën', 'Cupra',
    'Dodge', 'Ferrari', 'Fiat', 'Ford', 'Geely', 'Genesis', 'GMC', 'Great Wall',
    'Haval', 'Holden', 'Honda', 'Hyundai', 'Infiniti', 'Isuzu',
    'Jaecoo', 'Jaguar', 'Jeep', 'Kia', 'Lamborghini', 'Land Rover', 'LDV', 'Lexus', 'Lincoln', 'Lotus',
    'Maserati', 'Mazda', 'McLaren', 'Mercedes-Benz', 'MG', 'Mini', 'Mitsubishi',
    'Nissan', 'Omoda', 'Peugeot', 'Polestar', 'Porsche', 'RAM', 'Range Rover', 'Renault', 'Rolls-Royce',
    'Seat', 'Skoda', 'SsangYong', 'Subaru', 'Suzuki',
    'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Zeekr',
    'Other'
];

export const VEHICLE_MODELS: Record<string, string[]> = {
    // Japanese
    'Toyota': ['Corolla', 'Camry', 'RAV4', 'Hilux', 'Yaris', 'Prius', 'Highlander', 'Land Cruiser', 'Aqua', 'C-HR', 'Fortuner', '86', 'Hiace', 'Land Cruiser Prado', 'Vitz', 'Wish', 'Blade', 'Estima', 'Other'],
    'Mazda': ['Mazda2', 'Mazda3', 'Mazda6', 'CX-3', 'CX-5', 'CX-7', 'CX-8', 'CX-9', 'CX-30', 'CX-60', 'BT-50', 'MX-5', 'MX-30', 'Demio', 'Axela', 'Atenza', 'MPV', 'Premacy', 'Other'],
    'Nissan': ['Navara', 'X-Trail', 'Qashqai', 'Leaf', 'Tiida', 'Note', 'Juke', 'Pathfinder', 'Patrol', 'Skyline', 'Murano', 'Serena', 'March', 'Dualis', 'GT-R', 'Z', 'Ariya', 'Other'],
    'Honda': ['Civic', 'Jazz', 'CR-V', 'Accord', 'Odyssey', 'HR-V', 'Fit', 'Stream', 'Insight', 'Crossroad', 'Vezel', 'City', 'Integra', 'ZR-V', 'Other'],
    'Mitsubishi': ['Triton', 'Outlander', 'ASX', 'Pajero', 'Lancer', 'Mirage', 'Eclipse Cross', 'Pajero Sport', 'Challenger', 'Delica', 'Other'],
    'Subaru': ['Outback', 'Forester', 'Legacy', 'Impreza', 'XV', 'WRX', 'Levorg', 'Tribeca', 'Exiga', 'Crosstrek', 'Solterra', 'Other'],
    'Suzuki': ['Swift', 'Vitara', 'Jimny', 'Grand Vitara', 'Ignis', 'Baleno', 'SX4', 'S-Cross', 'Alto', 'Splash', 'Other'],
    'Isuzu': ['D-Max', 'MU-X', 'N Series', 'F Series', 'Other'],
    'Lexus': ['CT', 'IS', 'ES', 'GS', 'LS', 'UX', 'NX', 'RX', 'GX', 'LX', 'RC', 'LC', 'RZ', 'Other'],
    'Infiniti': ['Q50', 'Q60', 'Q70', 'QX50', 'QX55', 'QX60', 'QX80', 'Other'],
    'Acura': ['TLX', 'RDX', 'MDX', 'Integra', 'NSX', 'Other'],

    // Korean
    'Hyundai': ['Tucson', 'Santa Fe', 'i30', 'i20', 'Kona', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Elantra', 'Accent', 'Getz', 'H1', 'Venue', 'Palisade', 'Staria', 'Other'],
    'Kia': ['Sportage', 'Sorento', 'Cerato', 'Rio', 'Picanto', 'Stonic', 'Seltos', 'Carnival', 'Niro', 'EV6', 'EV9', 'Stinger', 'Other'],
    'Genesis': ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80', 'Other'],
    'SsangYong': ['Rexton', 'Korando', 'Musso', 'Tivoli', 'Torres', 'Other'],

    // German
    'BMW': ['1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4', 'M2', 'M3', 'M4', 'M5', 'iX', 'i4', 'i7', 'Other'],
    'Mercedes-Benz': ['A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'V-Class', 'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'AMG GT', 'Other'],
    'Audi': ['A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4', 'Q5', 'Q7', 'Q8', 'e-tron', 'e-tron GT', 'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'TT', 'R8', 'Other'],
    'Volkswagen': ['Golf', 'Polo', 'Tiguan', 'Touareg', 'Passat', 'Arteon', 'T-Roc', 'T-Cross', 'ID.3', 'ID.4', 'ID.5', 'Amarok', 'Caddy', 'Transporter', 'Multivan', 'Other'],
    'Porsche': ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman', 'Other'],

    // Other European
    'Volvo': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V40', 'V60', 'V90', 'C40', 'EX30', 'EX90', 'Other'],
    'Peugeot': ['208', '308', '408', '508', '2008', '3008', '5008', 'e-208', 'e-2008', 'Partner', 'Expert', 'Other'],
    'Renault': ['Clio', 'Megane', 'Captur', 'Kadjar', 'Koleos', 'Arkana', 'Zoe', 'Megane E-Tech', 'Other'],
    'Citroën': ['C3', 'C4', 'C5', 'C3 Aircross', 'C5 Aircross', 'Berlingo', 'Other'],
    'Fiat': ['500', '500X', 'Panda', 'Tipo', 'Doblo', 'Ducato', 'Other'],
    'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', 'Giulietta', '4C', 'Other'],
    'Abarth': ['500', '595', '695', 'Other'],
    'Seat': ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco', 'Other'],
    'Skoda': ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq', 'Other'],
    'Cupra': ['Leon', 'Formentor', 'Born', 'Ateca', 'Tavascan', 'Other'],
    'Polestar': ['1', '2', '3', '4', 'Other'],
    'Mini': ['Cooper', 'Cooper S', 'Countryman', 'Clubman', 'Paceman', 'Electric', 'Other'],
    'Jaguar': ['XE', 'XF', 'F-Type', 'E-Pace', 'F-Pace', 'I-Pace', 'Other'],
    'Land Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar', 'Discovery', 'Discovery Sport', 'Defender', 'Other'],
    'Range Rover': ['Range Rover', 'Sport', 'Evoque', 'Velar', 'Other'],

    // American
    'Ford': ['Ranger', 'Focus', 'Mondeo', 'Falcon', 'Territory', 'Escape', 'Everest', 'Fiesta', 'Mustang', 'Transit', 'Ecosport', 'Kuga', 'Bronco', 'F-150', 'Mach-E', 'Other'],
    'Chevrolet': ['Silverado', 'Colorado', 'Camaro', 'Corvette', 'Suburban', 'Tahoe', 'Equinox', 'Traverse', 'Malibu', 'Bolt', 'Other'],
    'GMC': ['Sierra', 'Canyon', 'Yukon', 'Acadia', 'Terrain', 'Hummer EV', 'Other'],
    'Dodge': ['Challenger', 'Charger', 'Durango', 'RAM', 'Other'],
    'RAM': ['1500', '2500', '3500', 'ProMaster', 'Other'],
    'Chrysler': ['300', 'Pacifica', 'Voyager', 'Other'],
    'Cadillac': ['Escalade', 'CT4', 'CT5', 'XT4', 'XT5', 'XT6', 'Lyriq', 'Other'],
    'Buick': ['Enclave', 'Encore', 'Envision', 'Other'],
    'Lincoln': ['Navigator', 'Aviator', 'Corsair', 'Nautilus', 'Other'],
    'Jeep': ['Wrangler', 'Cherokee', 'Grand Cherokee', 'Compass', 'Renegade', 'Gladiator', 'Wagoneer', 'Other'],
    'Tesla': ['Model 3', 'Model Y', 'Model S', 'Model X', 'Cybertruck', 'Other'],
    'Holden': ['Commodore', 'Colorado', 'Captiva', 'Cruze', 'Astra', 'Barina', 'Trax', 'Acadia', 'Trailblazer', 'Other'],

    // Chinese
    'BYD': ['Atto 3', 'Dolphin', 'Seal', 'Tang', 'Han', 'Song', 'Yuan', 'Shark', 'Other'],
    'MG': ['ZS', 'ZS EV', 'HS', 'MG3', 'MG4', 'MG5', 'MG7', 'Cyberster', 'Other'],
    'Haval': ['H6', 'H9', 'Jolion', 'Other'],
    'Great Wall': ['Cannon', 'Tank 300', 'Tank 500', 'Ora', 'Other'],
    'LDV': ['T60', 'D90', 'G10', 'Deliver 9', 'eDeliver', 'Other'],
    'Chery': ['Tiggo 4', 'Tiggo 7', 'Tiggo 8', 'Arrizo', 'Other'],
    'Geely': ['Coolray', 'Azkarra', 'Okavango', 'Emgrand', 'Other'],
    'Omoda': ['C5', 'E5', 'Other'],
    'Jaecoo': ['J7', 'J8', 'Other'],
    'Zeekr': ['001', '007', '009', 'X', 'Other'],

    // Luxury/Exotic
    'Ferrari': ['Roma', 'Portofino', 'F8', '296', 'SF90', '812', 'Purosangue', 'Other'],
    'Lamborghini': ['Huracán', 'Urus', 'Revuelto', 'Other'],
    'Maserati': ['Ghibli', 'Quattroporte', 'Levante', 'MC20', 'Grecale', 'GranTurismo', 'Other'],
    'McLaren': ['720S', '765LT', 'Artura', 'GT', 'Other'],
    'Aston Martin': ['Vantage', 'DB11', 'DB12', 'DBS', 'DBX', 'Other'],
    'Bentley': ['Continental GT', 'Flying Spur', 'Bentayga', 'Other'],
    'Rolls-Royce': ['Ghost', 'Phantom', 'Cullinan', 'Spectre', 'Dawn', 'Wraith', 'Other'],
    'Lotus': ['Elise', 'Exige', 'Evora', 'Emira', 'Eletre', 'Other'],

    // Fallback
    'Other': ['Other']
};

export const getModelsForMake = (make: string): string[] => {
    return VEHICLE_MODELS[make] || ['Other'];
};
