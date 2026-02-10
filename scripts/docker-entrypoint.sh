#!/bin/sh
# Start cron daemon in background (runs as root), then drop to nextjs user for Node server.
crond -b -l 8
exec su-exec nextjs node server.js
