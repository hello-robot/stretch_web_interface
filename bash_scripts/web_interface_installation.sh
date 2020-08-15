#!/bin/bash

echo ""
echo "Starting web interface installation script."

# APT UPDATE
echo ""
echo "Updating with apt."
sudo apt-get --yes update
echo "Done."

# ROSBRIDGE
echo ""
echo "Installing rosbridge"
sudo apt-get --yes install ros-melodic-rosbridge-server
echo "Done."

# NODE 10
echo ""
echo "Installing Node.js 10"
echo "Downloading from the Internet via curl."
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
echo "Installing nodejs with apt-get"
sudo apt-get install -y nodejs
echo "Done."

# PACKAGES VIA NPM
echo ""
echo "Installing web-interface Node packages using npm."
cd ~/catkin_ws/src/stretch_web_interface/
npm install
echo "Done."

# MONGODB
echo ""
echo "Installing MongoDB, which is used to store credentials for robot and operator logins."
sudo apt-get --yes install mongodb
echo "Done."

# CHECK MONGODB
echo ""
echo "Look at the following output to make sure the mongodb service is working."
systemctl status mongodb

# INITIAL MONGODB DATABASE
echo ""
echo "Load developer credential database for robots and operators into MongoDB."
echo "WARNING: THESE CREDENTIALS ARE WIDELY KNOWN AND SHOULD NOT BE USED OUTSIDE OF SECURE INTERNAL TESTING."
cd ~/catkin_ws/src/stretch_web_interface/
mongorestore -d node-auth ./mongodb/test-users-db-20171021/node-auth/
echo "Done."

# MONGODB-COMPASS
echo ""
echo "Installing MongoDB-Compass, which is a GUI to view the contents of a Mongo Database."
wget https://downloads.mongodb.com/compass/mongodb-compass_1.12.1_amd64.deb
sudo dpkg -i mongodb-compass_1.12.1_amd64.deb
sudo apt --fix-broken install
sudo apt -y install libgconf2-4
rm mongodb-compass_1.12.1_amd64.deb

# REDIS
echo ""
echo "Install redis for the web server."
sudo apt-get --yes install redis
echo "Done."

# REMOVE TORNADO VIA PIP
echo ""
echo "Remove tornado using pip to avoid rosbridge websocket immediate disconnection issue."
pip uninstall -y tornado
echo "Done."

echo ""
echo "The web interface installation script has finished."
echo ""
