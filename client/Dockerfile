# client/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Clean install inside the container (Linux binaries)
RUN npm install

COPY . .

EXPOSE 5173

# --host binds to 0.0.0.0 so nginx can reach it inside Docker network
CMD ["npm", "run", "dev", "--", "--host"]
