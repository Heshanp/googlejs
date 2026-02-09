FROM golang:1.23-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN go build -o bin/api cmd/api/main.go

# Expose port
EXPOSE 8080

# Run the application
CMD ["./bin/api"]
