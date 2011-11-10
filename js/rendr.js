var hg = require('./hgraph');
var Harmonograph = hg.Harmonograph;
var HARM = hg.HARM;

var _ = require('underscore');
var lwidth = 3; // line width for the pen
var twidth = 4; // line width for the 'table'
var toffset = 4; // edge offset for the table rect

var Renderer = function(visCanvas, hidCanvas, cfg) {
    this.cfg = cfg;
    this.graph = new Harmonograph(cfg);
    this.drawCanvas = hidCanvas;
    this.drawCtx = this.drawCanvas.getContext('2d');
    this.renderCanvas = visCanvas;
    this.renderCtx = this.renderCanvas.getContext('2d');
    this.color = '#ffffff';
    this.lastColor = null;
    this.colors = {};
    this.points = [];
    this.lastPoint = [];
    this.paused = true;
    this.count = 0;
    this.xscale = 1;
    this.yscale = 1;
    this.xoff = 0;
    this.yoff = 0;
    this.error = null;
    this.stepCount = 32;
    this.isDrawing = false;
    this.wantClear = false;
    this.aframe = false;
    this._init();
    this.pauseCb = null;
    this.move = true;
};

Renderer.prototype.setConfig = function(cfg, cb) {
    var me = this;
    this.pause(true, function() {
        console.log(cfg);
        me.graph = new Harmonograph(cfg);
        me.cfg = cfg;
        me._init();
        cb();
    });
};

Renderer.prototype.setColor = function(color) {
    this.lastColor = this.color;
    this.color = color;
};

Renderer.prototype.pause = function(done, cb) {
    if(this.paused) {
        this.resume();
    }
    this.pauseCb = cb;
    this.paused = true;
    this.wantClear = done ? true : false;
};

Renderer.prototype.resume = function() {
    this.paused = false;
    if(!this.aframe) {
        console.log("resuming");
        this.aframe = true;
        this._animate(-1);
    }
};

// pen down
Renderer.prototype.startDrawing = function() {
    console.log('start drawing');
    this.isDrawing = true;
};

// pen up
Renderer.prototype.stopDrawing = function(clear) {
    console.log('stop drawing');
    this.isDrawing = false;
};

Renderer.prototype._animate = function(t) {
    var me = this;
    var anim = function(t) { 
        me._animate(t); 
    };

    if(t > 0) this._timeDelta(t);
    this._step();

    if(this.paused) {
        console.log("paused");
        this.aframe = false;
        if(this.wantClear) {
            this.drawCtx.clearRect(0,0,this.xscale,this.yscale);
            this.renderCanvas.width = this.renderCanvas.width;
            this.wantClear = false;
            //this.graph.count = 0;
            console.log("cleared");
        } else {
            // center the canvas as a convenience
            this.renderCanvas.width = this.renderCanvas.width;
            console.log("center");
            this.renderCtx.drawImage(this.drawCanvas, this.xoff, this.yoff);
        }
        if(this.pauseCb) this.pauseCb();
    } else {
        window.requestAnimFrame(anim,this.renderCanvas);
    }
};

Renderer.prototype._timeDelta = function(t) {
    /* update step count for frame rate here */
    if(this.lt) {
        this.lt.push(t);
        if(this.count % 180 === 0) {
            this.lt = this.lt.slice(this.lt.length - 31, this.lt.length -1);
            var avgs = _.reduce(this.lt, function(memo, val) {
                if(memo.last) {
                    var delta = val - memo.last;
                    return { count: ++memo.count, total: memo.total + delta, last: val };
                } else {
                    return { count: 0, total: 0, last: val };
                }
            }, { count: 0, total: 0, last: false });

            var fps = 1000/(avgs.total/avgs.count);
            console.log("Avg : " + Math.round(fps) + "fps, stepcount: " + this.stepCount + ", count: " + this.count);
        }
    } else {
        this.lt = [];
        this.lt.push(t);
    }
};


Renderer.prototype._updateColor = function() {
    if(this.color !== this.lastColor) {
        this.drawCtx.strokeStyle = this.color;
        this.lastColor = this.color;
        this.colors[this.count] = this.color;
    }
};

Renderer.prototype._updateStepCount = function() {
    /* update step count for incremental speedup */
    if(this.count % 60 === 0) {
        if(this.stepCount < 100) {
            this.stepCount += 2;
        }
    }
};

