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

# Check if Docker Compose is installed (try both old and new commands)
DOCKER_COMPOSE_CMD=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    echo "Error: Docker Compose is not installed."
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Using: $DOCKER_COMPOSE_CMD"

# Check if we need sudo
SUDO=""
if ! docker ps &> /dev/null; then
    echo "Docker requires sudo permissions. You may be prompted for your password."
    SUDO="sudo"
fi

# Create data directories if they don't exist
echo "Creating data directories..."
mkdir -p data uploads

# Stop any existing containers
echo "Stopping existing containers..."
$SUDO $DOCKER_COMPOSE_CMD down

# Build and start the container
echo "Building and starting the inventory system..."
$SUDO $DOCKER_COMPOSE_CMD up -d --build

# Wait for the container to be ready
echo "Waiting for the system to start..."
sleep 3

# Check if the container is running
if [ "$($SUDO $DOCKER_COMPOSE_CMD ps -q)" ]; then
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
    echo "  $SUDO $DOCKER_COMPOSE_CMD logs -f"
    echo ""
    echo "To stop the system:"
    echo "  $SUDO $DOCKER_COMPOSE_CMD down"
    echo ""
else
    echo ""
    echo "Error: Failed to start the container."
    echo "Check logs with: $SUDO $DOCKER_COMPOSE_CMD logs"
    exit 1
fi
