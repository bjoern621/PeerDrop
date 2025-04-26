import { useEffect, useState } from "react";
import errorAsValue from "../../util/ErrorAsValue";

interface WeatherForecast {
    date: string;
    temperatureC: number;
    temperatureF: number;
    summary: string | undefined;
}

export function Fetch() {
    const [newWeatherData, setWeatherData] = useState<WeatherForecast[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            const [response, err1] = await errorAsValue(
                fetch(
                    `${import.meta.env.VITE_BACKEND_URL}/weatherforecast` // weatherforecast, weatherforecast1, weatherforecast2, weatherforecast3, weatherforecast4, weatherforecast5
                )
            );
            if (err1) {
                setError(err1.message + " (err1)");
                setLoading(false);
                return;
            }

            if (!response.ok) {
                setError("Error fetching data: " + response.statusText);
                setLoading(false);
                return;
            }

            console.log("response:", response);

            const [json, err2] = await errorAsValue(response.json());
            if (err2) {
                setError(err2.message + " (err2)");
                setLoading(false);
                return;
            }

            console.log("body:", json);

            const newWeatherData = json as WeatherForecast[]; // Unsicher: nicht garantiert, dass es WeatherForecast[] ist

            setWeatherData(newWeatherData);
            setLoading(false);
        })();
    }, []);

    return (
        <div>
            <h1>Weather Forecast</h1>

            {loading && <p>Loading weather data...</p>}

            {error && (
                <p style={{ color: "red" }}>Error loading data: {error}</p>
            )}

            {!loading && !error && newWeatherData.length === 0 && (
                <p>No weather data available.</p>
            )}

            {newWeatherData.length > 0 && (
                <div>
                    <table
                        style={{ borderCollapse: "collapse", width: "100%" }}
                    >
                        <thead>
                            <tr style={{ borderBottom: "2px solid white" }}>
                                <th
                                    style={{
                                        padding: "8px",
                                        textAlign: "left",
                                    }}
                                >
                                    Date
                                </th>
                                <th
                                    style={{
                                        padding: "8px",
                                        textAlign: "left",
                                    }}
                                >
                                    Temperature (C)
                                </th>
                                <th
                                    style={{
                                        padding: "8px",
                                        textAlign: "left",
                                    }}
                                >
                                    Temperature (F)
                                </th>
                                <th
                                    style={{
                                        padding: "8px",
                                        textAlign: "left",
                                    }}
                                >
                                    Summary
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {newWeatherData.map((forecast, index) => (
                                <tr
                                    key={index}
                                    style={{ borderBottom: "1px solid #444" }}
                                >
                                    <td style={{ padding: "8px" }}>
                                        {forecast.date}
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                        {forecast.temperatureC}°C
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                        {forecast.temperatureF}°F
                                    </td>
                                    <td style={{ padding: "8px" }}>
                                        {forecast.summary}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
