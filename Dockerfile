# Use the official Node.js LTS image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy package files first
COPY src/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY src/ .

# Expose the application's port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]