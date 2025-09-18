/**
 * Weather Dashboard JavaScript
 * Dataconecta Consultora - Weather API Integration
 * 
 * CONFIGURACIÓN REQUERIDA:
 * 1. Obtén una API key gratuita de OpenWeatherMap: https://openweathermap.org/api
 * 2. Reemplaza 'YOUR_API_KEY_HERE' con tu clave API real
 * 3. Para pruebas locales, puedes usar datos simulados cambiando USE_MOCK_DATA a true
 * 
 * INSTALACIÓN LOCAL:
 * 1. Clona el repositorio
 * 2. Abre weather.html en tu navegador
 * 3. Configura tu API key como se indica arriba
 * 4. ¡Disfruta del dashboard del clima!
 */

// CONFIGURACIÓN DE LA API
// ⚠️ IMPORTANTE: Reemplaza 'YOUR_API_KEY_HERE' con tu API key real de OpenWeatherMap
const API_KEY = 'YOUR_API_KEY_HERE';
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Configuración para pruebas (cambiar a false para usar API real)
const USE_MOCK_DATA = true;

// Elementos del DOM
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const weatherResults = document.getElementById('weatherResults');
const errorMessage = document.getElementById('errorMessage');
const loadingMessage = document.getElementById('loadingMessage');

// Elementos de información meteorológica
const cityName = document.getElementById('cityName');
const currentDate = document.getElementById('currentDate');
const weatherIcon = document.getElementById('weatherIcon');
const temperature = document.getElementById('temperature');
const weatherDescription = document.getElementById('weatherDescription');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const visibility = document.getElementById('visibility');
const sunrise = document.getElementById('sunrise');
const sunset = document.getElementById('sunset');
const errorText = document.getElementById('errorText');

/**
 * Datos simulados para pruebas locales
 * Estos datos se usan cuando USE_MOCK_DATA = true
 */
const mockWeatherData = {
  name: "Madrid",
  sys: {
    country: "ES",
    sunrise: 1704179400,
    sunset: 1704212400
  },
  main: {
    temp: 18.5,
    feels_like: 17.2,
    humidity: 65,
    pressure: 1013
  },
  weather: [{
    main: "Clear",
    description: "cielo despejado",
    icon: "01d"
  }],
  wind: {
    speed: 3.2
  },
  visibility: 10000,
  coord: {
    lat: 40.4168,
    lon: -3.7038
  }
};

/**
 * Inicialización del dashboard
 */
document.addEventListener('DOMContentLoaded', function() {
  // Event listeners
  searchBtn.addEventListener('click', handleSearch);
  cityInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });

  // Mostrar fecha actual
  updateCurrentDate();

  // Verificar configuración de API
  checkApiConfiguration();
});

/**
 * Verifica si la API está configurada correctamente
 */
function checkApiConfiguration() {
  if (!USE_MOCK_DATA && API_KEY === 'YOUR_API_KEY_HERE') {
    showError(
      'API no configurada',
      'Por favor, configura tu API key de OpenWeatherMap en el archivo weather.js. ' +
      'Puedes obtener una clave gratuita en https://openweathermap.org/api'
    );
  }
}

/**
 * Maneja la búsqueda de clima
 */
async function handleSearch() {
  const city = cityInput.value.trim();
  
  if (!city) {
    showError('Ciudad requerida', 'Por favor, ingresa el nombre de una ciudad.');
    return;
  }

  // Mostrar estado de carga
  showLoading();

  try {
    let weatherData;
    
    if (USE_MOCK_DATA) {
      // Usar datos simulados para demo
      weatherData = await getMockWeatherData(city);
    } else {
      // Usar API real
      weatherData = await getWeatherData(city);
    }
    
    displayWeatherData(weatherData);
  } catch (error) {
    console.error('Error al obtener datos del clima:', error);
    handleWeatherError(error);
  }
}

/**
 * Obtiene datos del clima de la API real
 */
async function getWeatherData(city) {
  const url = `${API_BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=es`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('CITY_NOT_FOUND');
    } else if (response.status === 401) {
      throw new Error('INVALID_API_KEY');
    } else {
      throw new Error('NETWORK_ERROR');
    }
  }
  
  return await response.json();
}

