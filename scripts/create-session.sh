#!/bin/sh
# Creates a new session via the API. Called by cron every Monday at 19:55 Lisbon time.
# Retries up to 5 times with 10s delay in case the server isn't ready.

set -e

SESSION_NAME=$(node -e "console.log(new Date().toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'}))")
API_URL="http://localhost:3030/api/sessions"

echo "$(date): Creating session '${SESSION_NAME}'..."

attempt=1
max_attempts=5
while [ $attempt -le $max_attempts ]; do
  response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${SESSION_NAME}\",\"dutyPerson\":\"artur\"}")

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n -1)

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo "$(date): Session created successfully: $body"
    exit 0
  fi

  echo "$(date): Attempt $attempt/$max_attempts failed (HTTP $http_code): $body"
  attempt=$((attempt + 1))

  if [ $attempt -le $max_attempts ]; then
    sleep 10
  fi
done

echo "$(date): Failed to create session after $max_attempts attempts"
exit 1
