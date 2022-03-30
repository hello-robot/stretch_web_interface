#!/bin/bash

echo "attempt to shutdown desktop development environment"
set -x
sudo unset HELLO_ROBOT_ENV
sudo systemctl stop mongod.service
sudo systemctl stop redis.service
sudo pkill -f "node ./bin/www"
set +x
echo "finished attempt at shutting down the desktop development environment"
