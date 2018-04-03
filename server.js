console.log("Ignition...");
var http = require('http');
var app = require('connect')();
var serveStatic = require('serve-static');
var port = 8000;

app.use(serveStatic(__dirname));

var server = http.createServer(app);
server.listen(port, function(e) {
    if(e) 
        console.log(e);
    else
        console.log("GAMEON! at http://localhost:" + port);
});

