# HotelStay

## Overview
This project creates a custom app in ChatGPT that allows users to search for places to stay based on the city provided. The app utilizes a JSON data file containing various hotels, including details such as the cities, amenities, and price per night.

## Project Structure
- **web/**: Contains the frontend application built with React and TypeScript.
- **server/**: Contains the backend application built with Python.
- **data/**: Includes JSON data files used in the application.

## Getting Started
### Prerequisites
- Node.js and npm for the frontend.
- Python 3.x for the backend.

### Setup

- Check [https://developers.openai.com/apps-sdk/deploy/connect-chatgpt](https://developers.openai.com/apps-sdk/deploy/connect-chatgpt) for instructions on testing the app in ChatGPT.

### Installation
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd HotelStay-ChatGPT-App
   ```
2. Install frontend dependencies:
   ```bash
   cd web
   npm install
   ```
3. Install backend dependencies:
   ```bash
   cd server
   pip install -r requirements.txt
   ```

### Running the Application
- Start ngrok to expose the backend server:
   ```bash
   ngrok http 8000
   ```
- Start the frontend application:
   ```bash
   cd web
   npm run build
   ```
- Start the backend server:
   ```bash
   cd server
   $env:MCP_ALLOWED_HOSTS="<subdomain>.ngrok-free.dev"
   $env:MCP_ALLOWED_ORIGINS="https://<subdomain>.ngrok-free.dev"
   python app.py
   ```
- Start MCP inspector to test the app:
   ```bash
   npx @modelcontextprotocol/inspector@latest
   ```

## License
This project is licensed under the MIT License.