Renderer.prototype._step = function() {
    var me = this;
    var iter = function(err, pt) { me._onPoint(err, pt); };
    this.count++;
    this.graph.run(iter, this.stepCount);
};

Renderer.prototype._onPoint = function(err, pt) {
    if(err) {
        this.paused = true;
        this.error = err;
    } else if(pt == null) {
        this._updateColor();
        this._render();
        this._updateStepCount();
    } else {
        this._accept(pt);
    }
};

Renderer.prototype._accept = function(pt) {
    this.points.push(pt);
    var lp = this._scale(pt);
    this.lastPoint = lp;
    if(this.isDrawing) {
        this.drawCtx.lineTo(lp[0],lp[1]);
    } else {
        this.drawCtx.moveTo(lp[0],lp[1]);
    }
};

Renderer.prototype.wantMove = function(want) {
    this.move = want ? true : false;
};


Renderer.prototype._scale = function(pt) {
    /* 
     * graph scale is [-maxX, maxX], [-maxY, maxY], so we need to
     * reset it to use positive coords, and scale to the canvas
     */
    var gx = this.graph.maxX;
    var gy = this.graph.maxY;
    var xs = this.xscale/(2*gx);
    var ys = this.yscale/(2*gy);
    return [xs*(pt[0] + gx), ys*(pt[1] + gy)];
};

Renderer.prototype._render = function() {
    if(this.isDrawing) {
        this.drawCtx.stroke();
        this.drawCtx.beginPath();
        this.drawCtx.lineTo(this.lastPoint[0], this.lastPoint[1]);
    }

    this.renderCtx.clearRect(0,0,this.xscale,this.yscale);
    this._transform();
};

Renderer.prototype._init = function() {
    this.xscale = this.drawCanvas.width;
    this.yscale = this.drawCanvas.height;
    this.xoff = (this.renderCanvas.width - this.xscale)/2;
    this.yoff = (this.renderCanvas.height - this.yscale)/2;

    var d = this.drawCtx;
    // draw the table border
    d.save();
    d.strokeStyle = '#aaaabb';
    d.lineWidth = twidth;
    d.strokeRect(toffset, toffset, this.xscale-(2*toffset), this.yscale-(2*toffset));
    //d.roundRect(toffset,toffset,this.xscale-toffset, this.yscale-toffset);
    //d.stroke();
    this.renderCtx.drawImage(this.drawCanvas,this.xoff,this.yoff);
    d.restore();


    d.lineWidth = lwidth;
    d.beginPath();
    d.moveTo(this._scale(this.graph.increment()));
};

Renderer.prototype._transform = function() {
    var w = this.renderCanvas.width;
    var h = this.renderCanvas.height;
    if(this.move) {
        if(this.lastPoint.length > 0) {
            var x = this.xscale - this.lastPoint[0];
            var y = this.yscale - this.lastPoint[1];
        }

        /* set rotation and scale here */
        this.renderCanvas.width = w;
        this.renderCtx.drawImage(this.drawCanvas, x - this.xscale/2 + this.xoff, y - this.yscale/2 + this.yoff);
    } else {
        this.renderCanvas.width = w;
        this.renderCtx.drawImage(this.drawCanvas, this.xoff, this.yoff);
    }
};

/*
 * <clip>
 * http://stackoverflow.com/questions/1255512/how-to-draw-a-rounded-rectangle-on-html-canvas
 */
CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x+r, y);
  this.arcTo(x+w, y,   x+w, y+h, r);
  this.arcTo(x+w, y+h, x,   y+h, r);
  this.arcTo(x,   y+h, x,   y,   r);
  this.arcTo(x,   y,   x+w, y,   r);
  this.closePath();
  this.stroke();
  return this;
}

// Function to compute hgraph params for an imaginary table suspended
// at the corners. We pretend there are pivot points in the middle of
// two of the four edges of the table, and calculate the distance
// between that point and the provided center of mass. This is the
// first factor affecting the frequencies. The second factor affecting
// the frequencies is the amplitude of the initial push (which is
// different for each axis). This generates an initial X and Y term
// for our hgraph, and we add a third X term to be the rotational
// frequency. This third term is based on the radial distance of the
// center-of-mass vs the geometric center, ranging from [1.5 -
// 2]*avg(px, py)


