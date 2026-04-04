# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Archivos de configuración
COPY package*.json ./

# Dependencias (si hubiese exceljs o csv plugins)
RUN npm install

# Copiamos todo el código fuente y origen de datos
COPY . .

# Construimos los archivos `.html` dinámicos
RUN node builder.js

# Serve Stage
FROM nginx:alpine

# Copiamos la carpeta /dist autogenerada a la carpeta pública de nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
