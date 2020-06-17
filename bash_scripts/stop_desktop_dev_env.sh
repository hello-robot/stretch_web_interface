#!/bin/bash

echo "****************************************"
echo "attempt to shutdown desktop development environment"

echo ""
echo "remove environment variable for development environment"
echo "unset HELLO_ROBOT_ENV"
sudo unset HELLO_ROBOT_ENV

echo ""
echo "attempting to stop MongoDB..."
echo "sudo systemctl stop mongod.service"
sudo systemctl stop mongod.service

echo ""
echo "attempting to stop Redis..."
echo "sudo systemctl stop redis.service"
sudo systemctl stop redis.service

echo ""
echo "attempting to stop the web server..."
echo "pkill -f \"node ./bin/www\""
sudo pkill -f "node ./bin/www"

echo ""
echo "finished attempt at shutting down the desktop development environment"
echo "****************************************"


