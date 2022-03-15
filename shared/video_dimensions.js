export const realsenseDimensions = {w: 640, h: 360, fps: 6.0}
export const wideVideoDimensions = {w: 1024, h: 768, fps: 6.0}
export const gripperCrop = computeCrop(wideVideoDimensions, 0.8, 1.0)
export const overheadNavCrop = ((x, y) => {
        return {
            sx: wideVideoDimensions.w * (1.0 - x) / 2.0,
            sy: 0, // get more from the top
            sw: wideVideoDimensions.w * x,
            sh: wideVideoDimensions.h * y,
            dx: 0,
            dy: 0,
            dw: wideVideoDimensions.w * x,
            dh: wideVideoDimensions.h * y
        }
    }
)(0.75, 1.0)

export const overheadManipCrop = ((x, y) => {
    return {
	sx: wideVideoDimensions.w * (1.0 - x) * 1.5 , //get more from the right
        sy: wideVideoDimensions.w * 0.225, // get more from the top
        sw: wideVideoDimensions.w / 1.5,
        sh: wideVideoDimensions.h / 1.5,
        dx: 0,
        dy: 0,
        dw: wideVideoDimensions.w,
        dh: wideVideoDimensions.w,
    }
})(0.75, 1.0)

function computeCrop(original, x, y) {
    return {
        sx: Math.round(original.w * (1.0 - x) / 2.0),
        sy: Math.round(original.h * (1.0 - y) / 2.0),
        sw: Math.round(original.w * x),
        sh: Math.round(original.h * y),
        dx: 0,
        dy: 0,
        dw: Math.round(original.w * x),
        dh: Math.round(original.h * y)
    };
}

function computeZoomCrop(original, factor) {
    return {
        sx: original.w * (1.0 - 1.0 / factor) / 2.0,
        sy: original.h * (1.0 - 1.0 / factor) / 2.0,
        sw: original.w / factor,
        sh: original.h / factor,
        dx: 0,
        dy: 0,
        dw: original.w,
        dh: original.h
    };
}
