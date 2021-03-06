var _ = require('underscore');

/*
 * basic pendulum motion:
 * x(t) = Asin(tf + p)e^-dt
 *
 * superposed 2-axis 2-pendulum motion:
 * x(t) =a1sin(tf1 + p1)e^-d1t + a2sin(tf2 + p2)e^-d2t
 * y(t) =a3sin(tf3 + p3)e^-d3t + a4sin(tf4 + p4)e^-d4t
 *
 * In a real physical harmonograph:
 *   the frequencies will be almost equal, since the strings are the same length
 *     but, the slight differences really matter to the image!
 *   the second X term would be the rotational procession term
 *   there would be no second y term
 *   the period is an infinite series:
 *      T = 2*pi*sqrt( (L/g) * (1 + 1o^2/16 + 11o^4/3072 + 173o^6/737280 + 22931o^8/1321205760) )
 *   where o is the deflection angle in radians
 *   and 1rad = 180/pi degrees, pi/180 rads = 1d
 *   and L is the distance between the pivot and the center of oscillation 
 *
 * Example:
 * Gravity  ~= 9.81m/s^2
 * Ceiling  ~= 3m
 * Table    ~= 2m x 1.5m
 * Range(L) ~= [3.0, 3.9], L/g = [.30581, .39755]
 *        f ~= [0.250251, 0.285329]
 * w = angular frequency ( = 2pi*f where f = frequency)
 * p = phase (0 < p < 2pi)
 * a = amplitude
 * d = damping 
 * t = time
 *
 * lissajous figures:
 * damping = 0, figure overwrites, no second term
 *
 * spirographs look like:
 * x = (1-k)sin(t + pi/2) + lksin(pi/2 + (t*(1-k))/k) 
 * y = (1-k)sin(t) + lksin((t*(1-k))/k) 
 * 0 < l < 1, relative outer radius
 * 0 < k < 1, ratio of inner to outer 
 *
 * translated to the harmonoform, we get:
 * damping = 0;
 * a1 = a3 = k
 * a2 = a4 = l*a1
 * f1 = 1, p1 = pi/2
 * f2 = (1-k)/k, p2 = pi/2
 * f3 = 1, p3 = 0
 * f4 = (1-k)/k, p4 = 0
 */


var DEF_AMPLITUDE = 1;
var DEF_DAMPING = 0;
var DEF_STEP = 0.01;
var DEF_MAX_ITERS = 1000 * 1000;
var HARM = 0;
var LISA = 1;
var SPIR = 2;
var HALFPI = Math.PI/2;

var DEF_CONFIG = {
    mode: HARM,
    step: 0.01,
    xterms: [
        { frequency: 3.001, damping: 0.0004, phase: 0, amplitude: 10 },
        { frequency: 2, damping: 0.0065, phase: 0, amplitude: 10 }
    ],
    yterms: [ 
        { frequency: 3, damping: 0.0008, phase: HALFPI, amplitude: 10 },
        { frequency: 2, damping: 0.019, phase: 3*HALFPI, amplitude: 10 }
    ]
};

function positioner(terms) {
    var fns = _.map(terms, function(term) {
        var amp = Number(term.amplitude || DEF_AMPLITUDE);
        var damp = Number(term.damping || DEF_DAMPING);
        var freq = Number(term.frequency);
        var phase = Number(term.phase);

        var fn = function(t) {
            var v = Math.pow(Math.E,-1*t*damp)*amp*Math.sin(t*freq + phase);
//            if(!Number(v)) {
//                console.log([amp,damp,freq,phase,v]);
//            }
            return v;
        };
        return fn;
    });

    return function(t) {
        return _.reduce(fns, function(memo, fn) {
            return memo + fn(t);
        }, 0);
    };
};

function maxAmplitude(terms) {
    return _.reduce(terms, function(memo, term){
        var amp = term.amplitude || DEF_AMPLITUDE;
        return Number(memo) + Number(amp);
    }, 0.0);
};

var Harmonograph = function(cfg) {
    this.time = 0;
    this.mode = HARM;
    this.count = 0;
    this.lastpos = [0,0];
    this.curpos = [0,0];
    this.step = DEF_STEP;
    this.maxCount = DEF_MAX_ITERS;
    _.extend(this, cfg ? cfg  : DEF_CONFIG);
    this.maxX = maxAmplitude(this.xterms);
    this.maxY = maxAmplitude(this.yterms);
    this.posX = positioner(this.xterms);
    this.posY = positioner(this.yterms);
    this.wantStop = false;
//    console.log(this);
};

Harmonograph.prototype.stop = function() {
    this.wantStop = true;
};

Harmonograph.prototype.restart = function(cb) {
    this.wantStop = false;
    this.run(cb);
};

Harmonograph.prototype.run = function(cb,count) {
    var cnt = count ? count : this.maxCount + 1;
    var i = -1;
    while(!this.isDone()) {
        cb(null,this.increment());
        if(++i === cnt) {
            cb(null, null);
            return;
        }            
    }
    cb("done");
};

Harmonograph.prototype.increment = function(tstep) {
    var t = this.count++;
    var x = this.posX(t*this.step);
    var y = this.posY(t*this.step);
    this.lastpos = this.curpos;
    this.curpos = [x,y];
    return this.curpos;
};


Harmonograph.prototype.isDone = function() {
    var done = false;

    if(this.wantStop) {
        done = true;
        console.log("Stopped");
    }

    if(this.count > this.maxCount) {
        done = true;
    }
    return done;
};

exports.Harmonograph = Harmonograph;
exports.HARM = HARM;
