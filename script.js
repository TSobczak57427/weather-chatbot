const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");
const typingIndicator = document.getElementById("typing-indicator");
const themeToggle = document.getElementById("theme-toggle");
const OPENWEATHER_API_KEY = "";

const STORAGE_KEY = "weatherChatHistory";

const welcomeMessage = 
    "Cześć! Opisz pogodę, np. „Jest 7 stopni i pada deszcz”, a doradzę Ci odpowiedni ubiór.";

document.addEventListener("DOMContentLoaded", () => {
    loadTheme();
    loadChatHistory();

    if (chatBox.children.length === 0) {
        addMessage(welcomeMessage, "bot-message");
    }
});

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage();
});

themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light");

    const isLightMode = document.body.classList.contains("light");
    localStorage.setItem("theme", isLightMode ? "light" : "dark");
    themeToggle.textContent = isLightMode ? "☀️" : "🌙";
});

async function sendMessage() {
    const text = userInput.value.trim();

    if (text === "") {
        return;
    }

    addMessage(text, "user-message");
    userInput.value = "";

    showTyping();

    setTimeout(async () => {
        const response = await generateBotResponse(text);
        hideTyping();
        addTypingMessage(response, "bot-message");
    }, 700);
}

function addMessage(message, sender) {
    const messageElement = document.createElement("div");

    messageElement.classList.add("message", sender);
    messageElement.innerText = message;

    chatBox.appendChild(messageElement);
    scrollToBottom();
    saveChatHistory();
}

function addTypingMessage(message, sender) {
    const messageElement = document.createElement("div");

    messageElement.classList.add("message", sender);
    chatBox.appendChild(messageElement);

    let index = 0;

    const typingSpeed = 10;

    const typingInterval = setInterval(() => {
        messageElement.innerText += message.charAt(index);
        index++;

        scrollToBottom();

        if (index >= message.length) {
            clearInterval(typingInterval);
            saveChatHistory();
        }
    }, typingSpeed);
}

async function generateBotResponse(userText) {
    const text = normalizeText(userText);

    if (isWeatherApiRequest(text)) {
        const city = extractCityName(userText);

        if (!city) {
            return "Podaj nazwę miasta, np. „pogoda Bydgoszcz” albo „sprawdź pogodę Warszawa”.";
        }

        return await getWeatherRecommendationByCity(city);
    }

    const temperature = extractTemperature(text);
    const weather = analyzeWeather(text);
    const temperatureCategory = analyzeTemperature(temperature, text);
    const style = analyzeStyle(text);

    return buildRecommendation(temperatureCategory, weather, style, temperature);
}

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(",", ".")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function extractTemperature(text) {
    const match = text.match(/-?\d+/);

    if (match) {
        return parseInt(match[0]);
    }

    return null;
}

function analyzeWeather(text) {
    if (
        text.includes("deszcz") ||
        text.includes("pada") ||
        text.includes("ulewa") ||
        text.includes("mzy") ||
        text.includes("mż")
    ) {
        return "rain";
    }

    if (
        text.includes("snieg") ||
        text.includes("śnieg") ||
        text.includes("mroz") ||
        text.includes("lód") ||
        text.includes("lod")
    ) {
        return "snow";
    }

    if (
        text.includes("wiatr") ||
        text.includes("wietrznie") ||
        text.includes("wichura")
    ) {
        return "wind";
    }

    if (
        text.includes("slonce") ||
        text.includes("słońce") ||
        text.includes("upal") ||
        text.includes("goraco") ||
        text.includes("gorąco")
    ) {
        return "sun";
    }

    return "unknown";
}

function analyzeTemperature(temperature, text) {
    if (temperature !== null) {
        switch (true) {
            case temperature <= 0:
                return "freezing";

            case temperature > 0 && temperature < 10:
                return "cold";

            case temperature >= 10 && temperature < 18:
                return "cool";

            case temperature >= 18 && temperature < 25:
                return "warm";

            case temperature >= 25:
                return "hot";

            default:
                return "unknown";
        }
    }

    if (
        text.includes("zimno") ||
        text.includes("chlodno") ||
        text.includes("chłodno")
    ) {
        return "cold";
    }

    if (
        text.includes("cieplo") ||
        text.includes("ciepło")
    ) {
        return "warm";
    }

    if (
        text.includes("goraco") ||
        text.includes("gorąco") ||
        text.includes("upal")
    ) {
        return "hot";
    }

    return "unknown";
}

function analyzeStyle(text) {
    if (
        text.includes("elegancko") ||
        text.includes("praca") ||
        text.includes("biuro") ||
        text.includes("spotkanie")
    ) {
        return "elegant";
    }

    if (
        text.includes("sport") ||
        text.includes("spacer") ||
        text.includes("rower") ||
        text.includes("bieganie")
    ) {
        return "sport";
    }

    return "casual";
}

