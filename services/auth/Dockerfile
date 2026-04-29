# Use Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all source code
COPY . .

# Expose the port (must match your .env PORT)
EXPOSE 5001

# Start the service
CMD ["npm", "start"]
