#!/bin/bash

echo "****************************************"
echo "attempt to bring up desktop development environment"

echo ""
echo "first making sure that the system is fully shutdown prior to bringing it up"
echo "./stop_desktop_dev_env.sh"
./stop_desktop_dev_env.sh

echo ""
echo "set environment variable for development environment"
echo "export HELLO_ROBOT_ENV=\"development\""
export HELLO_ROBOT_ENV="development"

echo ""
echo "configured development certificate authority "
export NODE_EXTRA_CA_CERTS="$(readlink -f ../certificates)/rootCA.pem"

echo ""
echo "attempting to start MongoDB..."
echo "sudo systemctl start mongod.service"
sudo systemctl start mongod.service

echo ""
echo "attempting to start Redis..."
echo "sudo systemctl start redis.service"
sudo systemctl start redis.service

echo ""
echo "attempting to start the web server..."
echo "cd ../"
cd ../
echo "sudo --preserve-env node ./bin/www &"
sudo --preserve-env node ./bin/www &
echo ""

echo ""
echo "attempt to launch the browser for the robot and log in"
echo "roscd stretch_web_interface/"
roscd stretch_web_interface/
echo "node ./robot_teleop_start.js"
node ./start_robot_browser.js
echo ""

echo ""
echo "finished attempt at bringing up the desktop development environment"
echo "****************************************"



 