/**
 * Simula la obtención de datos del clima (para demo)
 */
async function getMockWeatherData(city) {
  // Simular delay de red
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simular diferentes respuestas según la ciudad
  const variations = {
    'madrid': { temp: 18.5, description: 'cielo despejado', icon: '01d' },
    'barcelona': { temp: 22.1, description: 'parcialmente nublado', icon: '02d' },
    'londres': { temp: 8.3, description: 'lluvia ligera', icon: '10d' },
    'paris': { temp: 12.7, description: 'nublado', icon: '03d' },
    'nueva york': { temp: 15.9, description: 'despejado', icon: '01d' },
    'tokyo': { temp: 19.4, description: 'niebla', icon: '50d' }
  };
  
  const cityLower = city.toLowerCase();
  const variation = variations[cityLower] || variations['madrid'];
  
  // Crear datos simulados basados en la ciudad
  return {
    ...mockWeatherData,
    name: city.charAt(0).toUpperCase() + city.slice(1),
    main: {
      ...mockWeatherData.main,
      temp: variation.temp,
      feels_like: variation.temp - 1.5
    },
    weather: [{
      ...mockWeatherData.weather[0],
      description: variation.description,
      icon: variation.icon
    }]
  };
}

/**
 * Muestra los datos del clima en la interfaz
 */
function displayWeatherData(data) {
  hideAllMessages();
  
  // Información principal
  cityName.textContent = `${data.name}, ${data.sys.country}`;
  temperature.textContent = `${Math.round(data.main.temp)}°C`;
  weatherDescription.textContent = data.weather[0].description;
  feelsLike.textContent = `Sensación térmica: ${Math.round(data.main.feels_like)}°C`;
  
  // Icono del clima
  const iconCode = data.weather[0].icon;
  weatherIcon.innerHTML = getWeatherIcon(iconCode);
  
  // Detalles meteorológicos
  humidity.textContent = `${data.main.humidity}%`;
  windSpeed.textContent = `${data.wind.speed} m/s`;
  pressure.textContent = `${data.main.pressure} hPa`;
  visibility.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  
  // Información solar
  sunrise.textContent = formatTime(data.sys.sunrise);
  sunset.textContent = formatTime(data.sys.sunset);
  
  // Mostrar resultados
  weatherResults.classList.remove('d-none');
}

/**
 * Obtiene el icono del clima correspondiente
 */
function getWeatherIcon(iconCode) {
  const iconMap = {
    '01d': '<i class="bi bi-sun-fill text-warning fs-1"></i>',
    '01n': '<i class="bi bi-moon-stars-fill text-primary fs-1"></i>',
    '02d': '<i class="bi bi-cloud-sun-fill text-warning fs-1"></i>',
    '02n': '<i class="bi bi-cloud-moon-fill text-primary fs-1"></i>',
    '03d': '<i class="bi bi-cloud-fill text-secondary fs-1"></i>',
    '03n': '<i class="bi bi-cloud-fill text-secondary fs-1"></i>',
    '04d': '<i class="bi bi-clouds-fill text-secondary fs-1"></i>',
    '04n': '<i class="bi bi-clouds-fill text-secondary fs-1"></i>',
    '09d': '<i class="bi bi-cloud-drizzle-fill text-info fs-1"></i>',
    '09n': '<i class="bi bi-cloud-drizzle-fill text-info fs-1"></i>',
    '10d': '<i class="bi bi-cloud-rain-fill text-primary fs-1"></i>',
    '10n': '<i class="bi bi-cloud-rain-fill text-primary fs-1"></i>',
    '11d': '<i class="bi bi-cloud-lightning-fill text-warning fs-1"></i>',
    '11n': '<i class="bi bi-cloud-lightning-fill text-warning fs-1"></i>',
    '13d': '<i class="bi bi-cloud-snow-fill text-info fs-1"></i>',
    '13n': '<i class="bi bi-cloud-snow-fill text-info fs-1"></i>',
    '50d': '<i class="bi bi-cloud-haze-fill text-secondary fs-1"></i>',
    '50n': '<i class="bi bi-cloud-haze-fill text-secondary fs-1"></i>'
  };
  
  return iconMap[iconCode] || '<i class="bi bi-question-circle-fill text-muted fs-1"></i>';
}