function buildRecommendation(temperatureCategory, weather, style, temperature) {
    let clothes = "";
    let accessories = "";
    let protection = "";
    let styleAdvice = "";

    switch (temperatureCategory) {
        case "freezing":
            clothes = "Załóż bardzo ciepłą kurtkę zimową, sweter, długie spodnie i ocieplane buty.";
            accessories = "Przydadzą się czapka, szalik i rękawiczki.";
            break;

        case "cold":
            clothes = "Załóż ciepłą kurtkę, bluzę lub sweter oraz długie spodnie.";
            accessories = "Dobrym dodatkiem będzie cienka czapka albo komin.";
            break;

        case "cool":
            clothes = "Wybierz lekką kurtkę, bluzę lub kardigan. Ubiór warstwowy będzie najlepszy.";
            accessories = "Możesz zabrać cienki szalik lub lekką czapkę.";
            break;

        case "warm":
            clothes = "Wystarczy lekka koszulka, cienka bluza albo koszula oraz wygodne spodnie.";
            accessories = "Okulary przeciwsłoneczne mogą się przydać.";
            break;

        case "hot":
            clothes = "Załóż przewiewne ubrania, np. koszulkę, krótkie spodenki lub lekką sukienkę.";
            accessories = "Zabierz wodę, okulary przeciwsłoneczne i nakrycie głowy.";
            break;

        default:
            clothes = "Nie podałeś konkretnej temperatury, więc najlepiej ubierz się warstwowo.";
            accessories = "Zabierz coś, co łatwo założyć lub zdjąć, np. bluzę.";
    }

    if (weather === "rain") {
        protection = "Ponieważ pada deszcz, zabierz parasol lub załóż kurtkę przeciwdeszczową i wodoodporne buty.";
    } else if (weather === "snow") {
        protection = "Przy śniegu wybierz buty z dobrą przyczepnością i ciepłą, nieprzemakalną kurtkę.";
    } else if (weather === "wind") {
        protection = "Przy silnym wietrze najlepiej sprawdzi się kurtka typu windbreaker.";
    } else if (weather === "sun") {
        protection = "Przy słońcu pamiętaj o okularach przeciwsłonecznych i ochronie głowy.";
    } else {
        protection = "Jeśli pogoda jest niepewna, sprawdź prognozę przed wyjściem.";
    }

    if (style === "elegant") {
        styleAdvice = "Styl: wybierz wersję bardziej elegancką, np. płaszcz, koszulę, chinosy lub eleganckie buty.";
    } else if (style === "sport") {
        styleAdvice = "Styl: postaw na wygodny, sportowy ubiór i oddychające materiały.";
    } else {
        styleAdvice = "Styl: casualowy zestaw będzie odpowiedni na co dzień.";
    }

    const temperatureInfo = temperature !== null 
        ? `Temperatura: ${temperature}°C.`
        : "Nie wykryłem dokładnej temperatury.";

    return `${temperatureInfo}\n\n${clothes}\n\n${protection}\n\n${accessories}\n\n${styleAdvice}`;
}

function showTyping() {
    typingIndicator.classList.remove("hidden");
}

function hideTyping() {
    typingIndicator.classList.add("hidden");
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function saveChatHistory() {
    const messages = [];

    document.querySelectorAll(".message").forEach((message) => {
        messages.push({
            text: message.innerText,
            sender: message.classList.contains("user-message") 
                ? "user-message" 
                : "bot-message"
        });
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function loadChatHistory() {
    const savedMessages = localStorage.getItem(STORAGE_KEY);

    if (!savedMessages) {
        return;
    }

    const messages = JSON.parse(savedMessages);

    messages.forEach((message) => {
        const messageElement = document.createElement("div");

        messageElement.classList.add("message", message.sender);
        messageElement.innerText = message.text;

        chatBox.appendChild(messageElement);
    });

    scrollToBottom();
}

function loadTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
        document.body.classList.add("light");
        themeToggle.textContent = "☀️";
    }
}

function isWeatherApiRequest(text) {
    return (
        text.startsWith("pogoda ") ||
        text.startsWith("sprawdz pogode ") ||
        text.startsWith("sprawdź pogode ") ||
        text.startsWith("sprawdź pogodę ") ||
        text.startsWith("jaka pogoda ") ||
        text.startsWith("jaka jest pogoda ")
    );
}

function extractCityName(originalText) {
    return originalText
        .replace(/pogoda/i, "")
        .replace(/sprawdź pogodę/i, "")
        .replace(/sprawdz pogode/i, "")
        .replace(/jaka jest pogoda/i, "")
        .replace(/jaka pogoda/i, "")
        .trim();
}

async function getWeatherRecommendationByCity(city) {
    if (!OPENWEATHER_API_KEY) {
    return "Brak klucza API OpenWeather. W projekcie demonstracyjnym klucz należy uzupełnić lokalnie w pliku script.js.";
}

    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=pl`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!response.ok) {
            if (data.cod === "404" || data.cod === 404) {
                return `Nie znalazłem miasta „${city}”. Sprawdź pisownię i spróbuj ponownie.`;
            }

            if (data.cod === 401 || data.cod === "401") {
                return "Klucz API jest niepoprawny albo jeszcze nieaktywny. Sprawdź API key w OpenWeather.";
            }

            return "Nie udało się pobrać pogody. Spróbuj ponownie później.";
        }

        const temperature = Math.round(data.main.temp);
        const feelsLike = Math.round(data.main.feels_like);
        const description = data.weather[0].description;
        const windSpeed = data.wind.speed;
        const cityName = data.name;

        const artificialUserText = `Jest ${temperature} stopni i ${description}`;
        const normalizedText = normalizeText(artificialUserText);

        const weather = analyzeWeather(normalizedText);
        const temperatureCategory = analyzeTemperature(temperature, normalizedText);
        const style = "casual";

        const recommendation = buildRecommendation(
            temperatureCategory,
            weather,
            style,
            temperature
        );

        return `Aktualna pogoda dla miasta ${cityName}: ${temperature}°C, odczuwalna ${feelsLike}°C, ${description}. Wiatr: ${windSpeed} m/s.\n\n${recommendation}`;

    } catch (error) {
        return "Wystąpił problem z połączeniem z API pogodowym. Sprawdź internet albo spróbuj ponownie później.";
    }
}