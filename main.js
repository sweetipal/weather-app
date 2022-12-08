const API_KEY = "a960397ecff53eb2dbe34d53a6a665aa";

const DAYS_OF_THE_WEEK = ["sun","mon", "tue", "wed", "thu", "fri", "sat"];

let selectedCityText;
let selectedCity;

const getCitiesUsingGeolocation = async (searchText) =>{
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}&units=metric`)
    return response.json();

}


const getCurrentWeatherData = async({lat, lon, name:city}) => {
    const url = lat && lon ? `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric` : `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    return response.json();
}





const getHourlyForecast = async ({ name: city }) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const { main: { temp, temp_max, temp_min}, dt, dt_txt, weather: [{ description, icon }] } = forecast;
        return { temp, temp_max, temp_min, dt, dt_txt, description, icon }
    })
}




const formatTemperature = (temp) =>    `${temp?.toFixed(1)}°`;
const createIconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`;


const loadCurrentForecast = ({ name, main: { temp, temp_max, temp_min }, weather: [{description }] }) =>{

    const currentForecastElement = document.querySelector("#current-forecast");
    currentForecastElement.querySelector(".city").textContent = name;
    currentForecastElement.querySelector(".temp").textContent = formatTemperature(temp);
    currentForecastElement.querySelector(".description").textContent = description;
    currentForecastElement.querySelector(".min-max-temp").textContent = `High: ${formatTemperature(temp_max)} Low: ${formatTemperature(temp_min)}`;
}

const loadHourlyForecast = ({main : {temp : tempNow}, weather:[{icon :iconNow}]}, hourlyForecast) => {
    console.log(hourlyForecast);
    const timeFromater = Intl.DateTimeFormat("en", {
        hour12:true, hour: "numeric"
    })
    let dataFor12Hours =  hourlyForecast.slice(2,14); // 12 entries
    const hourlyContainer =  document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createIconUrl(iconNow)}">
    <p class="hourly-temp">${formatTemperature(tempNow)}</p>
    </article>
    `;



    for(let {temp, icon, dt_txt} of dataFor12Hours){
        innerHTMLString += `<article>
        <h3 class="time">${timeFromater.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${createIconUrl(icon)}">
        <p class="hourly-temp">${formatTemperature(temp)}</p>
        </article>`;
    }
    hourlyContainer.innerHTML = innerHTMLString;
}


const calculateDayWiseForecast = (hourlyForecast) =>{
    let dayWiseForecast = new Map();
    for(let forecast of hourlyForecast){
        const [date] = forecast.dt_txt.split(" ");
        console.log("Type of date is : --->");
        console.log(forecast.dt_txt.split(" "));
        console.log(date);
        const dayOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()];
        console.log(dayOfTheWeek);
        if(dayWiseForecast.has(dayOfTheWeek)){
            let forecasteForTheDay = dayWiseForecast.get(dayOfTheWeek);
            forecasteForTheDay.push(forecast);
            dayWiseForecast.set(dayOfTheWeek, forecasteForTheDay);
        }
        else{
            dayWiseForecast.set(dayOfTheWeek, [forecast]);
        }
    }
    console.log(dayWiseForecast);
    for(let [key, value] of dayWiseForecast){
        let temp_min = Math.min(...Array.from(value, val => val.temp_min));
        let temp_max = Math.max(...Array.from(value, val => val.temp_min));

        dayWiseForecast.set(key, {temp_min, temp_max, icon :value.find(v => v.icon).icon});
    }
    console.log(dayWiseForecast);
    return dayWiseForecast;
}

const loadFiveDayForecast = (hourlyForecast) =>{;
    console.log(hourlyForecast);
    const dayWiseForecast = calculateDayWiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container");
    let dayWiseInfo = "";
    Array.from(dayWiseForecast).map(([day, {icon, temp_max, temp_min}], index) => {
        if(index < 5){
            dayWiseInfo += `<article class="day-wise-forecast">
            <h3 class = "day">${index === 0 ? "today" : day}</h3>
            <img class="icon" src="${createIconUrl(icon)}" alt="icon for the forecast"/>
            <p class="min-temp">${formatTemperature(temp_min)}</p>
            <p class="max-temp">${formatTemperature(temp_max)}</p>
          </article>`;
        }
    });

    container.innerHTML = dayWiseInfo;
}

