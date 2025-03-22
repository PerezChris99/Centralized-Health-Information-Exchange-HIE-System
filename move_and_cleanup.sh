#!/bin/bash

# Create public directory if it doesn't exist
mkdir -p "./public"

# Copy all contents from frontend to public
cp -r "./frontend/"* "./public/"

# Delete the frontend folder after copying
rm -rf "./frontend"

echo "All necessary files have been moved from frontend to public folder. Frontend folder has been deleted."
