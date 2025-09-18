# Weather Dashboard - Dataconecta

## Descripción

Dashboard meteorológico en tiempo real integrado al sitio web de Dataconecta. Permite consultar información del clima de cualquier ciudad del mundo utilizando la API de OpenWeatherMap.

## Características

- ✅ **Diseño glassmorphism** integrado con el sistema de diseño existente
- ✅ **Responsive design** para desktop y mobile
- ✅ **Búsqueda por ciudad** con soporte internacional
- ✅ **Datos en tiempo real** de temperatura, humedad, viento y presión
- ✅ **Información solar** (amanecer y atardecer)
- ✅ **Manejo de errores** para ciudades inexistentes y errores de red
- ✅ **Modo demo** con datos simulados para pruebas locales
- ✅ **Iconos meteorológicos** dinámicos
- ✅ **Interfaz en español** completamente localizada

## Tecnologías Utilizadas

- **JavaScript Vanilla** - Sin dependencias externas
- **Bootstrap 5** - Framework CSS
- **OpenWeatherMap API** - Datos meteorológicos
- **Glassmorphism CSS** - Efectos visuales modernos
- **Bootstrap Icons** - Iconografía

## Configuración

### 1. Obtener API Key

1. Visita [OpenWeatherMap](https://openweathermap.org/api)
2. Crea una cuenta gratuita
3. Obtén tu API key desde el panel de control

### 2. Configurar la Aplicación

Edita el archivo `assets/js/weather.js`:

```javascript
// Reemplaza 'YOUR_API_KEY_HERE' con tu API key real
const API_KEY = 'tu_api_key_aqui';

// Para pruebas locales, cambia a false para usar la API real
const USE_MOCK_DATA = false;
```

### 3. Configuración para Desarrollo Local

```bash
# Clona el repositorio
git clone https://github.com/dsd228/Dataconecta.git

# Navega al directorio
cd Dataconecta

# Inicia un servidor local (ejemplo con Python)
python3 -m http.server 8080

# O con Node.js
npx serve .

# Abre en el navegador
# http://localhost:8080/weather.html
```

## Estructura de Archivos

```
Dataconecta/
├── weather.html              # Página principal del dashboard
├── assets/
│   ├── js/
│   │   └── weather.js        # Lógica del dashboard
│   └── css/
│       └── styles.css        # Estilos (incluye weather styles)
└── README-WEATHER.md         # Esta documentación
```

## Uso

1. **Acceder al Dashboard**: Visita `/weather.html` o usa el enlace "Clima" en la navegación
2. **Buscar Ciudad**: Ingresa el nombre de una ciudad en el campo de búsqueda
3. **Ver Resultados**: Los datos meteorológicos se mostrarán automáticamente
4. **Información Mostrada**:
   - Temperatura actual y sensación térmica
   - Descripción del clima con icono
   - Humedad, velocidad del viento, presión atmosférica
   - Visibilidad
   - Horarios de amanecer y atardecer

## Ejemplos de Búsqueda

```
Madrid
Barcelona, España
London, UK
New York, USA
Tokyo, Japan
Buenos Aires, Argentina
```

## Modo Demo

Para facilitar las pruebas locales, el dashboard incluye un modo demo con datos simulados:

- **Activar**: `USE_MOCK_DATA = true` en `weather.js`
- **Datos incluidos**: Información meteorológica de muestra
- **Ciudades soportadas**: Madrid, Barcelona, Londres, París, Nueva York, Tokyo
- **Funcionalidad**: Simula respuestas de la API sin necesidad de conexión

## Manejo de Errores

El dashboard maneja automáticamente los siguientes escenarios:

| Error | Descripción | Solución |
|-------|-------------|----------|
| **Ciudad no encontrada** | La ciudad especificada no existe | Verificar ortografía, incluir país |
| **API Key inválida** | Clave de API incorrecta o expirada | Verificar configuración en `weather.js` |
| **Error de red** | Problemas de conectividad | Verificar conexión a internet |
| **Límite de API** | Exceso de solicitudes (plan gratuito) | Esperar o actualizar plan |

## Personalización

### Cambiar Idioma

Modifica las etiquetas en `weather.html` y `weather.js`:

```javascript
// Ejemplo: cambiar a inglés
const weatherLabels = {
  humidity: 'Humidity',
  wind: 'Wind',
  pressure: 'Pressure',
  visibility: 'Visibility'
};
```

### Agregar Más Datos

El dashboard puede expandirse para mostrar:

- Pronóstico de 5 días
- Gráficos de temperatura
- Alertas meteorológicas
- Calidad del aire
- Radiación UV

### Personalizar Estilos

Los estilos específicos del clima están en `assets/css/styles.css`:

```css
/* Weather Dashboard Specific Styles */
.weather-card { /* ... */ }
.weather-temp-display { /* ... */ }
.weather-detail-item { /* ... */ }
```

## Responsive Design

El dashboard está optimizado para:

- **Desktop**: Vista completa con layout de dos columnas
- **Tablet**: Diseño adaptativo con elementos reorganizados
- **Mobile**: Vista de una columna, botones y textos optimizados

### Breakpoints

```css
@media (max-width: 991px) { /* Tablet */ }
@media (max-width: 767px) { /* Mobile */ }
```

## Seguridad

### Content Security Policy

El dashboard incluye CSP configurado para:

```html
<meta http-equiv="Content-Security-Policy" content="
  connect-src 'self' https://api.openweathermap.org;
  img-src 'self' data: https://openweathermap.org;
">
```

### Buenas Prácticas

- ✅ API key configurada como variable (no hardcodeada)
- ✅ Validación de entrada del usuario
- ✅ Sanitización de datos de la API
- ✅ Manejo seguro de errores
- ✅ CSP restrictivo para prevenir XSS

## Performance

### Optimizaciones Implementadas

- **Lazy loading** de datos meteorológicos
- **Debouncing** en búsquedas (si se implementa autocompletar)
- **Cache local** de búsquedas recientes (opcional)
- **Compresión** de imágenes de iconos
- **Minificación** de CSS y JS (para producción)

### Métricas Esperadas

- **First Paint**: < 1.5s
- **Time to Interactive**: < 3s
- **Bundle Size**: < 50KB (sin Bootstrap)

## Troubleshooting

### Problemas Comunes

**El dashboard no carga datos:**
1. Verificar que `USE_MOCK_DATA = false`
2. Confirmar que la API key es válida
3. Revisar consola del navegador para errores

**Error CORS:**
- Asegurar que el sitio se ejecuta en un servidor HTTP (no file://)
- Verificar configuración de CSP

**Datos incorrectos:**
- Verificar formato de la búsqueda
- Incluir país para mayor precisión
- Revisar límites de la API

## Contribuir

Para contribuir al desarrollo del dashboard:

1. Fork el repositorio
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit los cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## Licencia

Este proyecto es parte de Dataconecta Consultora © 2025. Todos los derechos reservados.

## Contacto

- **Email**: contacto@dataconecta.com
- **Teléfono**: +34 900 123 456
- **Web**: [Dataconecta](https://dataconecta.com)

---

*Documentación actualizada: Septiembre 2025*