import { makeStyles, tokens, shorthands } from "@fluentui/react-components";

export const useWeatherWidgetStyles = makeStyles({
    weatherContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        width: 'auto',
        '@media (max-width: 1024px)': {
            justifyContent: 'center',
        },
        '@media (max-width: 768px)': {
            width: '100%',
            justifyContent: 'center'
        }
    },
    weatherCard: {
        backgroundColor: tokens.colorNeutralBackground1,
        color: tokens.colorNeutralForeground1,
        minWidth: '200px', // Etwas kleiner
        maxWidth: '250px', // Etwas kleiner
        ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
        ...shorthands.borderRadius(tokens.borderRadiusMedium),
        ...shorthands.padding('12px'), // Weniger Padding
        boxShadow: tokens.shadow4,
        flexShrink: 0,
        
        '@media (max-width: 1024px)': {
            maxWidth: '220px',
            ...shorthands.padding('10px')
        },
        
        '@media (max-width: 768px)': {
            maxWidth: '100%',
            width: '100%',
            ...shorthands.padding('8px'),
            minWidth: 'auto'
        },
        
        '@media (max-width: 480px)': {
            ...shorthands.padding('6px'),
            maxWidth: '100%'
        }
    },
    weatherContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px', // Kleinere Lücken
        minHeight: '50px', // Kleinere Höhe
        '@media (max-width: 480px)': {
            gap: '6px',
            minHeight: '40px'
        }
    },
    weatherInfo: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        '@media (max-width: 480px)': {
            gap: '6px'
        }
    },
    weatherHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        '@media (max-width: 480px)': {
            gap: '8px'
        }
    },
    weatherIcon: {
        fontSize: '24px',
        lineHeight: '1',
        '@media (max-width: 480px)': {
            fontSize: '20px'
        }
    },
    temperatureSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    temperature: {
        lineHeight: '1.2',
        color: tokens.colorNeutralForeground1,
        fontSize: '18px',
        '@media (max-width: 480px)': {
            fontSize: '16px'
        }
    },
    condition: {
        lineHeight: '1.2',
        color: tokens.colorNeutralForeground2,
        fontSize: '12px',
        '@media (max-width: 480px)': {
            fontSize: '11px'
        }
    },
    location: {
        lineHeight: '1.3',
        color: tokens.colorNeutralForeground2,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        wordBreak: 'break-word',
        fontSize: '12px',
        
        // Für sehr lange Adressen auf Mobile
        '@media (max-width: 768px)': {
            WebkitLineClamp: 3,
            fontSize: '11px'
        },
        
        '@media (max-width: 480px)': {
            WebkitLineClamp: 2,
            fontSize: '10px'
        }
    },
    errorText: {
        lineHeight: '1.2',
        color: tokens.colorNeutralForeground2,
        '@media (max-width: 480px)': {
            fontSize: '12px'
        }
    }
});