export interface Suburb {
    value: string;
    label: string;
}

export interface District {
    label: string;
    suburbs: Suburb[];
}

export interface Region {
    label: string;
    districts: Record<string, District>;
}

export const NZ_LOCATIONS: Record<string, Region> = {
    auckland: {
        label: 'Auckland',
        districts: {
            'auckland-city': {
                label: 'Auckland City',
                suburbs: [
                    { value: 'auckland-central', label: 'Auckland Central' },
                    { value: 'parnell', label: 'Parnell' },
                    { value: 'ponsonby', label: 'Ponsonby' },
                    { value: 'grey-lynn', label: 'Grey Lynn' },
                    { value: 'mt-eden', label: 'Mt Eden' },
                    { value: 'remuera', label: 'Remuera' },
                    { value: 'epsom', label: 'Epsom' },
                    { value: 'mission-bay', label: 'Mission Bay' },
                ]
            },
            'north-shore': {
                label: 'North Shore City',
                suburbs: [
                    { value: 'albany', label: 'Albany' },
                    { value: 'takapuna', label: 'Takapuna' },
                    { value: 'devonport', label: 'Devonport' },
                    { value: 'glenfield', label: 'Glenfield' },
                    { value: 'birkenhead', label: 'Birkenhead' },
                    { value: 'milford', label: 'Milford' },
                ]
            },
            'manukau': {
                label: 'Manukau City',
                suburbs: [
                    { value: 'manukau', label: 'Manukau' },
                    { value: 'papatoetoe', label: 'Papatoetoe' },
                    { value: 'howick', label: 'Howick' },
                    { value: 'pakuranga', label: 'Pakuranga' },
                    { value: 'botany-downs', label: 'Botany Downs' },
                ]
            },
            'waitakere': {
                label: 'Waitakere City',
                suburbs: [
                    { value: 'henderson', label: 'Henderson' },
                    { value: 'titirangi', label: 'Titirangi' },
                    { value: 'new-lynn', label: 'New Lynn' },
                    { value: 'te-atatu', label: 'Te Atatu' },
                    { value: 'massey', label: 'Massey' },
                ]
            },
            'rodney': {
                label: 'Rodney',
                suburbs: [
                    { value: 'orewa', label: 'Orewa' },
                    { value: 'whangaparaoa', label: 'Whangaparaoa' },
                    { value: 'warkworth', label: 'Warkworth' },
                ]
            },
            'papakura': {
                label: 'Papakura',
                suburbs: [
                    { value: 'papakura', label: 'Papakura' },
                    { value: 'drury', label: 'Drury' },
                ]
            }
        }
    },
    wellington: {
        label: 'Wellington',
        districts: {
            'wellington-city': {
                label: 'Wellington City',
                suburbs: [
                    { value: 'te-aro', label: 'Te Aro' },
                    { value: 'kelburn', label: 'Kelburn' },
                    { value: 'khandallah', label: 'Khandallah' },
                    { value: 'karori', label: 'Karori' },
                    { value: 'newtown', label: 'Newtown' },
                    { value: 'oriental-bay', label: 'Oriental Bay' },
                ]
            },
            'porirua': {
                label: 'Porirua City',
                suburbs: [
                    { value: 'porirua', label: 'Porirua' },
                    { value: 'titahi-bay', label: 'Titahi Bay' },
                    { value: 'whitby', label: 'Whitby' },
                ]
            },
            'lower-hutt': {
                label: 'Lower Hutt City',
                suburbs: [
                    { value: 'lower-hutt-central', label: 'Lower Hutt Central' },
                    { value: 'petone', label: 'Petone' },
                    { value: 'eastbourne', label: 'Eastbourne' },
                ]
            },
            'upper-hutt': {
                label: 'Upper Hutt City',
                suburbs: [
                    { value: 'upper-hutt-central', label: 'Upper Hutt Central' },
                    { value: 'trentham', label: 'Trentham' },
                ]
            },
            'kapiti-coast': {
                label: 'Kapiti Coast',
                suburbs: [
                    { value: 'paraparaumu', label: 'Paraparaumu' },
                    { value: 'waikanae', label: 'Waikanae' },
                ]
            }
        }
    },
    canterbury: {
        label: 'Canterbury',
        districts: {
            'christchurch-city': {
                label: 'Christchurch City',
                suburbs: [
                    { value: 'christchurch-central', label: 'Christchurch Central' },
                    { value: 'riccarton', label: 'Riccarton' },
                    { value: 'merivale', label: 'Merivale' },
                    { value: 'cashmere', label: 'Cashmere' },
                    { value: 'fendalton', label: 'Fendalton' },
                    { value: 'sumner', label: 'Sumner' },
                ]
            },
            'selwyn': {
                label: 'Selwyn',
                suburbs: [
                    { value: 'rolleston', label: 'Rolleston' },
                    { value: 'lincoln', label: 'Lincoln' },
                ]
            },
            'waimakariri': {
                label: 'Waimakariri',
                suburbs: [
                    { value: 'rangiora', label: 'Rangiora' },
                    { value: 'kaiapoi', label: 'Kaiapoi' },
                ]
            }
        }
    },
    waikato: {
        label: 'Waikato',
        districts: {
            'hamilton-city': {
                label: 'Hamilton City',
                suburbs: [
                    { value: 'hamilton-central', label: 'Hamilton Central' },
                    { value: 'rototuna', label: 'Rototuna' },
                    { value: 'hillcrest', label: 'Hillcrest' },
                    { value: 'frankton', label: 'Frankton' },
                ]
            },
            'taupo': {
                label: 'Taupo',
                suburbs: [
                    { value: 'taupo-central', label: 'Taupo Central' },
                    { value: 'kinloch', label: 'Kinloch' },
                ]
            },
            'waikato': {
                label: 'Waikato',
                suburbs: [
                    { value: 'ngaruawahia', label: 'Ngaruawahia' },
                    { value: 'raglan', label: 'Raglan' },
                ]
            }
        }
    },
    'bay-of-plenty': {
        label: 'Bay Of Plenty',
        districts: {
            'tauranga': {
                label: 'Tauranga City',
                suburbs: [
                    { value: 'tauranga-central', label: 'Tauranga Central' },
                    { value: 'mount-maunganui', label: 'Mount Maunganui' },
                    { value: 'papamoa', label: 'Papamoa' },
                ]
            },
            'rotorua': {
                label: 'Rotorua',
                suburbs: [
                    { value: 'rotorua-central', label: 'Rotorua Central' },
                    { value: 'ngongotaha', label: 'Ngongotaha' },
                ]
            }
        }
    },
    otago: {
        label: 'Otago',
        districts: {
            'dunedin-city': {
                label: 'Dunedin City',
                suburbs: [
                    { value: 'dunedin-central', label: 'Dunedin Central' },
                    { value: 'north-dunedin', label: 'North Dunedin' },
                    { value: 'st-clair', label: 'St Clair' },
                ]
            },
            'queenstown-lakes': {
                label: 'Queenstown-Lakes',
                suburbs: [
                    { value: 'queenstown', label: 'Queenstown' },
                    { value: 'wanaka', label: 'Wanaka' },
                    { value: 'arrowtown', label: 'Arrowtown' },
                ]
            }
        }
    }
};