/**
 * Formatea timestamp Unix a hora legible
 */
function formatTime(timestamp) {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid' // Ajustar según la zona horaria deseada
  });
}

/**
 * Actualiza la fecha actual en la interfaz
 */
function updateCurrentDate() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  currentDate.textContent = now.toLocaleDateString('es-ES', options);
}

/**
 * Maneja errores de la API del clima
 */
function handleWeatherError(error) {
  let title = 'Error de conexión';
  let message = 'No se pudo conectar con el servicio de clima. Verifica tu conexión a internet e inténtalo de nuevo.';
  
  switch (error.message) {
    case 'CITY_NOT_FOUND':
      title = 'Ciudad no encontrada';
      message = 'No se encontró la ciudad especificada. Verifica el nombre e intenta incluyendo el país (ej: "Madrid, España").';
      break;
    case 'INVALID_API_KEY':
      title = 'API Key inválida';
      message = 'La clave de API no es válida. Verifica tu configuración en weather.js.';
      break;
    case 'NETWORK_ERROR':
      title = 'Error de red';
      message = 'Hubo un problema al conectar con el servidor. Inténtalo de nuevo en unos momentos.';
      break;
  }
  
  showError(title, message);
}

/**
 * Muestra un mensaje de error
 */
function showError(title, message) {
  hideAllMessages();
  errorText.innerHTML = `<strong>${title}:</strong> ${message}`;
  errorMessage.classList.remove('d-none');
}

/**
 * Muestra el estado de carga
 */
function showLoading() {
  hideAllMessages();
  loadingMessage.classList.remove('d-none');
}

/**
 * Oculta todos los mensajes de estado
 */
function hideAllMessages() {
  weatherResults.classList.add('d-none');
  errorMessage.classList.add('d-none');
  loadingMessage.classList.add('d-none');
}

/**
 * Utilidades adicionales para mejorar la experiencia del usuario
 */

// Autocompletar ciudades populares (opcional)
const popularCities = [
  'Madrid, España',
  'Barcelona, España',
  'Valencia, España',
  'Sevilla, España',
  'Bilbao, España',
  'Londres, Reino Unido',
  'París, Francia',
  'Roma, Italia',
  'Berlín, Alemania',
  'Nueva York, Estados Unidos',
  'Los Ángeles, Estados Unidos',
  'Buenos Aires, Argentina',
  'Ciudad de México, México',
  'São Paulo, Brasil',
  'Tokyo, Japón'
];

// Función para inicializar autocompletar (se puede expandir)
function initializeAutocomplete() {
  // Esta función se puede expandir para incluir autocompletar
  // usando bibliotecas como Awesomplete o implementación personalizada
  cityInput.addEventListener('focus', function() {
    this.placeholder = '¿Buscas Madrid, Londres, Nueva York...?';
  });
  
  cityInput.addEventListener('blur', function() {
    this.placeholder = 'Ingresa el nombre de una ciudad (ej: Madrid, Londres, Buenos Aires)';
  });
}

// Inicializar características adicionales
document.addEventListener('DOMContentLoaded', function() {
  initializeAutocomplete();
});

// Detectar ubicación del usuario (opcional - requiere HTTPS)
function getCurrentLocationWeather() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      async function(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        try {
          showLoading();
          let weatherData;
          
          if (USE_MOCK_DATA) {
            weatherData = await getMockWeatherData('Tu ubicación');
          } else {
            const url = `${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=es`;
            const response = await fetch(url);
            
            if (!response.ok) {
              throw new Error('NETWORK_ERROR');
            }
            
            weatherData = await response.json();
          }
          
          displayWeatherData(weatherData);
        } catch (error) {
          handleWeatherError(error);
        }
      },
      function(error) {
        showError(
          'Error de ubicación',
          'No se pudo obtener tu ubicación. Busca una ciudad manualmente.'
        );
      }
    );
  }
}

// Exportar funciones para uso externo si es necesario
window.WeatherDashboard = {
  search: handleSearch,
  getCurrentLocation: getCurrentLocationWeather,
  setApiKey: function(key) {
    API_KEY = key;
  }
};