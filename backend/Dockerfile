FROM node:20.19

# Instalar iputils-ping para permitir chequeos de red ICMP
RUN apt-get update && apt-get install -y iputils-ping && rm -rf /var/lib/apt/lists/*

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

# Comando para arrancar en modo desarrollo (nodemon con legacy-watch)
CMD ["npm", "run", "dev"]