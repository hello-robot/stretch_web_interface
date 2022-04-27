#!/bin/bash

echo "attempt to bring up server production environment"

echo "first making sure that the system is fully shutdown prior to bringing it up"
set -x
./stop_server_production_env.sh

export HELLO_ROBOT_ENV="production"
sudo systemctl start mongod.service

sudo systemctl start redis.service


cd /home/ubuntu/repos/stretch_web_interface/

sudo --preserve-env node ./bin/www &
set +x
echo "finished attempt to bring up server production environment"
