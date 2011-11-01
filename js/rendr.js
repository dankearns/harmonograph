var Harmonograph = require('./hgraph').Harmonograph;
var _ = require('underscore');
var xs = 1000;
var ys = 750;
var lwidth = 3;

var g = null;
var _canvas = null;
var _ctx = null;

var color= [68,187,204];
var _newcolor = rotColor();
var mo = 1;

function rotColor() {
    var cstr = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')';
    var c1 = (color[0] + 19) % 255;
    var c2 = (color[1] + 27) % 255;
    var c3 = (color[2] + 47) % 255;
    var mod = 0;

    if(c1 + c2 + c3 < 180)
        c3 = Math.floor(Math.random()*155) + 100;
    
    color = [ c1 < mod ? mod : c1,
              c2 < mod ? mod: c2,
              c3 < mod ? mod : c3];
    return cstr;
}


function graphConfig(doc) {
    var terms = _.map([1,2,3,4], function(i) {
        var f = doc.getElementById("f_" + i);
        var p = doc.getElementById("p_" + i);
        var a = doc.getElementById("a_" + i);
        var d = doc.getElementById("d_" + i);
        return {
            frequency: f ? f.value : Math.PI,
            phase: p ? p.value : 0,
            amplitude: a ? a.value : 1,
            damping: d ? d.value : .01
        };
    });

    var ts = doc.getElementById("tscale");
    var tstep = ts ? ts.value : 0.001;
    
    return {
        mode: 0,
        step: tstep,
        xterms: terms.slice(0,2),
        yterms: terms.slice(2,4)
    };
}

function clear(canvas) {
    if(g && !onTop)
        g.stop();
    _ctx = canvas.getContext('2d');
    _ctx.clearRect(0,0,xs,ys);
};

function draw(canvas, doc, onTop, defs) {
    _canvas = canvas;
    _ctx = canvas.getContext('2d');
    var cfg = defs || graphConfig(doc);

    if(!onTop) {
        if(g) g.stop();
        _ctx.clearRect(0,0,xs,ys);
    }
    _ctx.strokeStyle = _newcolor;
    g = new Harmonograph(cfg);
    startDrawing(_ctx,g);
}

function drawMore(canvas, doc) {
    _canvas = canvas;
    if(g == null) {
        draw(canvas, doc, true);
    } else {
        _ctx = canvas.getContext('2d');
        g.maxCount += Math.floor(50000*mo);
        if(mo < 4) ++mo;
        _ctx.strokeStyle = _newcolor;
        startDrawing(_ctx,g);
    }
}

function startDrawing(ctx, g) {
    var first = true;
    ctx.lineWidth = lwidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    var scaleX = xs/(2*g.maxX);
    var scaleY = ys/(2*g.maxY);

    var sx = function(x) {
        return (scaleX * (x + g.maxX));
    };
    var sy = function(y) {
        return (scaleY * (y + g.maxY));
    };

    var ctrl;
    var i = -1;
    var closed = true;
    var clr = _newcolor;
    var p = function(err, pt) {
        if(clr !== _newcolor) {
            clr = _newcolor;
            ctx.strokeStyle = clr;
        }

        if(err) {
            ctx.stroke();
            closed = true;
            return;
        }
        var x = sx(pt[0]);
        var y = sy(pt[1]);

        if(i === -1) {
            ctx.moveTo(x,y);
        } else {
            if(closed && ctrl) {
                ctx.beginPath();
                ctx.moveTo(ctrl[0],ctrl[1]);
                closed = false;
            }
            ctx.lineTo(x,y);
            ctrl = [x,y];
            //if(i % 2 === 1) {
                //ctx.quadraticCurveTo(ctrl[0],ctrl[1],x,y);
            //}
        }
        i += 1;
    };

    var done = false;
    var ctr = 0;
    var steps = 16;
    var d = function(err,pt) {
        if(err === "done") {
            done = true;
        }
        else {
            p(err,pt);
        }
    };
    var x = function(t) {
        ++ctr;
        var swap = ctr % 180 === 0;
        if(swap) {
            if(steps < 256)
                steps += 16;
        }
        g.run(d,steps);
        if(!done) {
            window.requestAnimFrame(x, _canvas);
        }
    };

    window.requestAnimFrame(x, _canvas);

    //var d = new Date();
    //g.run(p);
    //var d2 = new Date() - d;
    //console.log("Time: " + d2);
}

function loadDefault(id, doc) {
    var cfg = defaults[id] || defaults.A;
    document.getElementById('tscale').value = cfg.step;

    _.each([1,2,3,4], function(i) {
        var d = i<=2 ? cfg.xterms[i-1] : cfg.yterms[i-3];
        document.getElementById('f_' + i).value = d.frequency;
        document.getElementById('d_' + i).value = d.damping;
        document.getElementById('p_' + i).value = d.phase;
    });
};

