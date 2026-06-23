FROM mcr.microsoft.com/playwright:v1.61.0-noble

WORKDIR /e2e

# Copy package files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy test files
COPY . .

# Default command
CMD ["npx", "playwright", "test"]
