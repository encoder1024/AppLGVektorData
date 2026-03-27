FROM node:20.19
# Seteamos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos primero los archivos de dependencias para aprovechar el cache de Docker
COPY package*.json ./

# Instalamos las librerías (express, pg, cors, etc.)
RUN npm install

# Copiamos el resto del código del backend
COPY . .

# Exponemos el puerto donde correrá tu API
EXPOSE 3000

# Comando para arrancar en modo desarrollo (usando --watch si tenés Node 18+)
CMD ["node", "--watch", "src/server.js"]