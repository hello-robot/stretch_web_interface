#!/bin/bash

for f in $@
do
    echo "****************************************"
    echo "attempting to generate 16x summary video of $f"
    #echo "attempting to generate 16x and 8x summary videos of $f"
    echo "input file = $f"
    echo "output file = ${f%.webm}_x16.webm"
    # echo "output file 2 = ${f%.webm}_x8.webm"
    echo ""
    echo "ffmpeg -i $f -an -filter:v setpts=0.0625*PTS ${f%.webm}_x16.webm"
    ffmpeg -i "$f" -an -filter:v "setpts=0.0625*PTS" "${f%.webm}_x16.webm"
    #echo ""
    #echo "ffmpeg -i $f -an -filter:v setpts=0.125*PTS ${f%.webm}_x8.webm"
    #ffmpeg -i "$f" -an -filter:v "setpts=0.125*PTS" "${f%.webm}_x8.webm"
    echo ""
done

echo "****************************************"
echo ""
echo "DONE!"
echo ""



 