const loadFeelsLike = ({main : {feels_like}}) => {
    const container = document.querySelector("#feels-like");
    container.querySelector(".feels-like-temp").textContent = formatTemperature(feels_like);
}


const loadHumidity = ({main : {humidity}}) => {
    const container = document.querySelector("#humidity");
    container.querySelector(".humidity-value").textContent = `${humidity}%`;
}


const loadData = async () =>{
    const currentWeather =  await getCurrentWeatherData(selectedCity);
    loadCurrentForecast(currentWeather);
    const hourlyForecast = await getHourlyForecast(currentWeather);
    loadHourlyForecast(currentWeather, hourlyForecast);
    loadFiveDayForecast(hourlyForecast);
    loadFeelsLike(currentWeather);
    loadHumidity(currentWeather);
}



const loadForecasteUsingGeoLocation = () =>{
    navigator.geolocation.getCurrentPosition(({coords}) => {
        const {latitude:lat, longitude:lon} = coords;
        selectedCity = {lat, lon};
        loadData(selectedCity);
    }, error => console.log(error))
}

function debounce(func){
    let timer;
    return (...args) =>{
        clearTimeout(timer);  // clear existing timer
        // create a new time till the user is typing
        timer = setTimeout(() => {
            console.log("debounce")
            func.apply(this, args);
            
        }, 500)
    }
}
// search functionality.......
const onSearchChange = async (event) =>{
    let {value} = event.target;
    if(!value){
        selectedCity = null;
        selectedCityText = "";
    }
    if(value && (selectedCityText !== value)){
        const listOfCities =  await getCitiesUsingGeolocation(value);
        let options = "";
        for(let {lat, lon, name, state, country} of listOfCities){
            options += `<option data-city-details = '${JSON.stringify({lat, lon, name})}' value="${name}, ${state}, ${country}"></option>`
        }
        document.querySelector("#cities").innerHTML = options;
        console.log(listOfCities);
    }

}

// after selection ....
const handleCitySelection = (event) =>{
    console.log("selection done");
    selectedCityText = event.target.value;
    let options = document.querySelectorAll("#cities > option");
    console.log(options);
    if(options?.length){
        let selectedOption = Array.from(options).find(opt=> opt.value === selectedCityText);
        selectedCity = JSON.parse(selectedOption.getAttribute("data-city-details"));
        console.log({ selectedCity });
        loadData();
    }
}

// after typing taking some time to give options
const debounceSearch = debounce((event) => onSearchChange(event));

document.addEventListener("DOMContentLoaded", async () => {
    loadForecasteUsingGeoLocation()
    const searchInput = document.querySelector("#search");
    searchInput.addEventListener("input", debounceSearch)
    searchInput.addEventListener("change", handleCitySelection);


})

