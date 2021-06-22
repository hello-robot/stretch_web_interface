#!/bin/bash

echo "****************************************"
echo "attempt to bring up server production environment"

echo ""
echo "first making sure that the system is fully shutdown prior to bringing it up"
echo "./stop_server_production__env.sh"
./stop_server_production__env.sh

echo ""
echo "set environment variable for development environment"
echo "export HELLO_ROBOT_ENV=\"production\""
export HELLO_ROBOT_ENV="production"

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
echo "cd /home/ubuntu/repos/stretch_web_interface/"
cd /home/ubuntu/repos/stretch_web_interface/
echo "sudo --preserve-env node ./bin/www &"
sudo --preserve-env node ./bin/www &

echo ""
echo "finished attempt to bring up server production environment"
echo "****************************************"



 
