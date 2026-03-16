#!/bin/bash

# Boot the API server in the background
echo "🚀 Starting FastAPI Backend..."
cd backend
source venv/bin/activate
# Install minimal deps just in case
# pip install -r requirements.txt
uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Boot the Next.js Frontend server
echo "🚀 Starting Next.js Frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev -- -p 3000 &
FRONTEND_PID=$!
cd ..

echo "✅ Systems booting. Launching browser..."

# Wait a few seconds for servers to start
sleep 4

# Open the browser automatically based on the OS (Mac format)
open http://localhost:3000

echo "Press Ctrl+C to stop both servers."

# Wait for process termination
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' SIGINT SIGTERM
wait $BACKEND_PID $FRONTEND_PID
