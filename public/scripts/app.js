let maponApiKey = 'your-api-key';

document.addEventListener('DOMContentLoaded', () => {
    // Handle Mapon API units to get unit ids and registration numbers
    fetch(`https://mapon.com/api/v1/unit/list.json?key=${maponApiKey}`)
        .then(response => response.json())
        .then(data => {
            data.data.units.forEach((unit) => {
                let vehicleList = document.querySelector('#vehicle');
                let option = document.createElement("option");
                option.text = unit.number;
                option.setAttribute('value', unit.unit_id); // Sets the value of each option(vehicle) as unit_id
                vehicleList.add(option);
            })
        })

    // Set date fields in Route report form to default
    let today = new Date();
    let from = new Date();
    from.setDate(from.getDate() - 31); // As the API doesn't accept a period longer than 31 days.

    document.querySelector('.from').valueAsDate = from;
    document.querySelector('.to').valueAsDate = today;
    
    document.querySelector('form').addEventListener('submit', handleForm);
});

let handleForm = (event) => {
    event.preventDefault();
    let form = event.target;
    let formData = new FormData(form);
    let from = new Date(formData.get('from'));
    let to = new Date(formData.get('to'));
    let vehicle = formData.get('vehicle');

    // Calculate entered form date difference
    let differenceInMs = Math.abs(to - from);
    let differenceInDays = Math.ceil(differenceInMs / (1000 * 60 * 60 * 24));
    
    if (differenceInDays <= 31 && vehicle != null) {
        let path = [];
        let distanceDriven = 0;
        let drivingTimeMs = 0;
        let startCoordinates = {};
        let finishCoordinates = {};
        
        // Handle Mapon API route data of selected vehicle and initialize Google Map
        fetch(`https://mapon.com/api/v1/route/list.json?key=${maponApiKey}&unit_id=${formData.get('vehicle')}&from=${formData.get('from')}T00:00:00Z&till=${formData.get('to')}T23:59:59Z&include=decoded_route`)
            .then(response => response.json())
            .then(data => {
                let filteredRoutes = data.data.units[0].routes.filter((route) => route.type ==='route');
                filteredRoutes.forEach((route) => {
                    route.decoded_route.points.forEach((point, index) => {                        
                        let coordinates = {};
                        coordinates['lat'] = Math.floor(point.lat*100000+0.5)/100000;
                        coordinates['lng'] = Math.floor(point.lng*100000+0.5)/100000;   
                        
                        // Remove identical neigboring coordinates
                        if (index === 0) {
                            path.push(coordinates);
                        } else if (coordinates.lat !== path[path.length-1].lat && coordinates.lng !== path[path.length-1].lng) {
                            path.push(coordinates);
                        }
                    });

                    distanceDriven += route.distance;

                    let drivingTimeFrom = new Date(route.start.time);
                    let drivingTimeTill = new Date(route.end.time);
                    let drivingTimeRoute = Math.abs(drivingTimeTill - drivingTimeFrom);
                    drivingTimeMs += drivingTimeRoute;
                });
                
                document.querySelector('.km-driven').innerHTML = `${Math.round(distanceDriven/1000)}`;
                
                if (filteredRoutes.length >= 1) {
                    startCoordinates['lat'] = filteredRoutes[0].start.lat;
                    startCoordinates['lng'] = filteredRoutes[0].start.lng;

                    finishCoordinates['lat'] = filteredRoutes[filteredRoutes.length-1].end.lat;
                    finishCoordinates['lng'] = filteredRoutes[filteredRoutes.length-1].end.lng;

                    let totalTimeFrom = new Date(filteredRoutes[0].start.time);
                    let totalTimeTill = new Date(filteredRoutes[filteredRoutes.length-1].end.time);
                    let totalTimeMs = Math.abs(totalTimeFrom - totalTimeTill);

                    // Calculate total hours and minutes
                    let totalHours = Math.floor(totalTimeMs / 3600000);
                    totalTimeMs -= totalHours * 3600000;

                    let totalMinutes = Math.floor(totalTimeMs / 60000) % 60;

                    //Calculate driving hours and minutes
                    let drivingHours = Math.floor(drivingTimeMs / 3600000);
                    drivingTimeMs -= drivingHours * 3600000;

                    let drivingMinutes = Math.floor(drivingTimeMs / 60000) % 60;

                    document.querySelector('.total-time').innerHTML = `${totalHours}h ${totalMinutes}m`;
                    document.querySelector('.driving-time').innerHTML = `${drivingHours}h ${drivingMinutes}m`;
                } else {
                    document.querySelector('.total-time').innerHTML = `0`;
                    document.querySelector('.driving-time').innerHTML = `0`;
                }

                initMap();
            })

        document.querySelector('.report').className = 'report active';

        let initMap = () => {
            let bounds = new google.maps.LatLngBounds();
            path.forEach((coordinate) => bounds.extend(coordinate));

            // Map
            map = new google.maps.Map(document.querySelector(".report-map"), {
                center: { lat: 56.946285, lng: 24.105078 },
                zoom: 12,
                backgroundColor: '#98CA02',
                disableDefaultUI: true
            });
            
            // Route
            let route = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: "#39B0FA",
                strokeOpacity: 1.0,
                strokeWeight: 3
            });
            route.setMap(map);
            map.fitBounds(bounds);

            //Markers
            let marker = '../images/marker.png';
            let startMarker = new google.maps.Marker({
                position: startCoordinates,
                map,
                icon: marker
            });
            let finishmarker = new google.maps.Marker({
                position: finishCoordinates,
                map,
                icon: marker
            });
        }
    } else if (differenceInDays > 31 && vehicle === null) {
        alert("Period cannot exceed 31 days.\nSelect a vehicle!");
    } else if (differenceInDays > 31) {
        alert("Period cannot exceed 31 days.");
    } else if (vehicle === null) {
        alert("Select a vehicle!");
    }
}