var cons = [1/16, 11/3072, 173/737280, 22931/1321205760];
var adjustPeriod = function(lg, ampl, t) {
    // original period = 2*PI*sqrt(L/g)
    if(t) lg = Math.pow(t/(Math.PI*2),2);
    var adjustment = 1 + cons[0]*Math.pow(ampl,2) + cons[1]*Math.pow(ampl,4) + cons[2]*Math.pow(ampl,6) + cons[3]*Math.pow(ampl,8);
    var adjusted = Math.PI*2*Math.sqrt(lg*adjustment);
    return adjusted;
};
var adjustFreq = function(ampl, f) {
    var adj = 1/adjustPeriod(null, ampl, 1/f);
    // make the adjustment much much smaller(!)
    adj = f - 0.005*(f - adj);
    console.log("Freqs: " + f + " -> " + adj);
    return adj;
}

// length=l, width=w, height=h of table in meters
// x,y --> coords of weights on a [0,1] scale (x is along l, y is along w)
// amplitudes and phases of swing are in radians
// phase of rotation is in radians
var tableConfig = function(l, w, h, x, y, xa, xp, ya, yp, ra, rp) {
    var xz = Math.sqrt(Math.pow(Math.abs(l/2 - l*x),2) + Math.pow(w*y,2));
    var yz = Math.sqrt(Math.pow(Math.abs(w/2 - w*y),2) + Math.pow(l*x,2));
    var xr = Math.sqrt(Math.pow(Math.abs(l/2 - l*x),2) + Math.pow(Math.abs(w/2 - w*y),2));
    var xd = xr/(Math.sqrt(Math.pow(l/2,2) + Math.pow(w/2,2)));

    var xl = Math.sqrt(Math.pow(xz,2) + Math.pow(h,2));
    var yl = Math.sqrt(Math.pow(yz,2) + Math.pow(h,2));

    var xf = 1/adjustPeriod(xl/9.81,xa);
    var yf = 1/adjustPeriod(yl/9.81,ya);
    var rf = (1.5 + xd/2) * (xf+yf)/2;

    var cfg = {
        mode: HARM,
        step: .005,
        xterms: [
            { frequency: xf, damping: 0.0001, phase: xp, amplitude: xa },
            { frequency: rf, damping: 0.0001, phase: rp, amplitude: ra },
        ],
        yterms: [
            { frequency: yf, damping: 0.0001, phase: yp, amplitude: ya },
        ],
    };
    return cfg;
}


var spiroConfig = function(l, k) {
    var a13 = k;
    var a24 = l*k;
    var p2 = Math.PI/2;
    var f = (1-k)/k;

    var cfg = {
        mode: HARM,
        step: .01,
        xterms: [
            { frequency: 1, damping: 0, phase: p2, amplitude: a13 },
            { frequency: f, damping: 0, phase: p2, amplitude: a24 },
        ],
        yterms: [
            { frequency: 1, damping: 0, phase: 0, amplitude: a13 },
            { frequency: f, damping: 0, phase: 0, amplitude: a24 },
        ],
    };
    return cfg;
};


/*
 * The gesture is assumed to be an arc-ish line measured in a (0,0) to
 * (1,1) coord space, with the max deviation from a straight line g0
 * and the linear offset of that point along the line as g1.
 * x1 - x0 -> convert to rads, use as xampl
 * y1 - y0 -> convert to rads, use as yampl
 * g0 -> convert to rads, use as both x and y rotational param ampl
 * g1 -> convert to rads, use as the xy phase difference 
 * total y distance -> yampl
*/
var gestureConfig = function(d,freqs, vals) {
    var vrads = _.map(vals, function(v) { return 2*Math.PI*v; });
    var vfreq = freqs;
    vfreq[1] = adjustFreq(vrads[0],vfreq[1]);

    var cfg = {
        mode: HARM,
        step: .01,
        xterms: [
            { frequency: vfreq[0], damping: d, phase: 0, amplitude: vrads[0] },
            { frequency: vfreq[1], damping: d, phase: 0, amplitude: vrads[2] },
        ],
        yterms: [
            { frequency: vfreq[2], damping: d, phase: vrads[3], amplitude: vrads[1] },
            { frequency: vfreq[3], damping: d, phase: vrads[3], amplitude: vrads[2] },
        ],
    };
    return cfg;
};

exports.Renderer = Renderer;
exports.tableConfig = tableConfig;
exports.spiroConfig = spiroConfig;
exports.gestureConfig = gestureConfig;

