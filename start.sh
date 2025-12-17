#!/bin/bash

# Subaru Inventory System - Startup Script

echo "=================================="
echo "Subaru Parts Inventory System"
echo "Alia Fabrication and Design"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed."
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create data directories if they don't exist
echo "Creating data directories..."
mkdir -p data uploads

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start the container
echo "Building and starting the inventory system..."
docker-compose up -d --build

# Wait for the container to be ready
echo "Waiting for the system to start..."
sleep 3

# Check if the container is running
if [ "$(docker-compose ps -q)" ]; then
    echo ""
    echo "=================================="
    echo "✓ System is running!"
    echo "=================================="
    echo ""
    echo "Access the inventory system at:"
    echo "  Local:   http://localhost:3000"
    
    # Try to get the local IP address
    if command -v hostname &> /dev/null; then
        IP=$(hostname -I | awk '{print $1}')
        if [ ! -z "$IP" ]; then
            echo "  Network: http://$IP:3000"
        fi
    fi
    
    echo ""
    echo "To view logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "To stop the system:"
    echo "  docker-compose down"
    echo ""
else
    echo ""
    echo "Error: Failed to start the container."
    echo "Check logs with: docker-compose logs"
    exit 1
fi
