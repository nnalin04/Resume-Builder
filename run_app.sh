#!/bin/bash

# Boot the API server in the background
echo "🚀 Starting FastAPI Backend..."
cd backend
# Run via python directly to bypass SIP source permission errors on activate
venv/bin/python -m uvicorn main:app --port 8000 &
BACKEND_PID=$!
cd ..

# Boot the Vite Frontend server
echo "🚀 Starting Vite Frontend..."
cd frontend
npm run dev -- --port 3000 &
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
