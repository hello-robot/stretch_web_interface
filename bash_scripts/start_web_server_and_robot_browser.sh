#!/bin/bash

echo "attempt to bring up desktop development environment"
echo "first making sure that the system is fully shutdown prior to bringing it up"
set -x
./stop_desktop_dev_env.sh

export HELLO_ROBOT_ENV="development"
export NODE_EXTRA_CA_CERTS="$(readlink -f ../certificates)/rootCA.pem"

sudo systemctl start mongod.service
sudo systemctl start redis.service

cd ../
sudo --preserve-env node ./bin/www &

roscd stretch_web_interface/
node ./start_robot_browser.js
set +x
echo "finished attempt at bringing up the desktop development environment"
