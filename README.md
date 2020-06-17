![](./images/HelloRobotLogoBar.png)

## Overview

The code in this repository enables a person to remotely teleoperate S T R E T C H (TM) through a recent Chrome/Chromium web browser on an Android mobile phone, laptop, or desktop. 

The *stretch_web_interface* repository holds prototype code for use with the Stretch RE1, a mobile manipulator from Hello Robot Inc.

**WARNING: This is prototype code that has not been well tested. We are making it available in its current state, since we believe it may have value to the community. There are security issues associated with the current code, especially if you use the default credentials. Use this code at your own risk.** 

### Structure

The web interface works via [Web Real-Time Communication (WebRTC)](https://en.wikipedia.org/wiki/WebRTC). Code runs in a browser on the robot, in a browser on the operator's device (e.g., a mobile phone), and on a server. This is analogous to the robot and the operator video conferencing with one another, although they communicate via realtime data in addition to audio and video. Internally, we have used [puppeteer](https://github.com/puppeteer/puppeteer) to automate the robot's browser so that the robot can automatically launch and login on boot. 

### Web Server Details

In the example below, the server runs on the robot. In a production environment, you would use an external server, instead of the robot, to handle things like connecting robots and operators behind firewalls. At Hello Robot, we have used a virtual server with [Amazon Lightsail](https://aws.amazon.com/lightsail/). When used on a production server with proper certificates, this system supports HTTPS without scary messages. At Hello Robot, we used [Let's Encrypt](https://letsencrypt.org/) to help us achieve this. 

The web server uses the [Express](https://expressjs.com/) web framework with [Pug](https://pugjs.org/api/getting-started.html) templates. The server provides a WebRTC [signaling service](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/) using [socket.io](https://socket.io/). It uses [Redis](https://redis.io/) to store sessions. 

[passport](http://www.passportjs.org/) provides authentication for the robot and the operator. [mongoose](https://mongoosejs.com/) and a [MongoDB](https://www.mongodb.com/) database store credentials for robots and operators. The *stretch_web_interface* repository comes with default MongoDB contents found at [./mongodb/](./mongodb/) for testing behind a firewall. These default contents come with multiple robot and operator accounts. **Make sure not to use these default database contents on a deployed system!** 

By default, [send_recv_av.js](./shared/send_recv_av.js) uses a free STUN server provided by Google. At Hello Robot, we used our own [STUN and TURN server](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure/). There is code that we've commented out that we used to achieve this. We ran our own [coturn](https://github.com/coturn/coturn) TURN and STUN server on the same Amazon Lightsail virtual server that we used to run the web interface server. At the time, we used Ubuntu 16.04 and installed coturn using apt.  

## Installation 

The *stretch_web_interface* repository depends on [stretch_ros](http://github.com/hello-robot/stretch_ros).

Clone the *stretch_web_interface* repository to ~/catkin_ws/src/ on the robot. 

```
cd ~/catkin_ws/src/
git clone https://hello-robot/stretch_web_interface
```

Run catkin_make.

```
cd ~/catkin_ws/
catkin_make
rospack profile
```

Run the installation script. 

```
cd ~/catkin_ws/src/stretch_web_interface/bash_scripts/
sudo ./web_interface_installation.sh
```

WARNING: The script uninstalls tornado using pip to avoid a rosbridge websocket immediate disconnection issue. This could break other software on your robot.

## Use

First, make sure the robot is calibrated. For example you can fun the following command.

```
stretch_robot_home.py
```

Next, in a terminal, run the following command to start the ROS side of things. This will start ROS nodes on the robot for the D435i camera, the driver for Stretch RE1, and rosbridge. Rosbridge connects JavaScript running in the robot's browser to ROS using JSON. 

```
roslaunch stretch_web_interface web_interface.launch
```

In another terminal, run the following command to start the web server on the robot. 

```
roscd stretch_web_interface/bash_scripts/
./start_desktop_dev_env.sh 
```

### Start the Robot's Browser

Open a Chromium browser on the robot and go to localhost. Select "Advanced" and then click on "Proceed to localhost (unsafe)".

<img src="./images/robot_browser_1.png" width="400">

Click on "Login" and use the following username and password.

```
username:
r1

password
NQUeUb98
```

WARNING: This is a default robot account provided for simple testing. Since this username and password are public on the Internet, this is not secure. You should only use this behind a firewall during development and testing. Deployment would require new credentials and security measures.


<img src="./images/robot_browser_2.png" width="400">

<img src="./images/robot_browser_3.png" width="400">

You should now see video from the robot's camera in the browser window. 

<img src="./images/robot_browser_4.png" width="400">

### Start the Operator's Browser

You will now login to a browser as the operator and connect to the robot. You can use a Chrome browser on a recent Android mobile phone or a recent Chrome/Chromium browser on a laptop or desktop. 

Open the browser goto the robot’s IP address. You can use `ifconfig` on the robot to determine its IP address.

Select "Advanced" and then click on "Proceed to localhost (unsafe)".

<img src="./images/operator_browser_1.png" width="200">

<img src="./images/operator_browser_2.png" width="200">

<img src="./images/operator_browser_3.png" width="200">

Click on "Login" and use the following username and password.

```
username:
o1

password
xXTgfdH8
```

WARNING: This is a default operator account provided for simple testing. Since this username and password are public on the Internet, this is not secure. You should only use this behind a firewall during development and testing. Deployment would require new credentials and security measures.

<img src="./images/operator_browser_4.png" width="200">

<img src="./images/operator_browser_5.png" width="200">

You should now see a screen like the following. Click on "no robot connected" and select the robot "r1" to connect to it. 


<img src="./images/operator_browser_6.png" width="200">
<img src="./images/operator_browser_7.png" width="200">

You should now see video from the robot on your mobile phone or other device. Click in the designated regions to command the robot to move. You can also click on "Drive", "Arm" down, "Arm" up, "Hand" and "Look" to move different joints on the robot. 

<img src="./images/operator_browser_8.png" width="200">

## Licenses

This software is intended for use with S T R E T C H (TM) RESEARCH EDITION, which is a robot produced and sold by Hello Robot Inc. For further information, including inquiries about dual licensing, please contact Hello Robot Inc.

For license details for this repository, see the LICENSE files.

The [Apache 2.0](http://www.apache.org/licenses/LICENSE-2.0) license applies to all code written by Hello Robot Inc. contained within this repository. We have attempted to note where code was derived from other sources and the governing licenses. 
