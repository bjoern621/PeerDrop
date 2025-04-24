import { useEffect } from "react";

export function Fetch() {
    useEffect(() => {
        fetch(
            `http://${import.meta.env.VITE_BACKEND_HOST}:${
                import.meta.env.VITE_BACKEND_PORT
            }/weatherforecast`
        )
            .then(response => console.log(response))
            .then(data => console.log(data))
            .catch(error => console.error("Error fetching data:", error));
    }, []);

    return (
        <div>
            <h1>Fetch Example</h1>
            <p>
                This component fetches data from an API and logs it to the
                console.
            </p>
        </div>
    );
}