/* const API_KEY ="73977eab1635173ee6fcbc53ea43222e";

const DAYS_OF_THE_WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const getCitiesUsingGeolocation = async (searchText) =>{
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${searchText}&limit=5&appid=${API_KEY}&units=metric`)
    return response.json();

}

const getCurrentWeatherData = async () => {
    const city= "pune";
    const response =  await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`);
    return response.json();
}

const getHourlyForecast = async ({ name: city }) => {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${API_KEY}&units=metric`);
    const data = await response.json();
    return data.list.map(forecast => {
        const { main: { temp, temp_max, temp_min}, dt, dt_txt, weather: [{ description, icon }] } = forecast;
        return { temp, temp_max, temp_min, dt, dt_txt, description, icon }
    })
}
const formatTemperature = (temp) => `${temp?.toFixed(1)}°`;
const createIconUrl = (icon) => `http://openweathermap.org/img/wn/${icon}@2x.png`;



const loadCurrentForecast = ({ name, main: {temp, temp_max, temp_min}, weather: [{ description }]}) => {
   const CurrentForecastElement = document.querySelector("#current-forecast");
   CurrentForecastElement.querySelector(".city").textContent = name;
   CurrentForecastElement.querySelector(".temp").textContent = formatTemperature(temp);
   CurrentForecastElement.querySelector(".description").textContent = description;
   CurrentForecastElement.querySelector(".min-max-temp").textContent = `H: ${formatTemperature(temp_max)} L:${formatTemperature(temp_min)}`;

 /* <h1>City name</h1>
    <p class="temp">Temp</p>
    <p class="description">Description</p>
    <p class="min-max-temp">High Low</p>

}
const loadHourlyforecast = ({main: {temp: tempNow}, weather:[{icon: iconNow}]}, hourlyForecast)=>{
    console.log(hourlyForecast);
    const timeformatter = Intl.DateTimeFormat("en", {
        hour12: true, hour: "numeric"
    })
    let dataFor12Hours = hourlyForecast.slice(2, 14);   // 12 entries
    const hourlyContainer = document.querySelector(".hourly-container");
    let innerHTMLString = `<article>
    <h3 class="time">Now</h3>
    <img class="icon" src="${createIconUrl(iconNow)}">
    <p class="hourly-temp">${formatTemperature(tempNow)}</p>
    </article>`;


    for(let {temp, icon, dt_txt} of dataFor12Hours){
        innerHTMLString += `<article>
        <h3 class="time">${timeformatter.format(new Date(dt_txt))}</h3>
        <img class="icon" src="${createIconUrl(icon)}">
        <p class="hourly-temp">${formatTemperature(temp)}</p>
        </article>`;
    }
    hourlyContainer.innerHTML = innerHTMLString;

}
const calculateDayWiseForecast = (hourlyForecast) => {
    let dayWiseForecast = new Map();
    for(let forecast of hourlyForecast){
        const [date] = forecast.dt_txt.split(" ");
        const dayOfTheWeek = DAYS_OF_THE_WEEK[new Date(date).getDay()];
        console.log(dayOfTheWeek);
        if(dayWiseForecast.has(dayOfTheWeek)){
            let forecastForTheDay = dayWiseForecast.get(dayOfTheWeek);
            forecastForTheDay.push(forecast);
            dayWiseForecast.set(dayOfTheWeek, forecastForTheDay);

        }else{
            dayWiseForecast.set(dayOfTheWeek, [forecast]);
        }

    }
    console.log(dayWiseForecast);
    for(let [key, value] of dayWiseForecast ){
        let temp_min = Math.min(...Array.from(value, val => val.temp_min));
        let temp_max = Math.max(...Array.from(value, val => val.temp_max));

        dayWiseForecast.set(key, {temp_min, temp_max, icon: value.find(v => v.icon).icon })
        

    }
    console.log(dayWiseForecast);
    return dayWiseForecast;


}
const loadFiveDayForecast = (hourlyForecast) => {
    console.log(hourlyForecast);
    const dayWiseForecast = calculateDayWiseForecast(hourlyForecast);
    const container = document.querySelector(".five-day-forecast-container");
    let dayWiseInfo = "";
Array.from(dayWiseForecast).map(([day, {temp_max, temp_min, icon}],index) => {
    if( index < 5) {
        dayWiseInfo += `<article class="day-wise-forecast">
        <h3 class = "day">${index === 0 ? "today" : day}</h3>
        <img class="icon" src="${createIconUrl(icon)}" alt="icon for the forecast"/>
        <p class="min-temp">${formatTemperature(temp_min)}</p>
        <p class="max-temp">${formatTemperature(temp_max)}</p>
      </article>`;
    }
});
   container.innerHTML = dayWiseInfo;
}
const loadFeelsLike = ({main : {feels_like}}) => {
    const container = document.querySelector("#feels-like");
    container.querySelector(".feels-like-temp").textContent = formatTemperature(feels_like);
}
const loadHumidity = ({main : {humidity}}) => {
    const container = document.querySelector("#humidity");
    container.querySelector(".humidity-value").textContent = `${humidity}%`;
}

const onSearchChange = (event) => {
    let {value} = event.target;
    getCitiesUsingGeolocation(value);  
}



document.addEventListener("DOMContentLoaded", async () => {
    
    
     const searchInput = document.querySelector("#search");
     searchInput.addEventListener("input", )

    const CurrentWeather = await getCurrentWeatherData();
    loadCurrentForecast(CurrentWeather)
    const hourlyForecast = await getHourlyForecast(CurrentWeather);
    loadHourlyforecast(CurrentWeather, hourlyForecast);
    loadFiveDayForecast(hourlyForecast);
    loadFeelsLike(CurrentWeather);
   loadHumidity(CurrentWeather);

})*/