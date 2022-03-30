import {BaseComponent, Component} from "../../../shared/base.cmp"

const template = `
<div id="container-div">
    <canvas id="map-canvas" data-ref="map-canvas" width="600" height="500"></canvas>
    <img id="map-img" data-ref="map-img" />
</div>
`

@Component("map-interactive", '/operator/css/map-interactive.css')
export class MapInteractive extends BaseComponent {
    mapImg?: HTMLImageElement
    mapCanvas?: HTMLCanvasElement

    width: number
    height: number
    mapScale: number

    constructor(navGoalCallback) {
        super(template);
        this.mapImg = this.refs.get("map-img");
        this.mapCanvas = this.refs.get("map-canvas");
        this.mapCanvasCxt = this.mapCanvas.getContext("2d");

        this.creatingGoal = false;
        this.mousePos = { x: 0, y: 0 };
        this.goalStartPos = { x: 0, y: 0 };
        this.mapCanvas.onmousedown = this.startGoalCreation.bind(this);
        this.mapCanvas.onmousemove = this.updateGoal.bind(this);
        this.mapCanvas.onmouseup = this.endGoalCreation.bind(this);

        this.navGoalCallback = navGoalCallback;

        this.robotTransform = {};
    }

    startGoalCreation(event) {
        this.creatingGoal = true;
        this.goalStartPos.x = event.offsetX;
        this.goalStartPos.y = event.offsetY;
    }

    updateGoal(event) {
        if (this.creatingGoal) {
            this.mousePos.x = event.offsetX;
            this.mousePos.y = event.offsetY;
        }

        this.updateMapDisplay();
    }

    endGoalCreation(event) {
        if (this.creatingGoal) {
            this.creatingGoal = false;
            this.mousePos.x = event.offsetX;
            this.mousePos.y = event.offsetY;
            this.updateMapDisplay();

            const x_in_map = (this.goalStartPos.x * this.mapResolution) + this.mapOrigin.position.x;
            const y_in_map = (this.goalStartPos.y * this.mapResolution) + this.mapOrigin.position.y;

            const theta = Math.atan2(this.mousePos.y - this.goalStartPos.y, this.mousePos.x - this.goalStartPos.x);

            const goal = {
                x: x_in_map,
                y: y_in_map,
                theta: theta
            };

            console.log(goal);

            this.navGoalCallback(goal);
        }
    }

    updateMap({mapData, mapWidth, mapHeight, mapResolution, mapOrigin}) {
        this.mapImg.src = mapData;

        this.mapCanvas.width = mapWidth;
        this.mapCanvas.height = mapHeight;

        this.mapResolution = mapResolution;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        this.mapOrigin = mapOrigin;
    }

    updateMapDisplay(robotTransform = null) {
        if (robotTransform) {
            this.robotTransform = robotTransform;
        }

        this.mapCanvasCxt.clearRect(0, 0, this.mapCanvas.width, this.mapCanvas.height);4
        this.mapCanvasCxt.beginPath();

        // Draw robot position
        this.mapCanvasCxt.arc(
            (this.robotTransform.translation.x - this.mapOrigin.position.x) / this.mapResolution,
            this.mapHeight - ((this.robotTransform.translation.y - this.mapOrigin.position.y) / this.mapResolution), 4, 0, 2 * Math.PI);
        this.mapCanvasCxt.fillStyle = "blue";
        this.mapCanvasCxt.fill();

        if (this.creatingGoal) {
            drawLineWithArrows(
                this.mapCanvasCxt,
                this.goalStartPos.x, this.goalStartPos.y,
                this.mousePos.x, this.mousePos.y,
                2, 3, false, true);
        }
    }
}


// Modified from https://riptutorial.com/html5-canvas/example/18136/line-with-arrowheads

// x0,y0: the line's starting point
// x1,y1: the line's ending point
// width: the distance the arrowhead perpendicularly extends away from the line
// height: the distance the arrowhead extends backward from the endpoint
// arrowStart: true/false directing to draw arrowhead at the line's starting point
// arrowEnd: true/false directing to draw arrowhead at the line's ending point

function drawLineWithArrows(ctx, x0,y0,x1,y1,aWidth,aLength,arrowStart,arrowEnd){
    var dx=x1-x0;
    var dy=y1-y0;
    var angle=Math.atan2(dy,dx);
    var length=Math.sqrt(dx*dx+dy*dy);
    //
    ctx.translate(x0,y0);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(length,0);
    if(arrowStart){
        ctx.moveTo(aLength,-aWidth);
        ctx.lineTo(0,0);
        ctx.lineTo(aLength,aWidth);
    }
    if(arrowEnd){
        ctx.moveTo(length-aLength,-aWidth);
        ctx.lineTo(length,0);
        ctx.lineTo(length-aLength,aWidth);
    }
    //
    ctx.stroke();
    ctx.setTransform(1,0,0,1,0,0);
}