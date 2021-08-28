#!/bin/bash
echo "****************************************"
echo "attempting to generate straight arrows in cardinal directions and two sizes..."

inkscape -z -e gripper_close_small.png -w 20 -h 20 gripper_close.svg
inkscape -z -e gripper_close_medium.png -w 48 -h 48 gripper_close.svg

inkscape -z -e gripper_open_small.png -w 20 -h 20 gripper_open.svg
inkscape -z -e gripper_open_medium.png -w 48 -h 48 gripper_open.svg

inkscape -z -e right_arrow_small.png -w 20 -h 20 right_arrow.svg
inkscape -z -e right_arrow_medium.png -w 48 -h 48 right_arrow.svg

convert right_arrow_small.png -rotate 90 down_arrow_small.png
convert right_arrow_medium.png -rotate 90 down_arrow_medium.png

convert right_arrow_small.png -rotate 180 left_arrow_small.png
convert right_arrow_medium.png -rotate 180 left_arrow_medium.png

convert right_arrow_small.png -rotate 270 up_arrow_small.png
convert right_arrow_medium.png -rotate 270 up_arrow_medium.png

inkscape -z -e right_turn_small.png -w 30 -h 30 right_turn.svg
inkscape -z -e right_turn_medium.png -w 60 -h 60 right_turn.svg

convert right_turn_small.png -flop left_turn_small.png
convert right_turn_medium.png -flop left_turn_medium.png

echo "****************************************"
echo "copying the results to the operator directory"

cp *.png ../../operator/images

echo "****************************************"
echo "attempting to delete generated images in the current directory"
echo "rm *_small.png"
rm *_small.png
echo "rm *_medium.png"
rm *_medium.png

echo "****************************************"
echo "done"
