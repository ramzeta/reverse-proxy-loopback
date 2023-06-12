const http = require('http');
const httpProxy = require('http-proxy');
const LRU = require('lru-cache');

const cache = new LRU({
  max: 500, // Máximo número de elementos en la caché
  maxAge: 60 * 1000, // Tiempo de vida máximo de cada elemento en milisegundos
});

// Configura las opciones del proxy
const proxyOptions = {
  target: 'http://localhost:3000', // El servidor de destino al que se redirigirán las solicitudes
  changeOrigin: true // Cambia el encabezado del origen de la solicitud
};

// Crea un servidor proxy HTTP
const proxy = httpProxy.createProxyServer(proxyOptions);

// Crea un servidor HTTP para recibir las solicitudes
const server = http.createServer((req, res) => {
  const cacheKey = req.url;

  if (cache.has(cacheKey)) {
    // Utilizar la respuesta almacenada en caché
    const cachedResponse = cache.get(cacheKey);
    res.writeHead(cachedResponse.statusCode, cachedResponse.headers);
    res.end(cachedResponse.body);
  } else {
    // Obtener la respuesta del servidor y almacenarla en caché
    fetchResponseFromServer(req, res)
      .then((response) => {
        cache.set(cacheKey, response);
        res.writeHead(response.statusCode, response.headers);
        res.end(response.body);
      })
      .catch((error) => {
        res.statusCode = 500;
        res.end('Internal Server Error');
      });
  }
  // Redirige la solicitud al servidor de destino
  proxy.web(req, res);
});

// Maneja los errores del proxy
proxy.on('error', (err, req, res) => {
  console.error('Error en el proxy:', err);
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end('Hubo un error en el proxy');
});

// Inicia el servidor en el puerto 8080
server.listen(8080, () => {
  console.log('Servidor de reverse proxy escuchando en el puerto http://127.0.0.1:8080');
});