defaults = {
    X: {
        mode: 0,
        step: 0.003,
        xterms: [
            { frequency: 3.001, damping: 0.002, phase: 0, amplitude: 10 },
            { frequency: 2, damping: 0.0065, phase: 0, amplitude: 10 }
        ],
        yterms: [ 
            { frequency: 3, damping: 0.004, phase: 1.57, amplitude: 10 },
            { frequency: 2, damping: 0.019, phase: 4.7124, amplitude: 10 }
        ]
    },
    A: {
        mode: 0,
        step: 0.001,
        xterms: [
            { frequency: 1.01, damping: 0.005, phase: 0.1, amplitude: 1 },
            { frequency: 3.01, damping: 0.005, phase: 1.57, amplitude: 1 }
        ],
        yterms: [
            { frequency: 1, damping: 0.001, phase: 0, amplitude: 1 },
            { frequency: 2, damping: 0.001, phase: 1.57, amplitude: 1 }
        ],
    },
    B: {
        mode: 0,
        step: 0.007,
        xterms: [
            { frequency: 0.00579, damping: 0.000001, phase: 0.31, amplitude: 1 },
            { frequency: 3.001, damping: 0.001, phase: 0, amplitude: 1 }
        ],
        yterms: [
            { frequency: .004, damping: 0.0001, phase: 1.97, amplitude: 1 },
            { frequency: 2, damping: 0.0001, phase: 1.57, amplitude: 1 }
        ],
    },
    C: {
        mode: 0,
        step: 0.002,
        xterms: [
            { frequency: 2.005, damping: 0.002, phase: 0.1, amplitude: 1 },
            { frequency: 3.003, damping: 0.001, phase: 0.6, amplitude: 1 }
        ],
        yterms: [
            { frequency: 2.005, damping: 0.002, phase: 1.97, amplitude: 1 },
            { frequency: 4.003, damping: 0.001, phase: 1.17, amplitude: 1 }
        ],
    },
    D: {
        mode: 0,
        step: 0.003,
        xterms: [
            { frequency: 1.23, damping: 0.006, phase: 0.123, amplitude: 1 },
            { frequency: 4.32, damping: 0.021, phase: 3.210, amplitude: 1 }
        ],
        yterms: [
            { frequency: 2.01, damping: 0.002, phase: 1.57, amplitude: 1 },
            { frequency: 2.14, damping: 0.01, phase: 1.66, amplitude: 1 }
        ],
    },
    E: {
        mode: 0,
        step: 0.007,
        xterms: [
            { frequency: 3.001, damping: 0.018, phase: 0.4, amplitude: 1 },
            { frequency: 28.007, damping: 0.41, phase: 0.2, amplitude: 1 }
        ],
        yterms: [
            { frequency: 875, damping: 0.175, phase: 1.67, amplitude: 1 },
            { frequency: 2.005, damping: 0.001, phase: 1.47, amplitude: 1 }
        ],
    },
    F: {
        mode: 0,
        step: 0.001,
        xterms: [
            { frequency: 177, damping: 0.123, phase: 0.7, amplitude: 1 },
            { frequency: 3.007, damping: 0.0002, phase: 0.12, amplitude: 1 }
        ],
        yterms: [
            { frequency: 2.005, damping: 0.001, phase: 1.57, amplitude: 1 },
            { frequency: 17, damping: 0.0234, phase: 1.57, amplitude: 1 }
        ],
    },
    G: {
        mode: 0,
        step: 0.0008,
        xterms: [
            { frequency: 2.005, damping: 0.0001, phase: 0, amplitude: 1 },
            { frequency: 4.003, damping: 0.0001, phase: 0.21, amplitude: 1 },
            { frequency: 27.001, damping: 0.007, phase: 0.43, amplitude: 1 }
        ],
        yterms: [
            { frequency: 4.001, damping: 0.005, phase: 1.87, amplitude: 1 },
            { frequency: 2.011, damping: 0.0001, phase: 1.67, amplitude: 1 },
            { frequency: 3.003, damping: 0.0005, phase: 1.47, amplitude: 1 },
            { frequency: 31.003, damping: 0.05, phase: 1.27, amplitude: 1 }
        ],
    }
};

function changeColor() {
    if(_ctx) {
        _newcolor = rotColor();
    }
};

exports.draw = draw;
exports.drawMore = drawMore;
exports.clear = clear;
exports.loadDefault = loadDefault;
exports.defaults = defaults;
exports.changeColor = changeColor;