#!/bin/bash

echo ""
echo "Starting web server installation script."

# APT UPDATE
echo ""
echo "Updating with apt."
sudo apt-get --yes update
echo "Done."

# NODE 14
echo ""
echo "Installing Node.js 14"
echo "Downloading from the Internet via curl."
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
echo "Installing nodejs with apt-get"
sudo apt-get install -y nodejs
echo "Done."

# PACKAGES VIA NPM
echo ""
echo "Installing web-interface Node packages using npm."
cd ~/repos/stretch_web_interface/
echo "Update to latest version of npm."
sudo npm install -g npm
echo "Install packages with npm."
sudo npm install
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

# REDIS
echo ""
echo "Install redis for the web server."
sudo apt-get --yes install redis
echo "Done."

# COTURN
echo ""
echo "Install coturn for the web server."
sudo apt-get --yes install coturn
echo "Setup coturn.service."
sudo cp ~/repos/stretch_web_interface/coturn.service /etc/systemd/system/
echo "Done."


echo ""
echo "The web server installation script has finished."
echo ""
