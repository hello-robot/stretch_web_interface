#!/bin/bash

echo "attempt to stop server production environment"
set -x
sudo unset HELLO_ROBOT_ENV
sudo systemctl stop mongod.service
sudo systemctl stop redis.service
sudo pkill -f "node ./bin/www"
set +x
echo "finished attempt to stop the server production environment"
