import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Card, Text, Spinner } from "@fluentui/react-components";
import { useWeatherWidgetStyles } from '../../css/WeatherWidget.styles';

export const WeatherWidget: React.FC = () => {
    const classes = useWeatherWidgetStyles();
    const [temperature, setTemperature] = useState<number | null>(null);
    const [location, setLocation] = useState<string | null>(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherIcon, setWeatherIcon] = useState<string>('☀️');

    const getWeatherIcon = (temp: number, condition: string): string => {
        if (condition.includes('cloud')) return '☁️';
        if (condition.includes('rain')) return '🌧️';
        if (condition.includes('snow')) return '❄️';
        if (condition.includes('fog')) return '🌫️';
        if (condition.includes('storm')) return '⛈️';
        if (temp > 25) return '☀️';
        if (temp > 15) return '⛅';
        return '🌤️';
    };

    const fetchWeatherData = useCallback(async (): Promise<void> => {
        setWeatherLoading(true);
        try {
            if (navigator.geolocation) {
                const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject);
                });
                
                const { latitude, longitude } = position.coords;
                
                // 1. Vollständige Adresse über Reverse Geocoding abrufen
                const addressResponse = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                );
                const addressData = await addressResponse.json();
                
                // Vollständige Adresse verwenden
                const displayAddress = addressData.display_name || 'Unbekannte Location';
                
                // 2. Wetterdaten mit mehr Informationen abrufen
                const weatherResponse = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
                );
                const weatherData = await weatherResponse.json();
                
                const temp = Math.round(weatherData.current.temperature_2m);
                const humidity = weatherData.current.relative_humidity_2m;
                const weatherCode = weatherData.current.weather_code;
                
                // Wetterbedingung basierend auf weather code
                let condition = 'Sunny';
                if (weatherCode === 0) condition = 'Clear sky';
                else if (weatherCode <= 3) condition = 'Partly cloudy';
                else if (weatherCode <= 67) condition = 'Rainy';
                else if (weatherCode <= 77) condition = 'Snowy';
                else if (weatherCode <= 99) condition = 'Stormy';
                
                setTemperature(temp);
                setLocation(displayAddress);
                setWeatherIcon(getWeatherIcon(temp, condition));
            }
        } catch (error: unknown) {
            console.error('Weather API Fehler:', error);
        } finally {
            setWeatherLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchWeatherData();
    }, [fetchWeatherData]);

    return (
        <div className={classes.weatherContainer}>
            <Card className={classes.weatherCard}>
                <div className={classes.weatherContent}>
                    {weatherLoading ? (
                        <Spinner size="small" />
                    ) : temperature !== null && location ? (
                        <div className={classes.weatherInfo}>
                            <div className={classes.weatherHeader}>
                                <Text size={600} className={classes.weatherIcon}>
                                    {weatherIcon}
                                </Text>
                                <div className={classes.temperatureSection}>
                                    <Text size={500} weight="semibold" className={classes.temperature}>
                                        {temperature}°C
                                    </Text>
                                    <Text size={300} className={classes.condition}>
                                        {weatherIcon === '☀️' ? 'Sunny' : 
                                         weatherIcon === '⛅' ? 'Partly cloudy' :
                                         weatherIcon === '☁️' ? 'Cloudy' :
                                         weatherIcon === '🌧️' ? 'Rainy' : 'Clear'}
                                    </Text>
                                </div>
                            </div>
                            <Text size={200} className={classes.location}>
                            📍 {(() => {
                                const parts = location.split(',');
                                // Auf Mobile kürzere Adresse anzeigen
                                if (window.innerWidth <= 480 && parts.length > 2) {
                                    return `${parts[0]}, ${parts[1]}`;
                                }
                                if (window.innerWidth <= 768 && parts.length > 3) {
                                    return `${parts[0]}, ${parts[1]}, ${parts[2]}`;
                                }
                                return location;
                            })()}
                        </Text>
                        </div>
                    ) : (
                        <Text size={300} className={classes.errorText}>
                            Location unavailable
                        </Text>
                    )}
                </div>
            </Card>
        </div>
    );
};