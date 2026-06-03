import L from "leaflet";
// @ts-ignore
window.L = L;

// Global patch to suppress Canvas2D willReadFrequently warnings (caused by leaflet.heat)
const originalGetContext = HTMLCanvasElement.prototype.getContext;
(HTMLCanvasElement.prototype as any).getContext = function (type: string, attributes?: any) {
    if (type === '2d') {
        attributes = { ...attributes, willReadFrequently: true };
    }
    return originalGetContext.call(this, type, attributes);
};
