#!/bin/bash

# Exit on error
set -e

echo "====== Setting up AML Platform ======"

# Create project structure
echo "Creating project structure..."
bash setup-script.sh
cd aml-platform

# Create virtual environment if Python 3.10 is available
if command -v python3.10 &> /dev/null
then
    echo "Creating Python 3.10 virtual environment..."
    python3.10 -m venv venv
    source venv/bin/activate
else
    # Fall back to system Python if 3.10 is not available
    echo "Python 3.10 not found, using system Python..."
    python3 -m venv venv
    source venv/bin/activate
fi

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

echo "====== Setup Complete ======"
echo "To start the AML Platform:"
echo "cd aml-platform"
echo "source venv/bin/activate"
echo "uvicorn app.main:app --reload"
echo ""
echo "API will be available at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"