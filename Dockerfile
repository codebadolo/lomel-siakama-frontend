FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

# --host pour accepter les connexions depuis l'extérieur du container
CMD ["npx", "vite", "--host", "0.0.0.0"]
