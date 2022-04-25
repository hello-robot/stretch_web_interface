#!/bin/bash

echo "attempt to bring up desktop development environment"

set -x
./stop_desktop_dev_env.sh

export HELLO_ROBOT_ENV="development"
sudo systemctl start mongod.service
sudo systemctl start redis.service

echo "attempting to start the web server..."
cd ../
sudo --preserve-env node ./bin/www &

set +x
echo "finished attempt at bringing up the desktop development environment"
